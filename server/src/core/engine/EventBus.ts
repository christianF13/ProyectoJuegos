import { GameEvent, GameEventType, EventHandler } from '../types/event.types';

class EventBus {
  private handlers: Map<GameEventType, EventHandler[]> = new Map();

  on(type: GameEventType, handler: EventHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  off(type: GameEventType, handler: EventHandler): void {
    const existing = this.handlers.get(type);
    if (existing) {
      this.handlers.set(type, existing.filter(h => h !== handler));
    }
  }

  async emit(event: GameEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];
    await Promise.all(handlers.map(h => Promise.resolve(h(event))));
  }
}

export const eventBus = new EventBus();
export { EventBus };
