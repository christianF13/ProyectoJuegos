import { RoleDefinition } from '../../../core/types/player.types';

export const villagerRole: RoleDefinition = {
  id: 'villager',
  name: 'Aldeano',
  description: 'Un aldeano ordinario que busca eliminar a los lobos.',
  faction: 'village',
  maxCount: null,
  minCount: 1,
  nightActions: [],
  dayActions: ['vote'],
  privateInstructions: 'Eres un Aldeano. Tu objetivo es descubrir y eliminar a los Hombres Lobo mediante la votación. No tienes poderes especiales, pero tu razonamiento es crucial para el pueblo.',
  publicDescription: 'Aldeano sin poderes especiales.',
  revealsOnElimination: true,
};

export const werewolfRole: RoleDefinition = {
  id: 'werewolf',
  name: 'Hombre Lobo',
  description: 'Un lobo camuflado entre los aldeanos.',
  faction: 'wolves',
  maxCount: null,
  minCount: 1,
  nightActions: ['wolf_kill'],
  dayActions: ['vote'],
  privateInstructions: 'Eres un Hombre Lobo. Cada noche elige a quién eliminar. De día, finge ser aldeano y evita ser descubierto. Los lobos conocen la identidad de los demás lobos.',
  publicDescription: 'Jugador con rol desconocido.',
  revealsOnElimination: true,
};

export const seerRole: RoleDefinition = {
  id: 'seer',
  name: 'Vidente',
  description: 'Puede ver el rol secreto de cualquier jugador.',
  faction: 'village',
  maxCount: 1,
  minCount: 0,
  nightActions: ['seer_see'],
  dayActions: ['vote'],
  privateInstructions: 'Eres la Vidente. Cada noche puedes investigar a un jugador para saber si es Hombre Lobo o aldeano. El resultado solo lo sabes tú. Úsalo sabiamente durante el debate.',
  publicDescription: 'Jugador con rol desconocido.',
  revealsOnElimination: true,
};

export const witchRole: RoleDefinition = {
  id: 'witch',
  name: 'Bruja',
  description: 'Posee una poción de vida y una de muerte.',
  faction: 'village',
  maxCount: 1,
  minCount: 0,
  nightActions: ['witch_save', 'witch_kill'],
  dayActions: ['vote'],
  privateInstructions: 'Eres la Bruja. Tienes dos pociones: una de VIDA (salva a la víctima de los lobos esta noche) y una de MUERTE (elimina a cualquier jugador). Cada poción solo puede usarse UNA VEZ en toda la partida.',
  publicDescription: 'Jugador con rol desconocido.',
  revealsOnElimination: true,
};

export const curanderoRole: RoleDefinition = {
  id: 'healer',
  name: 'Curandero',
  description: 'Protege a un jugador cada noche.',
  faction: 'village',
  maxCount: 1,
  minCount: 0,
  nightActions: ['healer_protect'],
  dayActions: ['vote'],
  privateInstructions: 'Eres el Curandero. Cada noche puedes proteger a un jugador. Si los lobos lo atacan esa noche, sobrevivirá. ¡Atención! NO puedes protegerte a ti mismo.',
  publicDescription: 'Jugador con rol desconocido.',
  revealsOnElimination: true,
};

export const caperucitaRole: RoleDefinition = {
  id: 'caperucita',
  name: 'Caperucita Roja',
  description: 'Una niña valiente del pueblo.',
  faction: 'village',
  maxCount: 1,
  minCount: 0,
  nightActions: [],
  dayActions: ['vote'],
  privateInstructions: 'Eres Caperucita Roja. Eres inocente y frágil. No tienes acciones nocturnas, pero tu presencia trae esperanza al pueblo.',
  publicDescription: 'Jugador con rol desconocido.',
  revealsOnElimination: true,
};

export const allRoles: RoleDefinition[] = [villagerRole, werewolfRole, seerRole, witchRole, curanderoRole, caperucitaRole];
