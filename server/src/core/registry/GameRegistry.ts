import * as path from 'path';
import * as fs from 'fs';
import { GameDefinition } from '../types/game.types';

class GameRegistry {
  private definitions: Map<string, GameDefinition> = new Map();
  private loaded = false;

  async loadGames(): Promise<void> {
    if (this.loaded) return;

    // Support both ts-node (src) and compiled (dist) contexts
    const candidates = [
      path.join(__dirname, '../../games'),
      path.join(process.cwd(), 'src/games'),
    ];

    let gamesDir: string | null = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) { gamesDir = c; break; }
    }

    if (!gamesDir) {
      console.warn('⚠️  No se encontró directorio de juegos');
      this.loaded = true;
      return;
    }

    const entries = fs.readdirSync(gamesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        // ts-node resolves .ts files; compiled uses .js from dist
        const mod = require(path.join(gamesDir, entry.name, 'index'));
        const definition: GameDefinition = mod.default ?? mod;
        if (!definition?.id) throw new Error('GameDefinition sin id');
        this.definitions.set(definition.id, definition);
        console.log(`✅ Juego cargado: ${definition.name} (${definition.id})`);
      } catch (err) {
        console.error(`❌ Error cargando juego '${entry.name}':`, err);
      }
    }

    this.loaded = true;
  }

  getGame(id: string): GameDefinition | undefined {
    return this.definitions.get(id);
  }

  getAllGames(): GameDefinition[] {
    return Array.from(this.definitions.values());
  }

  isRegistered(id: string): boolean {
    return this.definitions.has(id);
  }
}

export const gameRegistry = new GameRegistry();
