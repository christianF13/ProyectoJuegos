import { GameState } from '../types/game.types';
import { ActionRequest } from '../types/action.types';
import { GameDefinition } from '../types/game.types';

export class ActionValidator {
  static validate(
    request: ActionRequest,
    state: GameState,
    definition: GameDefinition
  ): { valid: boolean; error?: string } {
    const player = state.players.find(p => p.id === request.playerId);
    if (!player) return { valid: false, error: 'Jugador no encontrado' };
    if (!player.isAlive) return { valid: false, error: 'El jugador está eliminado' };
    if (state.phase !== request.phase) return { valid: false, error: 'Fase incorrecta' };
    if (player.hasActed) return { valid: false, error: 'Ya realizaste tu acción en esta fase' };

    const actionDef = definition.actions.find(a => a.id === request.actionId);
    if (!actionDef) return { valid: false, error: 'Acción no encontrada' };
    if (actionDef.roleId !== player.roleId) return { valid: false, error: 'No tienes permiso para esta acción' };
    if (actionDef.phase !== state.phase) return { valid: false, error: 'Esta acción no está disponible en esta fase' };

    // Check one-time-use potion
    if (actionDef.oneTimeUse) {
      if (actionDef.id === 'witch_save' && player.privateInfo?.lifePotion === 'used') {
        return { valid: false, error: 'Ya usaste la poción de vida' };
      }
      if (actionDef.id === 'witch_kill' && player.privateInfo?.deathPotion === 'used') {
        return { valid: false, error: 'Ya usaste la poción de muerte' };
      }
    }

    if (request.targetId && actionDef.targetType === 'player') {
      const target = state.players.find(p => p.id === request.targetId);
      if (!target) return { valid: false, error: 'Objetivo no encontrado' };
      if (actionDef.targetFilter === 'others_alive') {
        if (!target.isAlive) return { valid: false, error: 'El objetivo debe estar vivo' };
        if (target.id === request.playerId) return { valid: false, error: 'No puedes elegirte a ti mismo' };
      }
      if (actionDef.targetFilter === 'alive' && !target.isAlive) {
        return { valid: false, error: 'El objetivo debe estar vivo' };
      }
    }

    return { valid: true };
  }
}
