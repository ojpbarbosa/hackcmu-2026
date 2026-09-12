/** Shared types for the whole platform. App agents import from '@/lib/types'. */

export type AppName = 'cast' | 'familiars' | 'detour' | 'palate';

export const APP_NAMES: AppName[] = ['cast', 'familiars', 'detour', 'palate'];

/** Short accent key used by the UI kit (Screen's `app` prop) and by tokens.css. */
export type AppKey = 'cast' | 'fam' | 'det' | 'pal';

export const APP_KEY: Record<AppName, AppKey> = {
  cast: 'cast',
  familiars: 'fam',
  detour: 'det',
  palate: 'pal',
};

export type Member = {
  id: string;
  name: string;
  tone: 1 | 2 | 3 | 4;
  joinedAt: number;
  lastSeen: number;
  seat?: string;
};

export type RoomDoc<S = unknown> = {
  app: AppName;
  code: string;
  version: number;
  createdAt: number;
  members: Record<string, Member>;
  state: S;
};

export type Provider = 'ifm' | 'compatible' | 'mock';

export type ObserveEvent = {
  ts: number;
  app: AppName;
  code?: string;
  task: string;
  provider: Provider;
  model: string;
  latencyMs: number;
  tokensIn?: number;
  tokensOut?: number;
  reasoningExcerpt?: string;
  ok: boolean;
  fallback?: boolean;
};

export function isAppName(v: unknown): v is AppName {
  return typeof v === 'string' && (APP_NAMES as string[]).includes(v);
}
