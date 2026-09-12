import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { llm, modelName, provider } from '@/lib/llm';
import { observe } from '@/lib/observe';
import { __resetMemoryStore } from '@/lib/store';
import { TASKS, prompts } from '@/lib/tasks';
import { mocks } from '@/lib/mock';

beforeEach(() => __resetMemoryStore());

describe('llm with LLM_PROVIDER=mock', () => {
  it('defaults to the mock provider when no key is set', () => {
    expect(provider()).toBe('mock');
    expect(modelName()).toBe('mock-deterministic');
  });

  it('returns a prompt and emits exactly one event', async () => {
    const { data, meta } = await llm.json<{ prompt: string; reasons: string[] }>(
      'cast.prompt',
      { members: [{ id: 'm1', name: 'Maya' }], history: [], mode: 'fishing' },
      { app: 'cast', code: 'ABCDE' },
    );
    expect(typeof data.prompt).toBe('string');
    expect(data.prompt.length).toBeGreaterThan(0);
    expect(data.reasons).toHaveLength(3);
    expect(meta.provider).toBe('mock');
    expect(meta.ok).toBe(true);
    expect(meta.fallback).toBeUndefined();

    const events = await observe.recent('cast', 'ABCDE');
    expect(events).toHaveLength(1);
    expect(events[0].task).toBe('cast.prompt');
  });

  it('is deterministic for the same input', async () => {
    const input = { members: [], history: [], mode: 'fishing' };
    const a = await llm.json<{ prompt: string }>('cast.prompt', input, { app: 'cast' });
    const b = await llm.json<{ prompt: string }>('cast.prompt', input, { app: 'cast' });
    expect(a.data.prompt).toBe(b.data.prompt);
  });

  it('validates against a zod schema when one is given', async () => {
    const schema = z.object({ nudges: z.array(z.string()) });
    const { data } = await llm.json('detour.nudges', { legs: [{}, {}, {}], mood: 'quiet' }, { app: 'detour', schema });
    expect(data.nudges).toHaveLength(3);
  });

  it('records events globally as well as per room', async () => {
    await llm.json('palate.profile', { lovedDishes: ['massaman curry'], never: [] }, { app: 'palate', code: 'ZZZZZ' });
    expect(await observe.recent()).toHaveLength(1);
    expect(await observe.recent('palate', 'ZZZZZ')).toHaveLength(1);
    expect(await observe.recent('cast', 'ZZZZZ')).toHaveLength(0);
  });

  it('has a prompt and a mock for every task', () => {
    for (const t of TASKS) {
      expect(prompts[t], t).toBeTruthy();
      expect(prompts[t].outputShape, t).toMatch(/^\{/);
      expect(typeof mocks[t], t).toBe('function');
    }
  });

  it('every mock returns an object for empty input', async () => {
    for (const t of TASKS) {
      const { data } = await llm.json(t, {}, { app: 'cast' });
      expect(typeof data, t).toBe('object');
      expect(data, t).not.toBeNull();
    }
  });
});
