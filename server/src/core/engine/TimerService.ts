import { eventBus } from './EventBus';
import { GameEventType } from '../types/event.types';

class TimerService {
  private timers: Map<string, { interval: NodeJS.Timeout; remaining: number; total: number }> = new Map();

  start(gameId: string, phase: string, durationSeconds: number, onComplete: () => void): void {
    const key = `${gameId}:${phase}`;
    this.stop(gameId, phase);

    let remaining = durationSeconds;

    const interval = setInterval(async () => {
      remaining--;
      await eventBus.emit({
        type: GameEventType.TIMER_TICK,
        gameId,
        timestamp: new Date(),
        data: { phase, remaining, total: durationSeconds },
      });
      if (remaining <= 0) {
        this.stop(gameId, phase);
        await eventBus.emit({
          type: GameEventType.TIMER_ENDED,
          gameId,
          timestamp: new Date(),
          data: { phase },
        });
        onComplete();
      }
    }, 1000);

    this.timers.set(key, { interval, remaining, total: durationSeconds });
  }

  stop(gameId: string, phase: string): void {
    const key = `${gameId}:${phase}`;
    const t = this.timers.get(key);
    if (t) { clearInterval(t.interval); this.timers.delete(key); }
  }

  stopAll(gameId: string): void {
    for (const [key, t] of this.timers.entries()) {
      if (key.startsWith(`${gameId}:`)) {
        clearInterval(t.interval);
        this.timers.delete(key);
      }
    }
  }

  getRemaining(gameId: string, phase: string): number | null {
    return this.timers.get(`${gameId}:${phase}`)?.remaining ?? null;
  }
}

export const timerService = new TimerService();
