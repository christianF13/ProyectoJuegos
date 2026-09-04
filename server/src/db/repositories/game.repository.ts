import { db } from '../client';
import { GameState } from '../../core/types/game.types';

export const gameRepository = {
  async saveGame(state: GameState): Promise<void> {
    const stateJson = JSON.stringify(state, (_key, value) => {
      if (value instanceof Date) return value.toISOString();
      return value;
    });
    const createdAt = state.createdAt instanceof Date ? state.createdAt.getTime() : Number(state.createdAt);
    const updatedAt = state.updatedAt instanceof Date ? state.updatedAt.getTime() : Number(state.updatedAt);

    await db.execute({
      sql: `INSERT INTO games (id, game_definition_id, code, state, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              state = excluded.state,
              status = excluded.status,
              updated_at = excluded.updated_at`,
      args: [state.id, state.gameDefinitionId, state.code, stateJson, state.status, createdAt, updatedAt],
    });
  },

  async getGame(id: string): Promise<GameState | null> {
    const result = await db.execute({ sql: 'SELECT state FROM games WHERE id = ?', args: [id] });
    if (result.rows.length === 0) return null;
    return JSON.parse(result.rows[0].state as string) as GameState;
  },

  async getGameByCode(code: string): Promise<GameState | null> {
    const result = await db.execute({ sql: 'SELECT state FROM games WHERE code = ?', args: [code.toUpperCase()] });
    if (result.rows.length === 0) return null;
    return JSON.parse(result.rows[0].state as string) as GameState;
  },

  async getAllGames(): Promise<GameState[]> {
    const result = await db.execute('SELECT state FROM games');
    return result.rows.map(r => JSON.parse(r.state as string) as GameState);
  },
};
