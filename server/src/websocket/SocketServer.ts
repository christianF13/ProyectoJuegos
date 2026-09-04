import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { gameManager } from '../core/engine/GameManager';
import { gameRegistry } from '../core/registry/GameRegistry';
import { PrivacyGuard } from '../core/privacy/PrivacyGuard';
import { gameMasterAI } from '../ai/GameMasterAI';
import { eventBus } from '../core/engine/EventBus';
import { GameEventType } from '../core/types/event.types';

export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  setupGlobalEventBroadcasting(io);

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Conectado: ${socket.id}`);

    // ── Game Master screen ──────────────────────────────────────────
    socket.on('gm:join', ({ gameId }: { gameId?: string }) => {
      socket.join('gm');
      if (gameId) {
        socket.join(`game:${gameId}`);
        try {
          const state = gameManager.getState(gameId);
          if (state) {
             socket.emit('game:updated', PrivacyGuard.getPublicState(state));
          }
        } catch(e) {}
      }
      socket.emit('gm:joined', { message: 'Conectado como Game Master' });
      console.log('🎮 Game Master conectado');
    });

    // ── Player joining ──────────────────────────────────────────────
    socket.on('player:join', async ({ gameCode, playerName }: { gameCode: string; playerName: string }) => {
      try {
        const state = gameManager.getStateByCode(gameCode);
        if (!state) throw new Error(`Código de sala inválido: ${gameCode}`);

        // If player name already exists (reconnecting), find them
        let player = state.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
        if (!player) {
          if (state.status !== 'lobby') throw new Error('La partida ya está en curso. No puedes unirte ahora.');
          player = await gameManager.addPlayer(state.id, playerName);
        } else {
          player.isConnected = true;
        }

        socket.join(`game:${state.id}`);
        socket.join(`player:${player.id}`);
        socket.data.playerId = player.id;
        socket.data.gameId = state.id;

        const playerView = PrivacyGuard.getPlayerState(state, player.id);
        socket.emit('player:joined', {
          player: playerView?.myPlayer,
          gameState: playerView,
        });

        // Broadcast updated public state to everyone in game room
        io.to(`game:${state.id}`).emit('game:updated', PrivacyGuard.getPublicState(state));
        console.log(`👤 ${playerName} unido a partida ${state.code}`);
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── GM sends voice/text message ─────────────────────────────────
    socket.on('gm:chat', async ({ message, gameId }: { message: string; gameId?: string }) => {
      try {
        console.log(`🗣 GM chat: "${message.substring(0, 60)}..."`);
        const response = await gameMasterAI.chat(message, gameId);
        io.to('gm').emit('gm:response', { text: response });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── Start game ──────────────────────────────────────────────────
    socket.on('gm:start_game', async ({ gameId }: { gameId: string }) => {
      try {
        await gameManager.startGame(gameId);
        const state = gameManager.getState(gameId);

        // Send each player their private role
        for (const p of state.players) {
          const pv = PrivacyGuard.getPlayerState(state, p.id);
          io.to(`player:${p.id}`).emit('player:role_revealed', pv?.myPlayer);
        }

        io.to(`game:${gameId}`).emit('game:updated', PrivacyGuard.getPublicState(state));
      } catch (err: any) {
        socket.emit('error', { message: err.message });
        console.error('start_game error:', err);
      }
    });

    // ── Start First Night ───────────────────────────────────────────
    socket.on('gm:start_night', async ({ gameId }: { gameId: string }) => {
      try {
        await gameManager.startPhase(gameId, 'night_start');
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── Add bots (Modo Prueba) ──────────────────────────────────────
    socket.on('gm:add_bots', async ({ gameId }: { gameId: string }) => {
      try {
        const state = gameManager.getState(gameId);
        // Need at least 7 to get 1 wolf + seer + witch + healer + 3 villagers
        const target = Math.max(8, state.players.length);
        const needed = target - state.players.length;
        for (let i = 0; i < needed; i++) {
          const botNum = state.players.filter(p => p.name.startsWith('Bot')).length + 1;
          await gameManager.addPlayer(gameId, `Bot ${botNum}`);
        }
        const updatedState = gameManager.getState(gameId);
        io.to(`game:${gameId}`).emit('game:updated', PrivacyGuard.getPublicState(updatedState));
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── Player submits action ───────────────────────────────────────
    socket.on('player:action', async ({ actionId, targetId }: { actionId: string; targetId: string | null }) => {
      try {
        const { playerId, gameId } = socket.data;
        if (!playerId || !gameId) throw new Error('Sesión inválida');
        const state = gameManager.getState(gameId);
        await gameManager.submitAction(gameId, { playerId, actionId, targetId, gameId, phase: state.phase });
        socket.emit('player:action_confirmed', { actionId });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── Player casts vote ───────────────────────────────────────────
    socket.on('player:vote', async ({ targetId }: { targetId: string }) => {
      try {
        const { playerId, gameId } = socket.data;
        if (!playerId || !gameId) throw new Error('Sesión inválida');
        await gameManager.submitVote(gameId, playerId, targetId);
        socket.emit('player:vote_confirmed', { targetId });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── Player previews a target (Wolves coordinating) ──────────────
    socket.on('player:target_preview', async ({ targetId }: { targetId: string }) => {
      try {
        const { playerId, gameId } = socket.data;
        if (!playerId || !gameId) return;

        const state = gameManager.getState(gameId);
        const player = state.players.find(p => p.id === playerId);
        
        // Solo los lobos pueden coordinar
        if (player && player.roleId === 'werewolf' && state.phase === 'night_werewolves') {
          // Encontrar otros lobos
          const otherWolves = state.players.filter(p => p.roleId === 'werewolf' && p.id !== playerId && p.isAlive);
          // Emitir a todos los otros lobos
          for (const wolf of otherWolves) {
            io.to(`player:${wolf.id}`).emit('player:wolf_preview', {
              wolfName: player.name,
              targetId
            });
          }
        }
        
        // Todos pueden coordinar su voto de día
        if (player && state.phase === 'day_vote') {
          const others = state.players.filter(p => p.id !== playerId && p.isAlive);
          for (const p of others) {
            io.to(`player:${p.id}`).emit('player:wolf_preview', { // Reusar el mismo evento del front
              wolfName: player.name,
              targetId
            });
          }
        }
      } catch (err) {
        console.error('player:target_preview error:', err);
      }
    });

    // ── Player is ready (Acknowledged role) ─────────────────────────
    socket.on('player:ready', async () => {
      try {
        const { playerId, gameId } = socket.data;
        if (!playerId || !gameId) return;
        
        const state = gameManager.getState(gameId);
        const player = state.players.find(p => p.id === playerId);
        if (player) {
          player.isReady = true;
          io.to(`game:${gameId}`).emit('game:updated', PrivacyGuard.getPublicState(state));

          // Verificar si todos los humanos están listos
          const allHumansReady = state.players
            .filter(p => !p.id.startsWith('Bot'))
            .every(p => p.isReady);
            
          if (allHumansReady && state.phase === 'lobby') { // wait, phase might be undefined or 'lobby'
            // Auto start night if everyone is ready and we haven't started yet
            // Wait, when game starts, state.status becomes 'active' and phase is empty or some initial value
            // Actually startGame sets phase to undefined initially?
            // Let's just rely on the GM to start it, OR auto-start if we want. 
            // The user said: "debe no pasar hasta que todos coloquen entendido ahi si sigue el flujo"
            // Let's just auto-start the night!
            if (!state.phase || state.phase === 'lobby') {
              setTimeout(() => gameManager.startPhase(gameId, 'night_start').catch(console.error), 1000);
            }
          }
        }
      } catch (err: any) {
        console.error('player:ready error:', err);
      }
    });

    socket.on('disconnect', () => {
      const { playerId, gameId } = socket.data;
      if (playerId && gameId) {
        try {
          const state = gameManager.getState(gameId);
          const p = state.players.find(pl => pl.id === playerId);
          if (p) {
            p.isConnected = false;
            io.to(`game:${gameId}`).emit('game:updated', PrivacyGuard.getPublicState(state));
          }
        } catch { /* game may not exist */ }
      }
      console.log(`🔌 Desconectado: ${socket.id}`);
    });
  });

  return io;
}

function setupGlobalEventBroadcasting(io: SocketIOServer): void {
  // Phase started
  eventBus.on(GameEventType.PHASE_STARTED, async (event) => {
    const state = gameManager.getState(event.gameId);
    const phaseDef = event.data.phaseDef as any;

    let narrationStart = phaseDef?.narrationTemplate?.start;

    // Check if we have recent eliminations to announce if the template expects {victimName}
    if (narrationStart?.includes('{victimName}')) {
      const recentKills = state.history[state.history.length - 1]?.eliminations || [];
      if (recentKills.length > 0) {
        const names = recentKills.map(id => state.players.find(p => p.id === id)?.name ?? 'Alguien').join(', ');
        narrationStart = narrationStart.replace('[SI HUBO MUERTES: {victimName} no sobrevivió a la noche]', `${names} no sobrevivió a la noche`);
      } else {
        narrationStart = narrationStart.replace('[SI HUBO MUERTES: {victimName} no sobrevivió a la noche]', 'Nadie murió esta noche');
      }
    }

    io.to(`game:${event.gameId}`).emit('game:phase_started', {
      phase: event.data.phase,
      announcement: narrationStart,
    });
    io.to(`game:${event.gameId}`).emit('game:updated', PrivacyGuard.getPublicState(state));

    // El Flow Engine manda el texto directamente a la capa de voz (bypass del LLM para evitar límite de cuota)
    if (narrationStart) {
      io.to('gm').emit('gm:response', { text: narrationStart });
    }

    // Send available actions to each alive player
    const definition = gameRegistry.getGame(state.gameDefinitionId);
    if (!definition) return;

    for (const player of state.players.filter(p => p.isAlive)) {
      const availableActions = definition.actions.filter(
        a => a.roleId === player.roleId && a.phase === (event.data.phase as string)
      );

      if (availableActions.length > 0) {
        const isHealer = player.roleId === 'healer';
        const lastHealedId = player.privateInfo?.lastHealedId as string | undefined;

        const targets = state.players
          .filter(p => {
            if (!p.isAlive) return false;
            if (isHealer && p.id === player.id) return false; // healer can't self-heal
            if (isHealer && lastHealedId && p.id === lastHealedId) return false; // healer can't repeat
            return true;
          })
          .map(p => ({ id: p.id, name: p.name }));

        io.to(`player:${player.id}`).emit('player:actions_available', {
          actions: availableActions,
          targets,
          privateInfo: player.privateInfo,
        });
      } else {
        io.to(`player:${player.id}`).emit('player:waiting', { phase: event.data.phase });
      }
    }
  });

  // Player eliminated
  eventBus.on(GameEventType.PLAYER_ELIMINATED, async (event) => {
    io.to(`game:${event.gameId}`).emit('game:player_eliminated', {
      playerName: event.data.playerName,
      roleId: event.data.roleId,
    });

    gameMasterAI
      .narrateEvent({ type: 'player_eliminated', name: event.data.playerName, role: event.data.roleId }, event.gameId)
      .then(text => io.to('gm').emit('gm:response', { text }))
      .catch(console.error);
  });

  // Timer tick
  eventBus.on(GameEventType.TIMER_TICK, (event) => {
    io.to(`game:${event.gameId}`).emit('game:timer', event.data);
  });

  // Phase ended announcements
  eventBus.on(GameEventType.PHASE_ENDED, (event) => {
    const result = event.data.result as any;
    if (result?.announcements?.length > 0) {
      io.to(`game:${event.gameId}`).emit('game:announcement', { messages: result.announcements });
    }
  });

  // After night — send seer private result
  eventBus.on(GameEventType.ACTIONS_PROCESSED, (event) => {
    // Si la fase tiene un texto de cierre, narrarlo:
    const state = gameManager.getState(event.gameId);
    const definition = gameRegistry.getGame(state.gameDefinitionId);
    const phaseDef = definition?.phases.find(p => p.id === event.data.phase) as any;
    
    if (phaseDef?.narrationTemplate?.end) {
      io.to('gm').emit('gm:response', { text: phaseDef.narrationTemplate.end });
    }

    if (event.data.phase === 'night_seer') {
      try {
        const seer = state.players.find(p => p.roleId === 'seer' && p.isAlive);
        if (seer?.privateInfo?.seerResult) {
          const r = seer.privateInfo.seerResult as any;
          io.to(`player:${seer.id}`).emit('player:private_info', {
            type: 'seer_result',
            message: `${r.targetName} ${r.isWerewolf ? 'ES 🐺 HOMBRE LOBO' : 'NO es lobo ✅'}`,
          });
        }
      } catch (err) {
        console.error('Seer result error:', err);
      }
    }
  });

  // Vote cast — notify all (not who voted for whom)
  eventBus.on(GameEventType.VOTE_CAST, (event) => {
    io.to(`game:${event.gameId}`).emit('game:vote_counted', { message: 'Un voto ha sido registrado' });
  });

  // Game ended
  eventBus.on(GameEventType.GAME_ENDED, async (event) => {
    const state = gameManager.getState(event.gameId);
    // Include full player reveal (names + roles) so clients can show final screen
    const playerReveal = state.players.map(p => ({
      id: p.id,
      name: p.name,
      roleId: p.roleId,
      faction: p.faction,
      isAlive: p.isAlive,
    }));
    io.to(`game:${event.gameId}`).emit('game:ended', { ...event.data, playerReveal });
    io.to(`game:${event.gameId}`).emit('game:updated', PrivacyGuard.getPublicState(state));

    gameMasterAI
      .narrateEvent({ type: 'game_ended', winner: event.data.description, faction: event.data.winnerFaction }, event.gameId)
      .then(text => io.to('gm').emit('gm:response', { text }))
      .catch(console.error);
  });
}
