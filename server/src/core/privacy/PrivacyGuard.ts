import { GameState, PlayerState } from '../types/game.types';

export class PrivacyGuard {
  /**
   * PUBLIC: visible to all players and the GM screen.
   * NEVER includes roles, private info, individual votes.
   */
  static getPublicState(state: GameState) {
    return {
      id: state.id,
      code: state.code,
      gameDefinitionId: state.gameDefinitionId,
      phase: state.phase,
      round: state.round,
      status: state.status,
      winner: state.winner,
      winnerFaction: state.winnerFaction,
      players: state.players.map(p => ({
        id: p.id,
        name: p.name,
        isAlive: p.isAlive,
        isConnected: p.isConnected,
      })),
      aliveCount: state.players.filter(p => p.isAlive).length,
      totalCount: state.players.length,
      createdAt: state.createdAt,
    };
  }

  /**
   * PLAYER_PRIVATE: only for the specific player.
   * Includes their own role and private info.
   * NEVER includes any other player's role.
   */
  static getPlayerState(state: GameState, playerId: string) {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;

    return {
      ...this.getPublicState(state),
      myPlayer: {
        id: player.id,
        name: player.name,
        roleId: player.roleId,
        faction: player.faction,
        isAlive: player.isAlive,
        hasActed: player.hasActed,
        privateInfo: player.privateInfo,
      },
    };
  }

  /**
   * GAME_MASTER_PRIVATE: full state, only used server-side.
   * NEVER send this to any client.
   */
  static getGameMasterState(state: GameState): GameState {
    return state;
  }
}
