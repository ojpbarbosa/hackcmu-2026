import { beforeEach, describe, expect, it } from 'vitest';
import { store, storeKind, __resetMemoryStore } from '@/lib/store';

beforeEach(() => __resetMemoryStore());

describe('memory store', () => {
  it('defaults to memory with no upstash env', () => {
    expect(storeKind).toBe('memory');
  });

  it('round-trips a value', async () => {
    await store.set('k', { a: 1 });
    expect(await store.get<{ a: number }>('k')).toEqual({ a: 1 });
  });

  it('returns null for a missing key', async () => {
    expect(await store.get('nope')).toBeNull();
  });

  it('stores a copy, not a reference', async () => {
    const v = { n: 1 };
    await store.set('k', v);
    v.n = 2;
    expect(await store.get<{ n: number }>('k')).toEqual({ n: 1 });
  });

  it('deletes', async () => {
    await store.set('k', 1);
    await store.del('k');
    expect(await store.get('k')).toBeNull();
  });

  it('lpush keeps newest first and caps the list', async () => {
    for (let i = 0; i < 5; i++) await store.lpush('l', { i }, 3);
    expect(await store.lrange<{ i: number }>('l', 10)).toEqual([{ i: 4 }, { i: 3 }, { i: 2 }]);
  });

  it('lists keys by prefix', async () => {
    await store.set('room:cast:AAAAA', 1);
    await store.set('room:cast:BBBBB', 1);
    await store.set('other', 1);
    expect((await store.keys('room:cast:')).sort()).toEqual(['room:cast:AAAAA', 'room:cast:BBBBB']);
  });

  it('honours a ttl', async () => {
    await store.set('k', 1, -1);
    expect(await store.get('k')).toBeNull();
  });
});
