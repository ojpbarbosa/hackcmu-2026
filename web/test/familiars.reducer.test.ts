import { beforeEach, describe, expect, it } from 'vitest';
import type { FamState } from '@/lib/apps/familiars';
import { recordBump } from '@/lib/bump';
import { act, getRoom } from '@/lib/rooms';
import { __resetMemoryStore } from '@/lib/store';

const CODE = 'FAMTEST';
const now = () => Date.now();

const hatch = (memberId: string, seeds: string[], name: string, seat: string) =>
  act('familiars', CODE, {
    name: 'hatch',
    payload: { seeds, human: { name, seat } },
    memberId,
    now: now(),
  });

const stateOf = async (code = CODE): Promise<FamState> => {
  const doc = await getRoom('familiars', code);
  return doc!.state as FamState;
};

beforeEach(() => __resetMemoryStore());

describe('familiars reducer', () => {
  it('hatches a familiar with a three-character address and a cluster', async () => {
    await hatch('m1', ['I build synths at 3 am', 'Recife, then Pittsburgh', 'Night owl, obviously'], 'Joao', '2nd floor');
    const s = await stateOf();
    const me = s.familiars.m1;
    expect(me).toBeDefined();
    expect(me.name).toMatch(/^[a-z0-9-]+$/);
    expect(me.address).toMatch(/^[A-Z2-9]{3}$/);
    expect(me.seeds).toHaveLength(3);
    expect(me.keywords.length).toBeGreaterThan(0);
    expect(me.human).toEqual({ name: 'Joao', seat: '2nd floor' });
    expect(me.clusterId).toBeTruthy();
    const cluster = s.clusters.find((c) => c.id === me.clusterId);
    expect(cluster?.members).toContain('m1');
    expect(cluster?.color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('gives every familiar in the room a different address', async () => {
    await hatch('m1', ['synths', 'Recife', 'night owl'], 'Joao', 'a');
    await hatch('m2', ['bread', 'Lagos', 'early riser'], 'Ana', 'b');
    await hatch('m3', ['shaders', 'Seoul', 'quiet'], 'Kai', 'c');
    const s = await stateOf();
    const addresses = Object.values(s.familiars).map((f) => f.address);
    expect(new Set(addresses).size).toBe(3);
  });

  it('refuses a second hatch from the same member and needs three seeds', async () => {
    await hatch('m1', ['synths', 'Recife', 'night owl'], 'Joao', 'a');
    const first = (await stateOf()).familiars.m1;
    await hatch('m1', ['other', 'answers', 'entirely'], 'Joao', 'a');
    expect((await stateOf()).familiars.m1).toEqual(first);

    await hatch('m9', ['only', 'two'], 'Nobody', 'z');
    expect((await stateOf()).familiars.m9).toBeUndefined();
  });

  it('creates one bump with four dialogue lines when two phones pair', async () => {
    await hatch('m1', ['I build synths at 3 am', 'Recife, then Pittsburgh', 'Night owl'], 'Joao', '2nd floor');
    await hatch('m2', ['I cook for eight', 'Lagos, then Pittsburgh', 'Reads menus for fun'], 'Ana', 'by the windows');

    await act('familiars', CODE, {
      name: 'bumpPaired',
      payload: { pairId: 'pair_1', a: 'm1', b: 'm2' },
      memberId: 'm2',
      now: now(),
    });

    const s = await stateOf();
    expect(s.bumps).toHaveLength(1);
    const bump = s.bumps[0];
    expect(bump.dialogue).toHaveLength(4);
    expect(bump.dialogue.map((d) => d.who)).toEqual(['a', 'b', 'a', 'b']);
    expect(bump.dialogue.every((d) => d.text.length > 0)).toBe(true);
    expect(bump.youBoth.length).toBeGreaterThan(0);
    expect(bump.suggestion.length).toBeGreaterThan(0);
  });

  it('never writes the same pair twice and ignores unknown members', async () => {
    await hatch('m1', ['synths', 'Recife', 'night owl'], 'Joao', 'a');
    await hatch('m2', ['bread', 'Lagos', 'early riser'], 'Ana', 'b');
    const payload = { pairId: 'pair_1', a: 'm1', b: 'm2' };
    await act('familiars', CODE, { name: 'bumpPaired', payload, memberId: 'm2', now: now() });
    await act('familiars', CODE, { name: 'bumpPaired', payload, memberId: 'm2', now: now() });
    expect((await stateOf()).bumps).toHaveLength(1);

    await act('familiars', CODE, {
      name: 'bumpPaired',
      payload: { pairId: 'pair_2', a: 'm1', b: 'ghost' },
      memberId: 'm1',
      now: now(),
    });
    expect((await stateOf()).bumps).toHaveLength(1);
  });

  it('pairs by address as the fallback path', async () => {
    await hatch('m1', ['synths', 'Recife', 'night owl'], 'Joao', 'a');
    await hatch('m2', ['bread', 'Lagos', 'early riser'], 'Ana', 'b');
    const other = (await stateOf()).familiars.m2;

    await act('familiars', CODE, {
      name: 'bumpByAddress',
      payload: { address: other.address.toLowerCase() },
      memberId: 'm1',
      now: now(),
    });
    const s = await stateOf();
    expect(s.bumps).toHaveLength(1);
    expect([s.bumps[0].a, s.bumps[0].b].sort()).toEqual(['m1', 'm2']);

    // keying it again does not duplicate the meeting
    await act('familiars', CODE, {
      name: 'bumpByAddress',
      payload: { address: other.address },
      memberId: 'm1',
      now: now(),
    });
    expect((await stateOf()).bumps).toHaveLength(1);
  });

  it('runs end to end from the /api/bump pairing path', async () => {
    await hatch('m1', ['I build synths at 3 am', 'Recife', 'Night owl'], 'Joao', '2nd floor');
    await hatch('m2', ['I cook for eight', 'Lagos', 'Reads menus'], 'Ana', 'by the windows');
    const t = Date.now();
    await recordBump({ app: 'familiars', code: CODE, memberId: 'm1', at: t, magnitude: 18 });
    const second = await recordBump({ app: 'familiars', code: CODE, memberId: 'm2', at: t + 200, magnitude: 19 });
    expect(second.matched?.withMemberId).toBe('m1');

    const s = await stateOf();
    expect(s.bumps).toHaveLength(1);
    expect(s.bumps[0].id).toBe(second.matched?.pairId);
    expect(s.bumps[0].dialogue).toHaveLength(4);
  });

  it('writes a three-card story for a member who has bumped', async () => {
    await hatch('m1', ['synths', 'Recife', 'night owl'], 'Joao', 'a');
    await hatch('m2', ['bread', 'Lagos', 'early riser'], 'Ana', 'b');
    await act('familiars', CODE, { name: 'bumpPaired', payload: { pairId: 'p1', a: 'm1', b: 'm2' }, memberId: 'm1', now: now() });
    await act('familiars', CODE, { name: 'story', memberId: 'm1', now: now() });

    const s = await stateOf();
    expect(s.stories.m1.cards).toHaveLength(3);
    expect(s.stories.m1.cards[0].text.length).toBeGreaterThan(0);
    expect(s.stories.m1.at).toBeGreaterThan(0);
  });

  it('seeds a demo village with familiars, clusters and bumps', async () => {
    await act('familiars', 'FAMDEMO', { name: 'seedDemo', payload: { n: 40 }, memberId: 'm1', now: now() });
    const s = await stateOf('FAMDEMO');
    expect(Object.keys(s.familiars)).toHaveLength(40);
    expect(Object.values(s.familiars).every((f) => f.demo)).toBe(true);
    expect(new Set(Object.values(s.familiars).map((f) => f.address)).size).toBe(40);
    expect(s.clusters.length).toBeGreaterThan(1);
    expect(s.clusters.length).toBeLessThanOrEqual(8);
    expect(s.bumps.length).toBeGreaterThan(10);
    expect(s.bumps.every((b) => b.dialogue.length === 4)).toBe(true);

    // a full room is not seeded twice
    await act('familiars', 'FAMDEMO', { name: 'seedDemo', payload: { n: 40 }, memberId: 'm1', now: now() });
    expect(Object.keys((await stateOf('FAMDEMO')).familiars)).toHaveLength(40);
  });

  it('never grows past eight clusters', async () => {
    for (let i = 0; i < 14; i++) {
      await hatch(`m${i}`, [`I build thing number ${i}`, `city ${i}`, `truth ${i}`], `H${i}`, 'somewhere');
    }
    const s = await stateOf();
    expect(s.clusters.length).toBeLessThanOrEqual(8);
    expect(Object.values(s.familiars).every((f) => f.clusterId)).toBe(true);
  });
});
