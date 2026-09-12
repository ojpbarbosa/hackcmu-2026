import { Redis } from '@upstash/redis';
import type { Collection, Db, MongoClient } from 'mongodb';

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

export type StoreKind = 'memory' | 'upstash' | 'mongo';

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

/* ---------------------------------------------------------------- mongo atlas */

type KvDoc = { _id: string; value: unknown; expiresAt: Date | null };
type ListDoc = { _id: string; items: unknown[]; expiresAt: Date | null };

const gm = globalThis as unknown as { __hackMongo?: Promise<Db>; __hackMongoTtl?: boolean };

async function mongoDb(uri: string): Promise<Db> {
  gm.__hackMongo ??= (async () => {
    // imported lazily so the driver is never bundled into edge/client paths
    const { MongoClient: Client } = (await import('mongodb')) as { MongoClient: typeof MongoClient };
    const client = new Client(uri, { maxPoolSize: 5 });
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'familiars');
    if (!gm.__hackMongoTtl) {
      gm.__hackMongoTtl = true;
      // created once, lazily; a duplicate/denied index must never break a request
      await Promise.all([
        db.collection('kv').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {}),
        db.collection('lists').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {}),
      ]);
    }
    return db;
  })();
  return gm.__hackMongo;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mongoStore(uri: string): Store {
  const kv = async (): Promise<Collection<KvDoc>> => (await mongoDb(uri)).collection<KvDoc>('kv');
  const ls = async (): Promise<Collection<ListDoc>> => (await mongoDb(uri)).collection<ListDoc>('lists');
  const exp = (ttlSec?: number): Date | null => (ttlSec ? new Date(Date.now() + ttlSec * 1000) : null);

  return {
    async get<T>(key: string) {
      const doc = await (await kv()).findOne({ _id: key });
      if (!doc) return null;
      // the TTL monitor runs once a minute, so expiry is also checked on read
      if (doc.expiresAt && doc.expiresAt.getTime() < Date.now()) return null;
      return (doc.value as T) ?? null;
    },
    async set<T>(key: string, v: T, ttlSec?: number) {
      await (await kv()).updateOne(
        { _id: key },
        { $set: { value: v as unknown, expiresAt: exp(ttlSec) } },
        { upsert: true },
      );
    },
    async del(key: string) {
      await Promise.all([(await kv()).deleteOne({ _id: key }), (await ls()).deleteOne({ _id: key })]);
    },
    async lpush<T>(key: string, v: T, cap: number) {
      await (await ls()).updateOne(
        { _id: key },
        {
          $push: { items: { $each: [v as unknown], $position: 0, $slice: cap } },
          $set: { expiresAt: exp(LIST_TTL_SEC) },
        },
        { upsert: true },
      );
    },
    async lrange<T>(key: string, n: number) {
      const doc = await (await ls()).findOne({ _id: key });
      return ((doc?.items ?? []) as T[]).slice(0, n);
    },
    async keys(prefix: string) {
      const re = { $regex: `^${escapeRe(prefix)}` };
      const now = new Date();
      const [a, b] = await Promise.all([
        (await kv())
          .find({ _id: re, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }, { projection: { _id: 1 } })
          .toArray(),
        (await ls()).find({ _id: re }, { projection: { _id: 1 } }).toArray(),
      ]);
      return [...new Set([...a, ...b].map((d) => d._id))];
    },
  };
}

/** Lists get a long TTL so an abandoned room eventually falls out of Atlas. */
const LIST_TTL_SEC = 60 * 60 * 24 * 7;

/* ----------------------------------------------------------------- selection */

// The Vercel marketplace install injects KV_REST_API_URL/TOKEN; a manual Upstash setup uses
// UPSTASH_REDIS_REST_URL/TOKEN. Accept either. MONGODB_URI (or STORE=mongo) wins over both.
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const mongoUri = process.env.MONGODB_URI;
const forced = (process.env.STORE ?? '').toLowerCase();

export const storeKind: StoreKind =
  mongoUri && (forced === 'mongo' || forced === '' || forced === 'mongodb') ? 'mongo' : url && token ? 'upstash' : 'memory';

export const store: Store =
  storeKind === 'mongo' ? mongoStore(mongoUri as string) : storeKind === 'upstash' ? upstashStore(url as string, token as string) : memoryStore;

/** Test helper: wipe the in-memory store between cases. */
export function __resetMemoryStore(): void {
  mem.clear();
  lists.clear();
}
