import { Redis } from '@upstash/redis';

export type Store = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, v: T, ttlSec?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** push to the head of a list and trim it to `cap` entries */
  lpush<T>(key: string, v: T, cap: number): Promise<void>;
  /** newest first */
  lrange<T>(key: string, n: number): Promise<T[]>;
  keys(prefix: string): Promise<string[]>;
};

export type StoreKind = 'memory' | 'upstash';

type Entry = { v: unknown; exp: number | null };

/** Dev-only: a module-level Map. It does not survive a restart and is NOT shared
 *  between serverless instances — set UPSTASH_REDIS_REST_URL/TOKEN for anything
 *  with more than one reader. Parked on globalThis so Next's dev HMR keeps it. */
const g = globalThis as unknown as { __hackMem?: Map<string, Entry>; __hackList?: Map<string, unknown[]> };
const mem = (g.__hackMem ??= new Map<string, Entry>());
const lists = (g.__hackList ??= new Map<string, unknown[]>());

function live(key: string): Entry | null {
  const e = mem.get(key);
  if (!e) return null;
  if (e.exp !== null && e.exp < Date.now()) {
    mem.delete(key);
    return null;
  }
  return e;
}

const memoryStore: Store = {
  async get<T>(key: string) {
    const e = live(key);
    return e ? (structuredClone(e.v) as T) : null;
  },
  async set<T>(key: string, v: T, ttlSec?: number) {
    mem.set(key, { v: structuredClone(v), exp: ttlSec ? Date.now() + ttlSec * 1000 : null });
  },
  async del(key: string) {
    mem.delete(key);
    lists.delete(key);
  },
  async lpush<T>(key: string, v: T, cap: number) {
    const l = lists.get(key) ?? [];
    l.unshift(structuredClone(v));
    if (l.length > cap) l.length = cap;
    lists.set(key, l);
  },
  async lrange<T>(key: string, n: number) {
    return ((lists.get(key) ?? []).slice(0, n) as T[]).map((x) => structuredClone(x));
  },
  async keys(prefix: string) {
    const out = new Set<string>();
    for (const k of mem.keys()) if (k.startsWith(prefix) && live(k)) out.add(k);
    for (const k of lists.keys()) if (k.startsWith(prefix)) out.add(k);
    return [...out];
  },
};

function upstashStore(url: string, token: string): Store {
  const redis = new Redis({ url, token });
  return {
    async get<T>(key: string) {
      return ((await redis.get(key)) as T) ?? null;
    },
    async set<T>(key: string, v: T, ttlSec?: number) {
      if (ttlSec) await redis.set(key, v as object, { ex: ttlSec });
      else await redis.set(key, v as object);
    },
    async del(key: string) {
      await redis.del(key);
    },
    async lpush<T>(key: string, v: T, cap: number) {
      await redis.lpush(key, v as object);
      await redis.ltrim(key, 0, cap - 1);
    },
    async lrange<T>(key: string, n: number) {
      return ((await redis.lrange(key, 0, n - 1)) as T[]) ?? [];
    },
    async keys(prefix: string) {
      return (await redis.keys(`${prefix}*`)) ?? [];
    },
  };
}

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const storeKind: StoreKind = url && token ? 'upstash' : 'memory';
export const store: Store = url && token ? upstashStore(url, token) : memoryStore;

/** Test helper: wipe the in-memory store between cases. */
export function __resetMemoryStore(): void {
  mem.clear();
  lists.clear();
}
