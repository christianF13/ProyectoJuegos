import { GameDefinition, GameState, PhaseResult } from '../../core/types/game.types';
import { allRoles } from './roles';
import { allPhases } from './phases';
import { allActions } from './actions';
import { victoryConditions } from './victory-conditions';
import { VotingSystem } from '../../core/engine/VotingSystem';

// ── Role assignment logic (stays inside the game module) ──────────────
function assignRoles(playerIds: string[], definition: GameDefinition): Map<string, string> {
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  const assignments = new Map<string, string>();
  const count = playerIds.length;

  const wolfCount = count <= 6 ? 1 : count <= 9 ? 2 : 3;
  const hasSeer = count >= 5;
  const hasCurandero = count >= 6;
  const hasWitch = count >= 7;
  const hasCaperucita = count >= 8;

  let idx = 0;
  for (let i = 0; i < wolfCount && idx < shuffled.length; i++) {
    assignments.set(shuffled[idx++], 'werewolf');
  }
  if (hasSeer && idx < shuffled.length) assignments.set(shuffled[idx++], 'seer');
  if (hasCurandero && idx < shuffled.length) assignments.set(shuffled[idx++], 'healer');
  if (hasWitch && idx < shuffled.length) assignments.set(shuffled[idx++], 'witch');
  if (hasCaperucita && idx < shuffled.length) assignments.set(shuffled[idx++], 'caperucita');
  while (idx < shuffled.length) assignments.set(shuffled[idx++], 'villager');

  return assignments;
}

// ── Phase processing logic (stays inside the game module) ────────────
function processPhaseEnd(state: GameState, phase: string): PhaseResult {
  switch (phase) {
    case 'night_start': return { eliminations: [], announcements: [], nextPhase: 'night_werewolves' };
    case 'night_werewolves': return { eliminations: [], announcements: [], nextPhase: 'night_healer' };
    case 'night_healer': return { eliminations: [], announcements: [], nextPhase: 'night_seer' };
    case 'night_seer': return { eliminations: [], announcements: [], nextPhase: 'night_witch' };
    case 'night_witch': return { eliminations: [], announcements: [], nextPhase: 'night_resolution' };
    case 'night_resolution': return processNightEnd(state);
    case 'day_discussion': return { eliminations: [], announcements: [], nextPhase: 'day_vote' };
    case 'day_vote': return processDayVoteEnd(state);
    default: return { eliminations: [], announcements: [], nextPhase: 'night_start' };
  }
}

function processNightEnd(state: GameState): PhaseResult {
  const eliminations: string[] = [];
  const announcements: string[] = [];
  // Actions are recorded with their micro-phase, e.g. night_werewolves
  const nightActions = state.pendingActions.filter(a => a.phase.startsWith('night_'));

  const wolfKill = nightActions.find(a => a.actionId === 'wolf_kill');
  let victimId: string | null = wolfKill?.targetId ?? null;

  // Healer protect
  const healerProtect = nightActions.find(a => a.actionId === 'healer_protect');
  if (healerProtect?.targetId === victimId && victimId) {
    victimId = null; // Saved!
  }

  // Seer result — private info only
  const seerSee = nightActions.find(a => a.actionId === 'seer_see');
  if (seerSee?.targetId) {
    const seer = state.players.find(p => p.roleId === 'seer' && p.isAlive);
    const target = state.players.find(p => p.id === seerSee.targetId);
    if (seer && target) {
      seer.privateInfo = {
        ...seer.privateInfo,
        seerResult: { targetName: target.name, isWerewolf: target.faction === 'wolves' },
      };
    }
  }

  // Witch save
  const witchSave = nightActions.find(a => a.actionId === 'witch_save');
  if (witchSave && victimId) {
    const witch = state.players.find(p => p.roleId === 'witch' && p.isAlive);
    if (witch) {
      witch.privateInfo = { ...witch.privateInfo, lifePotion: 'used' };
      victimId = null; // saved!
      announcements.push('La Bruja ha intervenido esta noche...');
    }
  }

  // Witch kill
  const witchKill = nightActions.find(a => a.actionId === 'witch_kill');
  if (witchKill?.targetId) {
    const witch = state.players.find(p => p.roleId === 'witch' && p.isAlive);
    if (witch) {
      witch.privateInfo = { ...witch.privateInfo, deathPotion: 'used' };
      eliminations.push(witchKill.targetId);
    }
  }

  if (victimId) eliminations.push(victimId);

  if (eliminations.length === 0) {
    announcements.push('Esta noche no murió nadie. El pueblo puede respirar aliviado... por ahora.');
  } else {
    const names = eliminations
      .map(id => state.players.find(p => p.id === id)?.name ?? 'Alguien')
      .join(', ');
    announcements.push(`Esta noche fue eliminado: ${names}.`);
  }

  return { eliminations, announcements, nextPhase: 'day_discussion' };
}

function processDayVoteEnd(state: GameState): PhaseResult {
  const { winner, tally, isTie } = VotingSystem.tallyVotes(state.votes, 'day_vote', state.round);
  const eliminations: string[] = [];
  const announcements: string[] = [];

  if (isTie || !winner) {
    announcements.push('Empate en la votación. Nadie es eliminado hoy. El pueblo tendrá que deliberar más.');
  } else {
    eliminations.push(winner);
    const p = state.players.find(pl => pl.id === winner);
    const role = allRoles.find(r => r.id === p?.roleId);
    announcements.push(`Por votación popular, ${p?.name ?? 'un jugador'} ha sido eliminado. Era ${role?.name ?? 'desconocido'}.`);
  }

  return { eliminations, announcements, nextPhase: 'night_start' };
}

// ── Game Definition export ────────────────────────────────────────────
const werewolfDefinition: GameDefinition = {
  id: 'werewolf',
  name: 'Hombre Lobo',
  description: 'El clásico juego de deducción social. Aldeanos vs Hombres Lobo. ¿Podrás descubrir quién se esconde entre vosotros?',
  minPlayers: 4,
  maxPlayers: 20,
  roles: allRoles,
  phases: allPhases,
  actions: allActions,
  timers: {
    night: 90,           // 1.5 minutos
    day_discussion: 60,  // 1 minuto
    day_vote: 60,        // 1 minuto
  },
  victoryConditions,
  messages: {
    phaseAnnouncements: {
      night: 'El pueblo se duerme. La oscuridad cae...',
      day_discussion: 'Amanece. El pueblo despierta.',
      day_vote: 'Hora de votar.',
    },
    roleReveal: {
      werewolf: 'Eres un Hombre Lobo. Elimina a los aldeanos.',
      villager: 'Eres un Aldeano. Descubre a los lobos.',
      seer: 'Eres la Vidente. Investiga en la noche.',
      witch: 'Eres la Bruja. Tus pociones pueden cambiar el juego.',
    },
    elimination: '{name} ha sido eliminado. Era {role}.',
    victory: {
      village: '¡Los Aldeanos ganan! Todos los lobos han sido eliminados.',
      wolves: '¡Los Hombres Lobo ganan! Han dominado el pueblo.',
    },
    nightStart: 'El pueblo se duerme... Los Hombres Lobo despiertan.',
    dayStart: 'Amanece. Discutan entre ustedes quién es el Hombre Lobo.',
  },
  assignRoles,
  processPhaseEnd,
};

export default werewolfDefinition;
