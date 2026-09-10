import { v4 as uuidv4 } from 'uuid';
// nanoid v3 CommonJS compatible
const { customAlphabet } = require('nanoid');
import {
  GameState, PlayerState, PendingAction, PhaseResult, GameDefinition,
} from '../types/game.types';
import { ActionRequest } from '../types/action.types';
import { gameRegistry } from '../registry/GameRegistry';
import { eventBus } from './EventBus';
import { GameEventType } from '../types/event.types';
import { ActionValidator } from './ActionValidator';
import { VotingSystem } from './VotingSystem';
import { timerService } from './TimerService';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

class GameManager {
  private games: Map<string, GameState> = new Map();

  // ── Persistence helpers (imported lazily to avoid circular deps) ──
  private async persist(state: GameState): Promise<void> {
    try {
      const { gameRepository } = require('../../db/repositories/game.repository');
      await gameRepository.saveGame(state);
    } catch { /* DB not critical for in-memory operation */ }
  }

  // ── Create / Join ─────────────────────────────────────────────────
  async createGame(gameDefinitionId: string): Promise<GameState> {
    const definition = gameRegistry.getGame(gameDefinitionId);
    if (!definition) throw new Error(`Juego '${gameDefinitionId}' no encontrado`);

    const state: GameState = {
      id: uuidv4(),
      gameDefinitionId,
      code: nanoid(),
      phase: 'lobby',
      round: 0,
      players: [],
      pendingActions: [],
      votes: [],
      status: 'lobby',
      winner: null,
      winnerFaction: null,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.games.set(state.id, state);
    await this.persist(state);
    await eventBus.emit({
      type: GameEventType.GAME_CREATED,
      gameId: state.id,
      timestamp: new Date(),
      data: { code: state.code, gameDefinitionId },
    });
    return state;
  }

  async addPlayer(gameId: string, name: string): Promise<PlayerState> {
    const state = this.getState(gameId);
    const definition = gameRegistry.getGame(state.gameDefinitionId)!;

    if (state.status !== 'lobby') throw new Error('La partida ya ha comenzado');
    if (state.players.length >= definition.maxPlayers) throw new Error('La partida está llena');
    if (state.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Ya existe un jugador con ese nombre');
    }

    const player: PlayerState = {
      id: uuidv4(),
      name,
      gameId,
      roleId: null,
      faction: null,
      isAlive: true,
      isConnected: true,
      hasActed: false,
      privateInfo: {},
    };

    state.players.push(player);
    state.updatedAt = new Date();
    await this.persist(state);
    await eventBus.emit({
      type: GameEventType.PLAYER_JOINED,
      gameId,
      timestamp: new Date(),
      data: { player: { id: player.id, name: player.name } },
    });
    return player;
  }

  // ── Game Lifecycle ─────────────────────────────────────────────────
  async startGame(gameId: string): Promise<void> {
    const state = this.getState(gameId);
    const definition = gameRegistry.getGame(state.gameDefinitionId)!;

    if (state.players.length < definition.minPlayers) {
      throw new Error(`Se necesitan al menos ${definition.minPlayers} jugadores. Hay ${state.players.length}.`);
    }

    const playerIds = state.players.map(p => p.id);
    const roleAssignments = definition.assignRoles(playerIds, definition);

    for (const player of state.players) {
      const roleId = roleAssignments.get(player.id)!;
      const roleDef = definition.roles.find(r => r.id === roleId)!;
      player.roleId = roleId;
      player.faction = roleDef.faction;
      player.privateInfo = { instructions: roleDef.privateInstructions };
    }

    state.status = 'active';
    state.round = 1;
    state.updatedAt = new Date();
    await this.persist(state);

    await eventBus.emit({ type: GameEventType.ROLES_ASSIGNED, gameId, timestamp: new Date(), data: {} });
    await eventBus.emit({ type: GameEventType.GAME_STARTED, gameId, timestamp: new Date(), data: {} });
  }

  async startPhase(gameId: string, phaseId: string): Promise<void> {
    const state = this.getState(gameId);
    const definition = gameRegistry.getGame(state.gameDefinitionId)!;
    const phaseDef = definition.phases.find(p => p.id === phaseId);
    if (!phaseDef) throw new Error(`Fase '${phaseId}' no encontrada`);

    // Comprobar si la fase se debe saltar (ej. la bruja está muerta)
    if (phaseDef.type === 'action') {
      const canAct = phaseDef.allowedActions.some(actionId => {
        const actionDef = definition.actions.find(a => a.id === actionId);
        return actionDef && state.players.some(p => p.roleId === actionDef.roleId && p.isAlive);
      });
      if (!canAct) {
        console.log(`[FLOW ENGINE] Saltando fase ${phaseId}: No hay jugadores vivos requeridos.`);
        const next = phaseDef.nextPhase;
        if (next) {
          // Pequeña pausa para no bloquear la pila
          setTimeout(() => this.startPhase(gameId, next).catch(console.error), 100);
        } else {
           await this.endPhase(gameId);
        }
        return; // Detener inicio de esta fase
      }
    }

    state.phase = phaseId;
    state.updatedAt = new Date();
    for (const p of state.players) p.hasActed = false;

    await this.persist(state);
    
    // Emitir el evento para que la IA y los clientes reaccionen
    await eventBus.emit({
      type: GameEventType.PHASE_STARTED,
      gameId,
      timestamp: new Date(),
      data: { phase: phaseId, phaseDef },
    });

    // Auto-completar fases narrativas después de 12 segundos para dar tiempo al LLM de hablar
    if (phaseDef.type === 'narrative') {
      setTimeout(() => this.endPhase(gameId).catch(console.error), 12000);
      return; // Las fases puramente narrativas no necesitan timer de acciones ni bots
    }

    const timerDuration = phaseDef.timerKey ? definition.timers[phaseDef.timerKey] : null;
    if (timerDuration) {
      timerService.start(gameId, phaseId, timerDuration, async () => {
        try { await this.endPhase(gameId); } catch (e) { console.error('Timer endPhase error:', e); }
      });
    }

    // Auto-jugar para los bots después de 5 segundos
    setTimeout(() => {
      this.playBotTurn(gameId).catch(console.error);
    }, 5000);
  }

  // ── Actions & Votes ────────────────────────────────────────────────
  async submitAction(gameId: string, request: ActionRequest): Promise<void> {
    const state = this.getState(gameId);
    const definition = gameRegistry.getGame(state.gameDefinitionId)!;

    const validation = ActionValidator.validate(request, state, definition);
    if (!validation.valid) throw new Error(validation.error);

    state.pendingActions.push({
      playerId: request.playerId,
      actionId: request.actionId,
      targetId: request.targetId,
      phase: request.phase,
      timestamp: new Date(),
    });

    const player = state.players.find(p => p.id === request.playerId)!;
    player.hasActed = true;
    state.updatedAt = new Date();
    await this.persist(state);

    await eventBus.emit({
      type: GameEventType.PLAYER_ACTION,
      gameId,
      timestamp: new Date(),
      data: { playerId: request.playerId, actionId: request.actionId, targetId: request.targetId },
    });

    await this.checkAllActed(gameId);
  }

  async submitVote(gameId: string, voterId: string, targetId: string): Promise<void> {
    const state = this.getState(gameId);
    if (state.phase !== 'day_vote') throw new Error('La votación no está activa');

    const voter = state.players.find(p => p.id === voterId);
    if (!voter?.isAlive) throw new Error('No puedes votar');
    const target = state.players.find(p => p.id === targetId);
    if (!target?.isAlive) throw new Error('Objetivo inválido');

    // Replace existing vote
    state.votes = state.votes.filter(
      v => !(v.voterId === voterId && v.phase === state.phase && v.round === state.round)
    );
    state.votes.push({ voterId, targetId, phase: state.phase, round: state.round, timestamp: new Date() });
    state.updatedAt = new Date();
    await this.persist(state);

    await eventBus.emit({
      type: GameEventType.VOTE_CAST,
      gameId,
      timestamp: new Date(),
      data: { voterId, targetId },
    });

    if (VotingSystem.hasEveryoneVoted(state)) {
      await this.endPhase(gameId);
    }
  }

  // ── Phase End & Processing ─────────────────────────────────────────
  async endPhase(gameId: string): Promise<void> {
    const state = this.getState(gameId);
    const definition = gameRegistry.getGame(state.gameDefinitionId)!;
    timerService.stop(gameId, state.phase);

    let result: PhaseResult = { eliminations: [], announcements: [], nextPhase: 'night' };
    if (definition.processPhaseEnd) {
      result = definition.processPhaseEnd(state, state.phase);
    }

    // Apply eliminations
    for (const playerId of result.eliminations) {
      const p = state.players.find(pl => pl.id === playerId);
      if (p && p.isAlive) {
        p.isAlive = false;
        await eventBus.emit({
          type: GameEventType.PLAYER_ELIMINATED,
          gameId,
          timestamp: new Date(),
          data: { playerId, playerName: p.name, roleId: p.roleId },
        });
      }
    }

    state.history.push({
      phase: state.phase,
      round: state.round,
      eliminations: result.eliminations,
      actions: state.pendingActions.filter(a => a.phase === state.phase),
      timestamp: new Date(),
    });

    await eventBus.emit({
      type: GameEventType.PHASE_ENDED,
      gameId,
      timestamp: new Date(),
      data: { phase: state.phase, result },
    });

    // Check victory
    const victory = definition.victoryConditions.find(vc => vc.check(state));
    if (victory) {
      await this.endGame(gameId, victory.winnerFaction, victory.description);
      return;
    }

    // Advance to next phase
    if (result.nextPhase === 'night' || result.nextPhase === 'night_start') state.round++;
    state.updatedAt = new Date();
    await this.persist(state);
    await this.startPhase(gameId, result.nextPhase);
  }

  async endGame(gameId: string, winnerFaction: string, description: string): Promise<void> {
    const state = this.getState(gameId);
    state.status = 'finished';
    state.winnerFaction = winnerFaction;
    state.winner = description;
    state.updatedAt = new Date();
    timerService.stopAll(gameId);
    await this.persist(state);
    await eventBus.emit({
      type: GameEventType.GAME_ENDED,
      gameId,
      timestamp: new Date(),
      data: { winnerFaction, description },
    });
  }

  // ── Bot Simulator ──────────────────────────────────────────────────
  private async playBotTurn(gameId: string): Promise<void> {
    try {
      const state = this.getState(gameId);
      const definition = gameRegistry.getGame(state.gameDefinitionId)!;
      const phaseDef = definition.phases.find(p => p.id === state.phase);
      if (!phaseDef) return;

      const bots = state.players.filter(p => p.name.startsWith('Bot') && p.isAlive && !p.hasActed);
      if (bots.length === 0) return;

      for (const bot of bots) {
        if (state.phase === 'day_vote') {
          let targets = state.players.filter(p => p.isAlive && p.id !== bot.id);
          let target: PlayerState | undefined;

          // Existing votes in this round
          const existingVotes = state.votes.filter(v => v.phase === 'day_vote' && v.round === state.round);

          if (bot.faction === 'wolves') {
            // Wolves coordinate: check if another wolf already voted
            const otherWolfVote = existingVotes.find(v => {
              const voter = state.players.find(p => p.id === v.voterId);
              return voter?.faction === 'wolves' && v.targetId !== bot.id;
            });

            if (otherWolfVote) {
              target = targets.find(p => p.id === otherWolfVote.targetId);
            }

            if (!target) {
              const nonWolves = targets.filter(p => p.faction !== 'wolves');
              if (nonWolves.length > 0) {
                target = nonWolves[Math.floor(Math.random() * nonWolves.length)];
              }
            }
          } else {
            // Innocent bots: 70% chance to follow someone who already has votes (bandwagon/consensus)
            const targetsWithVotes = targets.filter(t => existingVotes.some(v => v.targetId === t.id));
            if (targetsWithVotes.length > 0 && Math.random() < 0.70) {
              target = targetsWithVotes[Math.floor(Math.random() * targetsWithVotes.length)];
            } else if (targets.length > 0) {
              target = targets[Math.floor(Math.random() * targets.length)];
            }
          }

          if (target) {
            // Broadcast bot's vote intention to all alive human players
            await eventBus.emit({
              type: GameEventType.VOTE_CAST, // reuse to trigger preview broadcast
              gameId,
              timestamp: new Date(),
              data: { voterId: bot.id, targetId: target.id, voterName: bot.name, isPreview: true },
            });
            await this.submitVote(gameId, bot.id, target.id).catch(() => {});
          }
        } else {
          const availableActions = definition.actions.filter(
            a => a.roleId === bot.roleId && a.phase === state.phase
          );
          for (const action of availableActions) {
            if (action.oneTimeUse) {
              if (action.id === 'witch_save' && bot.privateInfo?.lifePotion === 'used') continue;
              if (action.id === 'witch_kill' && bot.privateInfo?.deathPotion === 'used') continue;
            }

            let targetId: string | null = null;
            if (action.targetType === 'player') {
              let targets = state.players.filter(p => p.isAlive && p.id !== bot.id);
              // Wolves target non-wolves
              if (action.id === 'wolf_kill') {
                const nonWolves = targets.filter(p => p.faction !== 'wolves');
                if (nonWolves.length > 0) targets = nonWolves;
              }
              // Healer avoids self and last target
              if (action.id === 'healer_protect') {
                const lastHealedId = bot.privateInfo?.lastHealedId as string | undefined;
                targets = targets.filter(p => p.id !== bot.id && p.id !== lastHealedId);
              }
              // Witch save — only if there's a victim (handled in processNightEnd)
              if (action.id === 'witch_save') {
                // Bot witch randomly decides to save (70% chance)
                if (Math.random() < 0.7 && targets.length > 0) {
                  targetId = targets[0].id; // doesn't matter, processNightEnd will handle
                } else {
                  continue;
                }
              } else if (targets.length > 0) {
                targetId = targets[Math.floor(Math.random() * targets.length)].id;
              }
            }
            await this.submitAction(gameId, {
              playerId: bot.id,
              actionId: action.id,
              targetId,
              phase: state.phase,
              gameId
            }).catch(() => {});
            break;
          }
        }
      }
    } catch (e) {
      console.error('Bot turn error:', e);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────
  private async checkAllActed(gameId: string): Promise<void> {
    const state = this.getState(gameId);
    const definition = gameRegistry.getGame(state.gameDefinitionId)!;
    const phaseDef = definition.phases.find(p => p.id === state.phase);
    if (!phaseDef) return;

    const required = phaseDef.requiredActions.filter(ra => !ra.optional);
    if (required.length === 0) return;

    // Check each required actor (alive players with that role) has acted
    const allActed = required.every(ra => {
      const actors = state.players.filter(p => p.isAlive && p.roleId === ra.roleId);
      return actors.length === 0 || actors.every(p => p.hasActed);
    });

    if (allActed) {
      await eventBus.emit({
        type: GameEventType.ACTIONS_PROCESSED,
        gameId,
        timestamp: new Date(),
        data: { phase: state.phase },
      });
      // Small delay so action_confirmed WS event reaches clients first
      await new Promise(r => setTimeout(r, 1500));
      await this.endPhase(gameId);
    }
  }

  getState(gameId: string): GameState {
    const s = this.games.get(gameId);
    if (!s) throw new Error(`Partida '${gameId}' no encontrada`);
    return s;
  }

  getStateByCode(code: string): GameState | undefined {
    return Array.from(this.games.values()).find(g => g.code === code.toUpperCase());
  }

  getAllGames(): GameState[] {
    return Array.from(this.games.values());
  }
}

export const gameManager = new GameManager();
