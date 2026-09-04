import { Router, Request, Response } from 'express';
import { gameManager } from '../../core/engine/GameManager';
import { gameRegistry } from '../../core/registry/GameRegistry';
import { PrivacyGuard } from '../../core/privacy/PrivacyGuard';

const router = Router();

// GET /api/games/definitions
router.get('/definitions', (_req: Request, res: Response) => {
  const games = gameRegistry.getAllGames().map(g => ({
    id: g.id,
    name: g.name,
    description: g.description,
    minPlayers: g.minPlayers,
    maxPlayers: g.maxPlayers,
  }));
  res.json({ games });
});

// POST /api/games  — create new game session
router.post('/', async (req: Request, res: Response) => {
  try {
    const { gameDefinitionId } = req.body;
    if (!gameDefinitionId) return res.status(400).json({ error: 'gameDefinitionId requerido' });
    const state = await gameManager.createGame(gameDefinitionId);
    res.json({ gameId: state.id, code: state.code });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/games/code/:code  — public game info by room code
router.get('/code/:code', (req: Request, res: Response) => {
  const state = gameManager.getStateByCode(req.params.code);
  if (!state) return res.status(404).json({ error: 'Partida no encontrada' });
  res.json(PrivacyGuard.getPublicState(state));
});

// GET /api/games/:id/player/:playerId  — private player state
router.get('/:id/player/:playerId', (req: Request, res: Response) => {
  try {
    const state = gameManager.getState(req.params.id);
    const playerState = PrivacyGuard.getPlayerState(state, req.params.playerId);
    if (!playerState) return res.status(404).json({ error: 'Jugador no encontrado' });
    res.json(playerState);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/games/:id/start
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    await gameManager.startGame(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/games/:id/bots (SOLO PARA PRUEBAS)
router.post('/:id/bots', async (req: Request, res: Response) => {
  try {
    const state = gameManager.getState(req.params.id);
    const needed = 4 - state.players.length;
    for (let i = 0; i < needed; i++) {
      await gameManager.addPlayer(req.params.id, `Bot ${i + 1}`);
    }
    res.json({ success: true, added: needed });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
