import { GameDefinition, GameState, PhaseResult } from '../../core/types/game.types';
import { allRoles } from './roles';
import { allPhases } from './phases';
import { allActions } from './actions';
import { victoryConditions } from './victory-conditions';
import { VotingSystem } from '../../core/engine/VotingSystem';

function assignRoles(playerIds: string[], definition: GameDefinition): Map<string, string> {
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  const assignments = new Map<string, string>();
  const count = playerIds.length;

  // ── Role table: guaranteed composition per player count ──────────────
  // Format: [wolves, seer, witch, healer, caperucita]
  // Remaining slots = villagers
  const roleTable: Record<number, [number,number,number,number,number]> = {
    4:  [1, 1, 0, 0, 0],   // 1 lobo, 1 vidente, 2 aldeanos
    5:  [1, 1, 1, 0, 0],   // + bruja
    6:  [1, 1, 1, 1, 0],   // + curandero
    7:  [1, 1, 1, 1, 1],   // + caperucita
    8:  [2, 1, 1, 1, 1],   // 2 lobos
    9:  [2, 1, 1, 1, 1],   // 2 lobos + rest aldeanos
    10: [2, 1, 1, 1, 1],
    11: [3, 1, 1, 1, 1],
    12: [3, 1, 1, 1, 1],
    13: [3, 1, 1, 1, 1],
    14: [4, 1, 1, 1, 1],
    15: [4, 1, 1, 1, 1],
    16: [4, 1, 1, 1, 1],
    17: [4, 1, 1, 1, 1],
    18: [5, 1, 1, 1, 1],
  };

  const [wolves, seers, witches, healers, caperucitas] = roleTable[count] ?? roleTable[18];

  const roleList: string[] = [
    ...Array(wolves).fill('werewolf'),
    ...Array(seers).fill('seer'),
    ...Array(witches).fill('witch'),
    ...Array(healers).fill('healer'),
    ...Array(caperucitas).fill('caperucita'),
  ];
  // Fill the rest with villagers
  while (roleList.length < count) roleList.push('villager');

  for (let i = 0; i < shuffled.length; i++) {
    assignments.set(shuffled[i], roleList[i]);
  }

  return assignments;
}

// ── Phase processing logic (stays inside the game module) ────────────
function processPhaseEnd(state: GameState, phase: string): PhaseResult {
  switch (phase) {
    case 'night_start': return { eliminations: [], announcements: [], nextPhase: 'night_werewolves' };
    case 'night_werewolves': return { eliminations: [], announcements: [], nextPhase: 'night_healer' };
    case 'night_healer': return { eliminations: [], announcements: [], nextPhase: 'night_seer' };
    case 'night_seer': {
      const seerSee = state.pendingActions.find(a => a.phase === 'night_seer' && a.actionId === 'seer_see');
      if (seerSee?.targetId) {
        const seer = state.players.find(p => p.roleId === 'seer' && p.isAlive);
        const target = state.players.find(p => p.id === seerSee.targetId);
        if (seer && target) {
          const isWerewolf = target.faction === 'wolves';
          const newVision = { targetId: target.id, targetName: target.name, isWerewolf, round: state.round };
          const existingVisions = ((seer.privateInfo?.visions as any[]) || []).filter(v => v.targetId !== target.id);
          seer.privateInfo = {
            ...seer.privateInfo,
            seerResult: newVision,
            visions: [...existingVisions, newVision],
          };
        }
      }
      return { eliminations: [], announcements: [], nextPhase: 'night_witch' };
    }
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
  const nightActions = state.pendingActions.filter(a => a.phase.startsWith('night_'));

  const wolfKill = nightActions.find(a => a.actionId === 'wolf_kill');
  let victimId: string | null = wolfKill?.targetId ?? null;
  const victimName = victimId ? (state.players.find(p => p.id === victimId)?.name ?? 'Alguien') : null;

  // Healer protect — record lastHealedId to prevent repeating same target
  const healerProtect = nightActions.find(a => a.actionId === 'healer_protect');
  if (healerProtect?.targetId) {
    const healer = state.players.find(p => p.roleId === 'healer' && p.isAlive);
    if (healer) {
      healer.privateInfo = { ...healer.privateInfo, lastHealedId: healerProtect.targetId };
    }
    if (healerProtect.targetId === victimId && victimId) {
      victimId = null; // Saved by healer!
    }
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

  // Witch save — marks lifePotion used whether victim saved or not
  const witchSave = nightActions.find(a => a.actionId === 'witch_save');
  let witchSaved = false;
  if (witchSave) {
    const witch = state.players.find(p => p.roleId === 'witch' && p.isAlive);
    if (witch) {
      witch.privateInfo = { ...witch.privateInfo, lifePotion: 'used' };
      if (victimId) {
        witchSaved = true;
        victimId = null; // saved!
      }
    }
  }

  // Witch kill — only eliminates if target is currently alive
  const witchKill = nightActions.find(a => a.actionId === 'witch_kill');
  let witchVictimId: string | null = null;
  if (witchKill?.targetId) {
    const witch = state.players.find(p => p.roleId === 'witch' && p.isAlive);
    if (witch) {
      witch.privateInfo = { ...witch.privateInfo, deathPotion: 'used' };
      const witchVictim = state.players.find(p => p.id === witchKill.targetId);
      if (witchVictim && witchVictim.isAlive) {
        witchVictimId = witchKill.targetId;
        eliminations.push(witchVictimId);
      }
    }
  }

  // Wolf victim — only eliminates if alive and not already eliminated by witch
  if (victimId) {
    const wolfVictim = state.players.find(p => p.id === victimId);
    if (wolfVictim && wolfVictim.isAlive && !eliminations.includes(victimId)) {
      eliminations.push(victimId);
    } else {
      victimId = null;
    }
  }

  // CRITICAL FIX: Limpiar las acciones de la noche para que NO se repitan en noches futuras
  state.pendingActions = state.pendingActions.filter(a => !a.phase.startsWith('night_'));

  // ── Narration ──────────────────────────────────────────────────────
  if (eliminations.length === 0 && !witchSaved) {
    announcements.push('Esta noche no murió nadie. El pueblo puede respirar aliviado... por ahora.');
  } else {
    // Wolf kill + witch save
    if (witchSaved && victimName) {
      announcements.push(`Los Hombres Lobo atacaron a ${victimName} esta noche... ¡pero la Bruja usó su poción de vida y lo salvó!`);
    }
    // Wolf kill result (if not saved)
    if (victimId) {
      const victim = state.players.find(p => p.id === victimId);
      const roleName = allRoles.find(r => r.id === victim?.roleId)?.name ?? 'Desconocido';
      announcements.push(`Esta noche, los Hombres Lobo eliminaron a ${victim?.name ?? 'alguien'}. Era ${roleName}.`);
    }
    // Witch kill announcement
    if (witchVictimId) {
      const witchVictim = state.players.find(p => p.id === witchVictimId);
      const roleName = allRoles.find(r => r.id === witchVictim?.roleId)?.name ?? 'Desconocido';
      announcements.push(`La Bruja usó su poción de muerte... ${witchVictim?.name ?? 'alguien'} no despertará esta mañana. Era ${roleName}.`);
    }
  }

  return { eliminations, announcements, nextPhase: 'day_discussion' };
}

function processDayVoteEnd(state: GameState): PhaseResult {
  const { winner, tally, isTie } = VotingSystem.tallyVotes(state.votes, 'day_vote', state.round);
  const eliminations: string[] = [];
  const announcements: string[] = [];

  const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    announcements.push('Nadie emitió ningún voto hoy. El pueblo se retira a descansar sin linchamiento.');
  } else if (!isTie && winner) {
    // Ganador claro por mayoría de votos
    eliminations.push(winner);
    const p = state.players.find(pl => pl.id === winner);
    const role = allRoles.find(r => r.id === p?.roleId);
    const voteCount = tally[winner];
    announcements.push(`Por votación popular con ${voteCount} votos, ${p?.name ?? 'un jugador'} ha sido llevado a la horca. ¡Era ${role?.name ?? 'desconocido'}!`);
  } else {
    // Empate entre los más votados: desempate forzado para que siempre se elimine a uno de los más votados
    const topCount = entries[0][1];
    const topCandidates = entries.filter(e => e[1] === topCount).map(e => e[0]);
    const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    eliminations.push(chosen);
    const p = state.players.find(pl => pl.id === chosen);
    const role = allRoles.find(r => r.id === p?.roleId);
    const tiedNames = topCandidates.map(id => state.players.find(pl => pl.id === id)?.name ?? 'Jugador').join(' y ');
    announcements.push(`¡Empate con ${topCount} votos entre ${tiedNames}! Ante la tensión, el pueblo decidió por azar: ${p?.name ?? 'un jugador'} es enviado a la horca. ¡Era ${role?.name ?? 'desconocido'}!`);
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
