import { GameState, Vote } from '../types/game.types';

export class VotingSystem {
  static tallyVotes(
    votes: Vote[],
    phase: string,
    round: number
  ): { winner: string | null; tally: Record<string, number>; isTie: boolean } {
    const relevant = votes.filter(v => v.phase === phase && v.round === round);
    const tally: Record<string, number> = {};
    for (const v of relevant) {
      tally[v.targetId] = (tally[v.targetId] ?? 0) + 1;
    }
    const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return { winner: null, tally, isTie: false };
    const topCount = entries[0][1];
    const top = entries.filter(e => e[1] === topCount);
    return {
      winner: top.length === 1 ? top[0][0] : null,
      tally,
      isTie: top.length > 1,
    };
  }

  static hasEveryoneVoted(state: GameState): boolean {
    const alive = state.players.filter(p => p.isAlive);
    const voters = new Set(
      state.votes
        .filter(v => v.phase === state.phase && v.round === state.round)
        .map(v => v.voterId)
    );
    return alive.every(p => voters.has(p.id));
  }
}
