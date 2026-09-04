import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();

import { initializeDatabase } from './db/client';
import { gameRegistry } from './core/registry/GameRegistry';
import { initializeSocketServer } from './websocket/SocketServer';
import gamesRouter from './api/routes/games.routes';
import { gameMasterAI } from './ai/GameMasterAI';

async function main(): Promise<void> {
  // 1. Database (async with libsql)
  await initializeDatabase();

  // 2. Load game modules dynamically
  await gameRegistry.loadGames();

  const games = gameRegistry.getAllGames();
  if (games.length === 0) {
    console.warn('⚠️  No se cargaron juegos. Verifica la carpeta src/games/');
  }

  // 3. Express app
  const app = express();
  app.use(cors({
    origin: '*',
  }));
  app.use(express.json());

  // 4. Routes
  app.use('/api/games', gamesRouter);

  // AI chat REST endpoint
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, gameId } = req.body;
      const response = await gameMasterAI.chat(message, gameId);
      res.json({ response });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      games: gameRegistry.getAllGames().map(g => ({ id: g.id, name: g.name })),
      timestamp: new Date().toISOString(),
    });
  });

  // 5. HTTP + Socket.IO
  const httpServer = createServer(app);
  initializeSocketServer(httpServer);

  const PORT = Number(process.env.PORT) || 3001;
  httpServer.listen(PORT, () => {
    console.log('');
    console.log('🎮 ======================================');
    console.log(`🎮  GAME MASTER AI — Servidor iniciado`);
    console.log(`🎮  http://localhost:${PORT}`);
    console.log(`🎮  Juegos: ${games.map(g => g.name).join(', ')}`);
    console.log('🎮 ======================================');
    console.log('');
  });

  // Initial AI greeting removed to save quota
}

main().catch(err => {
  console.error('Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
