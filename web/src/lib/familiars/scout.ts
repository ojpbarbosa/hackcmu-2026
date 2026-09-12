import { z } from 'zod';
import cached from './cache/pittsburgh.json';
import type { Card } from '../apps/familiars';
import type { LLM } from '../llm';

/** The familiar goes out to look for something the circle could actually do.
 *  One provider (Querit: search + fetch), one loop, and a cached fallback that
 *  says it is cached. Server only. */

const QUERIT_BASE = () => process.env.QUERIT_BASE_URL ?? 'https://api.querit.ai/v1';
const TIMEOUT_MS = 20000;

type SearchHit = { title: string; url: string; snippet: string; image?: string };

async function querit<T>(path: string, body: object): Promise<T> {
  const key = process.env.QUERIT_API_KEY;
  if (!key) throw new Error('no QUERIT_API_KEY');
  const r = await fetch(`${QUERIT_BASE().replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) {
    const text = (await r.text().catch(() => '')).slice(0, 300);
    console.error(`[querit] ${path} ${r.status} ${text}`);
    throw new Error(`querit ${path} ${r.status} ${text}`);
  }
  const json = (await r.json()) as T;
  console.log(`[querit] ${path} ${r.status} ok`, JSON.stringify(body).slice(0, 160));
  return json;
}

type QueritResult = {
  url?: string;
  title?: string;
  snippet?: string;
  page_age?: string;
  site_name?: string;
  images?: string[];
  sentence?: string[];
};

/** POST /v1/search: recent, US, English, with page images. */
async function search(query: string): Promise<SearchHit[]> {
  const body = await querit<{ results?: { result?: QueritResult[] } }>('/search', {
    query,
    count: 6,
    chunksPerDoc: 1,
    needContent: false,
    filters: {
      timeRange: { date: 'm2' },
      geo: { countries: { include: ['united states'] } },
      languages: { include: ['english'] },
      complianceScene: 'abroad',
    },
    doc: { include: { images: true } },
  });
  return (body.results?.result ?? [])
    .filter((r) => !!r.url)
    .map((r) => ({
      url: r.url as string,
      title: r.title ?? '',
      snippet: [r.snippet ?? '', r.page_age ? `(page age: ${r.page_age})` : ''].join(' ').trim(),
      image: Array.isArray(r.images) ? r.images[0] : undefined,
    }));
}

/** POST /v1/contents: one page as text, with the LLM-highlighted event details and metadata. */
async function fetchPage(url: string): Promise<{ text: string; og?: { image?: string } }> {
  const body = await querit<{
    results?: { url?: string; content?: string; highlights?: string[]; extrasMeta?: { title?: string; publishTime?: string; siteName?: string } }[];
  }>('/contents', {
    urls: [url],
    format: 'text',
    crawlTimeout: 15,
    extrasMeta: true,
    highlights: { query: 'event date, time, venue, address, price, how to attend', maxCharacters: 2500 },
  });
  const r = body.results?.[0];
  const meta = r?.extrasMeta ? `Title: ${r.extrasMeta.title ?? ''}\nPublished: ${r.extrasMeta.publishTime ?? ''}\nSite: ${r.extrasMeta.siteName ?? ''}\n` : '';
  const high = r?.highlights?.length ? `Highlights:\n${r.highlights.join('\n')}\n\n` : '';
  return { text: `${meta}${high}${r?.content ?? ''}` };
}

const PlanOut = z.object({ queries: z.array(z.string()).min(1).max(3) });
const ExtractOut = z.object({
  title: z.string(),
  whenISO: z.string().nullable(),
  where: z.string(),
  cost: z.string(),
  kind: z.enum(['listed_event', 'self_organized']),
});
const FitOut = z.object({
  cards: z
    .array(z.object({ title: z.string(), whenISO: z.string(), where: z.string(), cost: z.string(), why: z.string() }))
    .min(1),
});

const CACHED_STATUS = ['Searching…', 'Reading 3 pages', 'Using cached results'];

function cachedCards(): Card[] {
  return (cached.cards as Card[]).map((c) => ({ ...c, cached: true }));
}

/** true when the date is real and lands in the next ten days. */
function soon(iso: string | null, now: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) && t > now - 12 * 60 * 60 * 1000 && t < now + 10 * 24 * 60 * 60 * 1000;
}

export async function runScout(
  brief: string,
  circle: { keywords: string[] },
  llm: LLM,
  ctx: { app: 'familiars'; code?: string },
): Promise<{ cards: Card[]; status: string[] }> {
  const now = Date.now();
  const keywords = circle.keywords.filter(Boolean).slice(0, 6);
  const status: string[] = [];

  try {
    if (!process.env.QUERIT_API_KEY) throw new Error('no QUERIT_API_KEY');

    const plan = await llm.json('scout.plan', { brief, keywords, city: 'Pittsburgh' }, {
      app: ctx.app,
      code: ctx.code,
      schema: PlanOut,
      effort: 'low',
      maxTokens: 600,
    });
    status.push('Searching…');

    const hits: SearchHit[] = [];
    const seen = new Set<string>();
    for (const q of plan.data.queries.slice(0, 3)) {
      for (const h of await search(q)) {
        if (!h?.url || seen.has(h.url)) continue;
        seen.add(h.url);
        hits.push(h);
      }
    }
    const top = hits.slice(0, 4);
    console.log('[scout] plan', JSON.stringify(plan.data.queries), 'hits', top.length);
    status.push(`Reading ${top.length} pages`);

    const pages = await Promise.all(
      top.map(async (h) => {
        try {
          return { hit: h, page: await fetchPage(h.url) };
        } catch (e) {
          console.error('[scout] contents failed', h.url, String(e).slice(0, 200));
          return null;
        }
      }),
    );

    const cards: Card[] = [];
    for (const p of pages) {
      if (!p) continue;
      try {
        const out = await llm.json(
          'scout.extract',
          { url: p.hit.url, title: p.hit.title, text: p.page.text.slice(0, 3000) },
          { app: ctx.app, code: ctx.code, schema: ExtractOut, effort: 'low', maxTokens: 800 },
        );
        const d = out.data;
        if (!d.title.trim() || !soon(d.whenISO, now)) continue;
        cards.push({
          id: `card_${cards.length}_${Math.abs(Date.parse(d.whenISO ?? '') || cards.length)}`,
          title: d.title.trim(),
          whenISO: d.whenISO,
          where: d.where,
          cost: d.cost,
          kind: 'listed_event',
          source: p.hit.url,
          image: p.page.og?.image ?? p.hit.image,
          why: p.hit.snippet?.slice(0, 90) ?? `Close to ${keywords[0] ?? 'what you all said'}.`,
        });
      } catch (e) {
        console.error('[scout] extract failed', p.hit.url, String(e).slice(0, 200));
      }
      if (cards.length === 3) break;
    }

    if (cards.length < 3) {
      const need = 3 - cards.length;
      const fit = await llm.json('scout.fit', { keywords, city: 'Pittsburgh', brief, need }, {
        app: ctx.app,
        code: ctx.code,
        schema: FitOut,
        effort: 'low',
        maxTokens: 1000,
      });
      for (const c of fit.data.cards.slice(0, need)) {
        cards.push({
          id: `fit_${cards.length}_${c.title.length}`,
          title: c.title,
          whenISO: c.whenISO,
          where: c.where,
          cost: c.cost,
          kind: 'self_organized',
          why: c.why,
        });
      }
    }

    status.push('Choosing three');
    return { cards: cards.slice(0, 3), status };
  } catch (e) {
    // no key, no provider, or the provider fell over: say it is cached, never pretend
    const msg = String(e instanceof Error ? e.message : e).slice(0, 160);
    console.error('[scout] fallback to cached:', msg);
    return { cards: cachedCards(), status: [...status, `Search failed: ${msg}`, 'Using cached results'] };
  }
}

/** For /api/scout/debug?raw=…: POST any body to /search and return status + text. */
export async function rawQuerit(path: string, body: unknown): Promise<{ status: number; text: string }> {
  const key = process.env.QUERIT_API_KEY ?? '';
  const r = await fetch(`${QUERIT_BASE().replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { status: r.status, text: (await r.text()).slice(0, 1200) };
}

/** For /api/scout/debug: the raw provider calls, so a failure is visible without logs. */
export async function debugQuerit(q: string): Promise<{ keyPresent: boolean; base: string; search?: unknown; contents?: unknown; error?: string }> {
  const out: { keyPresent: boolean; base: string; search?: unknown; contents?: unknown; error?: string } = {
    keyPresent: !!process.env.QUERIT_API_KEY,
    base: QUERIT_BASE(),
  };
  try {
    const hits = await search(q);
    out.search = hits.slice(0, 3);
    if (hits[0]) {
      const page = await fetchPage(hits[0].url);
      out.contents = { url: hits[0].url, chars: page.text.length, head: page.text.slice(0, 400) };
    }
  } catch (e) {
    out.error = String(e instanceof Error ? e.message : e).slice(0, 400);
  }
  return out;
}
