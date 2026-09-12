import type { ZodType } from 'zod';
import { hash } from './ids';
import { observe } from './observe';
import { mocks, MOCK_MODEL } from './mock';
import { prompts, TASKS, type TaskName, isTaskName } from './tasks';
import type { AppName, ObserveEvent, Provider } from './types';

export { TASKS, isTaskName };
export type { TaskName };

export const IFM_URL = 'https://api.ifm.ai/v1/chat/completions';
export const IFM_MODEL = 'IFM/K2-Horizon-375B-A23B';

export type Effort = 'low' | 'medium' | 'high';

export type LlmOpts<T> = {
  app: AppName;
  code?: string;
  effort?: Effort;
  maxTokens?: number;
  schema?: ZodType<T>;
};

export type LLM = {
  json<T>(task: TaskName, input: object, opts: LlmOpts<T>): Promise<{ data: T; meta: ObserveEvent }>;
};

export function provider(): Provider {
  const p = (process.env.LLM_PROVIDER ?? 'mock').toLowerCase();
  if (p === 'ifm' && process.env.IFM_API_KEY) return 'ifm';
  if (p === 'compatible' && process.env.LLM_BASE_URL) return 'compatible';
  return 'mock';
}

export function modelName(p: Provider = provider()): string {
  if (p === 'ifm') return IFM_MODEL;
  if (p === 'compatible') return process.env.LLM_MODEL || 'compatible-model';
  return MOCK_MODEL;
}

function runMock<T>(task: TaskName, input: object): T {
  const seed = hash(JSON.stringify(input ?? {}));
  return mocks[task](input as never, seed) as T;
}

type ChatResult = { text: string; tokensIn?: number; tokensOut?: number; reasoning?: string };

async function callChat(
  p: Exclude<Provider, 'mock'>,
  task: TaskName,
  input: object,
  effort: Effort,
  maxTokens?: number,
): Promise<ChatResult> {
  const prompt = prompts[task];
  const url = p === 'ifm' ? IFM_URL : `${(process.env.LLM_BASE_URL ?? '').replace(/\/$/, '')}/chat/completions`;
  const key = p === 'ifm' ? process.env.IFM_API_KEY : process.env.LLM_API_KEY;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key ?? ''}` },
    body: JSON.stringify({
      model: modelName(p),
      messages: [
        { role: 'system', content: `${prompt.system}\nReply with a single JSON object matching: ${prompt.outputShape}` },
        { role: 'user', content: JSON.stringify(input) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      reasoning_effort: effort,
      max_tokens: maxTokens ?? 2048,
    }),
  });
  if (!res.ok) throw new Error(`${p} ${res.status} ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as {
    choices?: { message?: { content?: string; reasoning_content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const msg = body.choices?.[0]?.message;
  return {
    text: msg?.content ?? '',
    reasoning: msg?.reasoning_content,
    tokensIn: body.usage?.prompt_tokens,
    tokensOut: body.usage?.completion_tokens,
  };
}

function parse(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '');
  return JSON.parse(trimmed);
}

/** One door for every model call in the platform. Attribution is never faked:
 *  meta.provider/meta.model name whichever provider actually answered. */
export const llm: LLM = {
  async json<T>(task: TaskName, input: object, opts: LlmOpts<T>) {
    const started = Date.now();
    const want = provider();
    const effort = opts.effort ?? prompts[task]?.effort ?? 'low';

    const finish = async (
      data: T,
      p: Provider,
      extra: Partial<ObserveEvent> = {},
    ): Promise<{ data: T; meta: ObserveEvent }> => {
      const meta: ObserveEvent = {
        ts: Date.now(),
        app: opts.app,
        code: opts.code,
        task,
        provider: p,
        model: modelName(p),
        latencyMs: Date.now() - started,
        ok: true,
        ...extra,
      };
      await observe.emit(meta);
      return { data, meta };
    };

    if (want === 'mock') return finish(runMock<T>(task, input), 'mock');

    let lastError = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const suffix = lastError ? { __previousError: lastError } : {};
        const out = await callChat(want, task, { ...input, ...suffix }, effort, opts.maxTokens);
        const raw = parse(out.text);
        const data = opts.schema ? opts.schema.parse(raw) : (raw as T);
        return finish(data, want, {
          tokensIn: out.tokensIn,
          tokensOut: out.tokensOut,
          reasoningExcerpt: out.reasoning?.slice(0, 280),
        });
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
    // the live provider could not answer; say so rather than pretending it did
    return finish(runMock<T>(task, input), 'mock', { fallback: true, reasoningExcerpt: lastError.slice(0, 280) });
  },
};
