import type { CastCast, CastPlan, CastState } from '@/lib/apps/cast';
import type { Member } from '@/lib/types';

export type Tone = 1 | 2 | 3 | 4;
export type Person = { id: string; name: string; tone: Tone; live: boolean };

/** Projector views join so they can poll; they are never part of the circle. */
export const isViewer = (id: string): boolean => id.startsWith('stage-');

export const circle = (members: Member[]): Member[] =>
  members.filter((m) => !isViewer(m.id)).sort((a, b) => a.joinedAt - b.joinedAt);

export function personOf(state: CastState | null, members: Member[], id: string): Person {
  const m = members.find((x) => x.id === id);
  if (m) return { id, name: m.name, tone: (m.tone ?? 1) as Tone, live: true };
  const g = state?.ghosts?.[id];
  return { id, name: g?.name ?? 'someone', tone: g?.tone ?? 1, live: false };
}

/** Everyone whose answer belongs on this cast: the live circle, plus the authors
 *  of a seeded cast. `me` always sits first, as in the mockup. */
export function castPeople(state: CastState | null, members: Member[], cast: CastCast | null, me: string): Person[] {
  if (!cast) return circle(members).map((m) => personOf(state, members, m.id));
  const ids = cast.seeded
    ? Object.keys(cast.answers)
    : [...circle(members).map((m) => m.id), ...Object.keys(cast.answers)];
  const seen = new Set<string>();
  const people = ids
    .filter((id) => (seen.has(id) ? false : (seen.add(id), true)))
    .map((id) => personOf(state, members, id));
  return people.sort((a, b) => (a.id === me ? -1 : b.id === me ? 1 : 0));
}

export const latestCast = (state: CastState | null): CastCast | null =>
  state?.casts.find((c) => !c.seeded) ?? state?.casts[0] ?? null;

/** The cast that is still waiting on answers, if there is one. */
export function openCast(state: CastState | null): CastCast | null {
  const c = state?.casts[0];
  return c && !c.seeded && c.revealedAt === null ? c : null;
}

export const castById = (state: CastState | null, id: string | null): CastCast | null =>
  (id ? state?.casts.find((c) => c.id === id) : null) ?? null;

export const planFor = (state: CastState | null, castId: string | undefined): CastPlan | null =>
  (castId ? state?.plans.find((p) => p.castId === castId) : null) ?? null;

export const openPlan = (state: CastState | null): CastPlan | null =>
  planFor(state, latestCast(state)?.id) ?? state?.plans[0] ?? null;

export function answeredCount(cast: CastCast | null, members: Member[]): { n: number; of: number } {
  if (!cast) return { n: 0, of: circle(members).length };
  if (cast.seeded) return { n: Object.keys(cast.answers).length, of: 4 };
  const ids = circle(members).map((m) => m.id);
  return { n: ids.filter((id) => cast.answers[id]).length, of: ids.length };
}

export const isTyping = (state: CastState | null, id: string, now: number): boolean =>
  !!state?.typing?.[id] && now - state.typing[id] < 5_000;

/* --------------------------------------------------------------- formatting */

export function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const hhmm = (ts: number): string =>
  new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

export const dayLabel = (ts: number): string =>
  new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function whenLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  return `${day} · ${time}`;
}

const stamp = (d: Date): string => `${d.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;

/** A calendar file the phone can actually open, built in the browser. */
export function icsFor(plan: CastPlan, circleName: string): string {
  const start = new Date(plan.whenISO);
  const end = new Date(start.getTime() + 2 * 3_600_000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//cast//hackcmu 2026//EN',
    'BEGIN:VEVENT',
    `UID:${plan.id}@cast`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${plan.venue} — ${circleName}`,
    `LOCATION:${plan.venue}`,
    `DESCRIPTION:${plan.title}. ${plan.why}`.replace(/\n/g, ' '),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(plan: CastPlan, circleName: string): void {
  const blob = new Blob([icsFor(plan, circleName)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${plan.venue.toLowerCase().replace(/\s+/g, '-')}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2_000);
}
