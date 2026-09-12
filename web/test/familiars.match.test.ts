import { describe, expect, it } from 'vitest';
import {
  addressFor,
  auraFor,
  bumpedIds,
  gotAway,
  matchScore,
  sharedKeywords,
  statsFor,
  type Bump,
  type FamState,
  type Familiar,
} from '@/lib/apps/familiars';

const fam = (id: string, keywords: string[], clusterId: string | null = null): Familiar => ({
  id,
  name: id,
  address: id.toUpperCase().slice(0, 3),
  aura: auraFor(id),
  seeds: ['a', 'b', 'c'],
  keywords,
  human: { name: id, seat: 'somewhere' },
  clusterId,
  createdAt: 0,
});

const bump = (a: string, b: string): Bump => ({
  id: `${a}-${b}`,
  a,
  b,
  at: 0,
  dialogue: [],
  youBoth: '',
  suggestion: '',
});

const st = (familiars: Familiar[], bumps: Bump[] = []): FamState => ({
  code: 'X',
  familiars: Object.fromEntries(familiars.map((f) => [f.id, f])),
  bumps,
  clusters: [],
  stories: {},
});

describe('matchScore', () => {
  it('is 1 for identical keyword sets and 0 for disjoint ones', () => {
    expect(matchScore(fam('a', ['synths', 'night']), fam('b', ['synths', 'night']))).toBe(1);
    expect(matchScore(fam('a', ['synths']), fam('b', ['bread']))).toBe(0);
  });

  it('is the Jaccard overlap, case-insensitive', () => {
    // {synths, night} vs {Synths, bread} → 1 shared of 3 → 1/3
    expect(matchScore(fam('a', ['synths', 'night']), fam('b', ['Synths', 'bread']))).toBeCloseTo(1 / 3, 5);
  });

  it('adds a bonus for sharing a cluster and never passes 1', () => {
    const plain = matchScore(fam('a', ['synths', 'night']), fam('b', ['synths', 'bread']));
    const same = matchScore(fam('a', ['synths', 'night'], 'cl1'), fam('b', ['synths', 'bread'], 'cl1'));
    expect(same - plain).toBeCloseTo(0.15, 5);
    expect(matchScore(fam('a', ['synths'], 'cl1'), fam('b', ['synths'], 'cl1'))).toBe(1);
  });

  it('reports the keywords two familiars share', () => {
    expect(sharedKeywords(fam('a', ['synths', 'night', 'recife']), fam('b', ['Synths', 'Recife']))).toEqual([
      'synths',
      'recife',
    ]);
  });
});

describe('gotAway', () => {
  const me = fam('me', ['synths', 'night', 'recife'], 'cl1');
  const close = fam('close', ['synths', 'night', 'lagos'], 'cl1');
  const far = fam('far', ['bread'], 'cl2');

  it('returns the highest scoring familiar nobody bumped', () => {
    const got = gotAway(st([me, close, far]), 'me');
    expect(got?.id).toBe('close');
    expect(got?.score).toBeGreaterThan(0.5);
  });

  it('never returns someone already bumped', () => {
    const got = gotAway(st([me, close, far], [bump('me', 'close')]), 'me');
    expect(got?.id).toBe('far');
  });

  it('returns null when there is nobody left, and never returns you', () => {
    expect(gotAway(st([me]), 'me')).toBeNull();
    expect(gotAway(st([me, close], [bump('close', 'me')]), 'me')?.id).toBeUndefined();
    expect(gotAway(st([me, close, far]), 'nobody')).toBeNull();
  });
});

describe('room arithmetic', () => {
  it('counts distinct contacts, bumps and clusters touched', () => {
    const state = st(
      [fam('me', ['x'], 'cl1'), fam('a', ['y'], 'cl2'), fam('b', ['z'], 'cl2')],
      [bump('me', 'a'), bump('a', 'me'), bump('b', 'me'), bump('a', 'b')],
    );
    expect(bumpedIds(state, 'me')).toEqual(new Set(['a', 'b']));
    expect(statsFor(state, 'me')).toEqual({ contacts: 2, bumps: 3, clusters: 2 });
  });
});

describe('addresses', () => {
  it('is three characters from the unambiguous alphabet and stable per member', () => {
    const a = addressFor('m_abc', new Set());
    expect(a).toMatch(/^[A-Z2-9]{3}$/);
    expect(a).not.toMatch(/[IO01]/);
    expect(addressFor('m_abc', new Set())).toBe(a);
  });

  it('steps aside when the address is taken', () => {
    const a = addressFor('m_abc', new Set());
    expect(addressFor('m_abc', new Set([a]))).not.toBe(a);
  });
});
