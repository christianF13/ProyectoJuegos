import { createClient, Client } from '@libsql/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config();

const DB_PATH = process.env.DB_PATH || './gamemaster.db';
// libsql uses file:// URI for local SQLite
const DB_URL = DB_PATH.startsWith('file:') ? DB_PATH : `file:${path.resolve(DB_PATH)}`;

export const db: Client = createClient({ url: DB_URL });

export async function initializeDatabase(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      game_definition_id TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'lobby',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_events_game_id ON events(game_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_games_code ON games(code)`);
  console.log('✅ Base de datos inicializada:', DB_URL);
}
