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

  // 1. Determinar cantidad de lobos base (aprox 1/3 o 1/4 de los jugadores)
  const wolfCount = count <= 6 ? 1 : count <= 10 ? 2 : count <= 14 ? 3 : 4;
  const wolfPoints = wolfCount * -6;

  // 2. Si todos los demás fueran aldeanos normales (+1)
  let villagePoints = (count - wolfCount) * 1;
  let currentBalance = wolfPoints + villagePoints;

  // 3. Mejoras disponibles (valor neto al cambiar un aldeano por este rol)
  // Vidente (+7) aporta +6 sobre el aldeano. Bruja (+5) aporta +4, etc.
  const upgrades = [
    { id: 'seer', netValue: 6 },
    { id: 'witch', netValue: 4 },
    { id: 'healer', netValue: 2 },
    { id: 'caperucita', netValue: 2 }
  ];

  const selectedUpgrades: string[] = [];

  // Algoritmo Greedy: intentamos acercar el balance a 0
  for (const upgrade of upgrades) {
    // Si estamos en negativo y esta mejora no nos pasa exageradamente al lado positivo
    if (currentBalance < 0) {
      // Si agregar esto nos acerca a 0 (incluso pasándonos un poco)
      const diffSinMejora = Math.abs(currentBalance);
      const diffConMejora = Math.abs(currentBalance + upgrade.netValue);
      
      if (diffConMejora < diffSinMejora || currentBalance + upgrade.netValue <= 2) {
        selectedUpgrades.push(upgrade.id);
        currentBalance += upgrade.netValue;
      }
    }
  }

  // 4. Asignar los roles a los jugadores
  let idx = 0;
  for (let i = 0; i < wolfCount && idx < shuffled.length; i++) {
    assignments.set(shuffled[idx++], 'werewolf');
  }
  for (const roleId of selectedUpgrades) {
    if (idx < shuffled.length) assignments.set(shuffled[idx++], roleId);
  }
  while (idx < shuffled.length) {
    assignments.set(shuffled[idx++], 'villager');
  }

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

  // Witch save — can only be used if victim still alive (healer didn't save them)
  const witchSave = nightActions.find(a => a.actionId === 'witch_save');
  let witchSaved = false;
  if (witchSave && victimId) {
    const witch = state.players.find(p => p.roleId === 'witch' && p.isAlive);
    if (witch) {
      witch.privateInfo = { ...witch.privateInfo, lifePotion: 'used' };
      witchSaved = true;
      victimId = null; // saved!
    }
  }

  // Witch kill
  const witchKill = nightActions.find(a => a.actionId === 'witch_kill');
  let witchVictimId: string | null = null;
  if (witchKill?.targetId) {
    const witch = state.players.find(p => p.roleId === 'witch' && p.isAlive);
    if (witch) {
      witch.privateInfo = { ...witch.privateInfo, deathPotion: 'used' };
      witchVictimId = witchKill.targetId;
      eliminations.push(witchVictimId);
    }
  }

  if (victimId) eliminations.push(victimId);

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
