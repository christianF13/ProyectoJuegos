import { VictoryCondition } from '../../../core/types/game.types';

export const werewolvesWin: VictoryCondition = {
  id: 'werewolves_win',
  description: '¡Los Hombres Lobo ganan! Han igualado o superado en número a los aldeanos.',
  winnerFaction: 'wolves',
  check: (state) => {
    const alive = state.players.filter(p => p.isAlive);
    const wolves = alive.filter(p => p.faction === 'wolves').length;
    const village = alive.filter(p => p.faction === 'village').length;
    return wolves > 0 && wolves >= village;
  },
};

export const villagersWin: VictoryCondition = {
  id: 'villagers_win',
  description: '¡Los Aldeanos ganan! Todos los Hombres Lobo han sido eliminados.',
  winnerFaction: 'village',
  check: (state) => {
    const aliveWolves = state.players.filter(p => p.isAlive && p.faction === 'wolves').length;
    return aliveWolves === 0 && state.players.some(p => p.isAlive);
  },
};

export const victoryConditions: VictoryCondition[] = [werewolvesWin, villagersWin];
