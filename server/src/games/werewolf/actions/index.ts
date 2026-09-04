import { ActionDefinition } from '../../../core/types/action.types';

export const wolfKillAction: ActionDefinition = {
  id: 'wolf_kill',
  name: 'Atacar',
  description: 'Los lobos eligen a quién atacar esta noche.',
  roleId: 'werewolf',
  phase: 'night_werewolves',
  targetType: 'player',
  targetFilter: 'others_alive',
  isSecret: true,
  oneTimeUse: false,
  label: 'Elige a quién atacar esta noche',
};

export const seerSeeAction: ActionDefinition = {
  id: 'seer_see',
  name: 'Investigar',
  description: 'La vidente investiga el rol de un jugador.',
  roleId: 'seer',
  phase: 'night_seer',
  targetType: 'player',
  targetFilter: 'others_alive',
  isSecret: true,
  oneTimeUse: false,
  label: 'Elige a quién investigar',
};

export const witchSaveAction: ActionDefinition = {
  id: 'witch_save',
  name: 'Poción de Vida ❤️',
  description: 'Salva a la víctima de los lobos esta noche.',
  roleId: 'witch',
  phase: 'night_witch',
  targetType: 'none',
  targetFilter: 'alive',
  isSecret: true,
  oneTimeUse: true,
  label: 'Usar poción de vida',
};

export const witchKillAction: ActionDefinition = {
  id: 'witch_kill',
  name: 'Poción de Muerte ☠️',
  description: 'Elimina a cualquier jugador esta noche.',
  roleId: 'witch',
  phase: 'night_witch',
  targetType: 'player',
  targetFilter: 'others_alive',
  isSecret: true,
  oneTimeUse: true,
  label: 'Elige a quién eliminar con tu poción de muerte',
};

export const witchSkipAction: ActionDefinition = {
  id: 'witch_skip',
  name: 'No hacer nada 💤',
  description: 'Decides guardar tus pociones para otra noche.',
  roleId: 'witch',
  phase: 'night_witch',
  targetType: 'none',
  targetFilter: 'alive',
  isSecret: true,
  oneTimeUse: false,
  label: 'No hacer nada esta noche',
};

export const healerProtectAction: ActionDefinition = {
  id: 'healer_protect',
  name: 'Proteger',
  description: 'El Curandero protege a un jugador.',
  roleId: 'healer',
  phase: 'night_healer',
  targetType: 'player',
  targetFilter: 'alive',
  isSecret: true,
  oneTimeUse: false,
  label: 'Elige a quién proteger esta noche',
};

export const allActions: ActionDefinition[] = [
  wolfKillAction, 
  seerSeeAction, 
  witchSaveAction, 
  witchKillAction, 
  witchSkipAction,
  healerProtectAction
];
