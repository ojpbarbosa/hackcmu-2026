import { store } from './store';
import type { AppName, ObserveEvent } from './types';

const CAP = 200;
const roomKey = (app: AppName, code: string) => `events:${app}:${code}`;
const ALL = 'events:all';

/** Every model call lands here. The stage views read it back as the model ladder. */
export const observe = {
  async emit(e: ObserveEvent): Promise<void> {
    await store.lpush(ALL, e, CAP);
    if (e.code) await store.lpush(roomKey(e.app, e.code), e, CAP);
  },
  /** Chronological (oldest first), newest `n` events. */
  async recent(app?: AppName, code?: string, n = 50): Promise<ObserveEvent[]> {
    const key = app && code ? roomKey(app, code) : ALL;
    const rows = await store.lrange<ObserveEvent>(key, n);
    const filtered = app && !code ? rows.filter((r) => r.app === app) : rows;
    return filtered.reverse();
  },
};
