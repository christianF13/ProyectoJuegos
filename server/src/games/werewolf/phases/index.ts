import { PhaseDefinition } from '../../../core/types/phase.types';

export const nightStartPhase: PhaseDefinition = {
  id: 'night_start',
  name: 'Inicio de la Noche',
  description: 'El pueblo se duerme.',
  order: 1,
  isNight: true,
  type: 'narrative',
  requiredActions: [],
  allowedActions: [],
  narrationTemplate: {
    start: 'El pueblo se duerme. Todos cierren los ojos. La oscuridad cae sobre la aldea...',
  },
  nextPhase: 'night_werewolves',
  timerKey: null,
};

export const nightWerewolvesPhase: PhaseDefinition = {
  id: 'night_werewolves',
  name: 'Turno: Hombres Lobo',
  description: 'Los lobos eligen a su víctima.',
  order: 2,
  isNight: true,
  type: 'action',
  requiredActions: [{ actionId: 'wolf_kill', roleId: 'werewolf', optional: false }],
  allowedActions: ['wolf_kill'],
  narrationTemplate: {
    start: 'Los Hombres Lobo despiertan. Abran los ojos. Reconózcanse. Elijan a su presa en silencio...',
    end: 'Los Hombres Lobo han terminado. Cierren los ojos.',
  },
  nextPhase: 'night_healer',
  timerKey: 'night',
};

export const nightHealerPhase: PhaseDefinition = {
  id: 'night_healer',
  name: 'Turno: Curandero',
  description: 'El curandero protege a un jugador.',
  order: 2.5,
  isNight: true,
  type: 'action',
  requiredActions: [{ actionId: 'healer_protect', roleId: 'healer', optional: false }],
  allowedActions: ['healer_protect'],
  narrationTemplate: {
    start: 'El Curandero despierta. Elige a un jugador para protegerlo esta noche...',
    end: 'El Curandero vuelve a dormir. Cierra los ojos.',
  },
  nextPhase: 'night_seer',
  timerKey: 'night',
};

export const nightSeerPhase: PhaseDefinition = {
  id: 'night_seer',
  name: 'Turno: Vidente',
  description: 'La vidente investiga.',
  order: 3,
  isNight: true,
  type: 'action',
  requiredActions: [{ actionId: 'seer_see', roleId: 'seer', optional: false }],
  allowedActions: ['seer_see'],
  narrationTemplate: {
    start: 'La Vidente despierta. Abre los ojos. Señala a alguien para conocer su verdadera identidad...',
    end: 'La Vidente vuelve a dormir. Cierra los ojos.',
  },
  nextPhase: 'night_witch',
  timerKey: 'night',
};

export const nightWitchPhase: PhaseDefinition = {
  id: 'night_witch',
  name: 'Turno: Bruja',
  description: 'La bruja decide si usa pociones.',
  order: 4,
  isNight: true,
  type: 'action',
  requiredActions: [{ actionId: 'witch_skip', roleId: 'witch', optional: false }], 
  allowedActions: ['witch_save', 'witch_kill', 'witch_skip'],
  narrationTemplate: {
    start: 'La Bruja despierta. Tiene dos pociones. Revisa en tu celular el estado de las víctimas y decide si quieres actuar...',
    end: 'La Bruja vuelve a dormir. La noche ha terminado.',
  },
  nextPhase: 'night_resolution',
  timerKey: 'night', 
};

export const nightResolutionPhase: PhaseDefinition = {
  id: 'night_resolution',
  name: 'Resolución de Noche',
  description: 'Calculando resultados de la noche...',
  order: 5,
  isNight: true,
  type: 'narrative',
  requiredActions: [],
  allowedActions: [],
  nextPhase: 'day_discussion',
  timerKey: null,
};

export const dayDiscussionPhase: PhaseDefinition = {
  id: 'day_discussion',
  name: 'Día - Debate',
  description: 'El pueblo discute quién podría ser el lobo.',
  order: 6,
  isNight: false,
  type: 'voting', 
  requiredActions: [],
  allowedActions: [],
  narrationTemplate: {
    start: 'Amanece. El pueblo despierta. ¡Abran los ojos! [SI HUBO MUERTES: {victimName} no sobrevivió a la noche]. ¡Discutan entre ustedes quién creen que es el Hombre Lobo!',
  },
  nextPhase: 'day_vote',
  timerKey: 'day_discussion',
};

export const dayVotePhase: PhaseDefinition = {
  id: 'day_vote',
  name: 'Día - Votación',
  description: 'El pueblo vota para eliminar a un sospechoso.',
  order: 7,
  isNight: false,
  type: 'voting',
  requiredActions: [],
  allowedActions: ['vote'],
  narrationTemplate: {
    start: 'Es hora de votar. Cada jugador debe elegir en su celular a quién eliminar del pueblo.',
  },
  nextPhase: 'night_start',
  timerKey: 'day_vote',
};

export const allPhases: PhaseDefinition[] = [
  nightStartPhase,
  nightWerewolvesPhase,
  nightHealerPhase,
  nightSeerPhase,
  nightWitchPhase,
  nightResolutionPhase,
  dayDiscussionPhase,
  dayVotePhase,
];
