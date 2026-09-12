import { apps } from './apps';
import { makeCode } from './ids';
import { llm, type LLM } from './llm';
import { store } from './store';
import { now } from './time';
import type { AppName, Member, RoomDoc } from './types';

export type Action = {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reducers own their payload shape
  payload?: any;
  memberId: string;
  now: number;
};

export type Ctx = {
  app: AppName;
  code: string;
  llm: LLM;
  members: Record<string, Member>;
};

export type AppDef<S> = {
  initial: (code: string) => S;
  reduce: (state: S, action: Action, ctx: Ctx) => Promise<S> | S;
  onJoin?: (state: S, m: Member) => S;
};

const TTL_SEC = 60 * 60 * 12;
export const roomKey = (app: AppName, code: string) => `room:${app}:${code}`;

function def(app: AppName): AppDef<unknown> {
  const d = apps[app];
  if (!d) throw new Error(`unknown app: ${app}`);
  return d as AppDef<unknown>;
}

export async function createRoom(app: AppName, code?: string): Promise<RoomDoc> {
  const c = (code ?? makeCode()).toUpperCase();
  const existing = await getRoom(app, c);
  if (existing) return existing;
  const doc: RoomDoc = { app, code: c, version: 1, createdAt: now(), members: {}, state: def(app).initial(c) };
  await store.set(roomKey(app, c), doc, TTL_SEC);
  return doc;
}

export async function getRoom(app: AppName, code: string): Promise<RoomDoc | null> {
  return store.get<RoomDoc>(roomKey(app, code.toUpperCase()));
}

export async function listRooms(): Promise<string[]> {
  return store.keys('room:');
}

function upsertMember(doc: RoomDoc, m: Omit<Member, 'joinedAt' | 'lastSeen'>): Member {
  const t = now();
  const prev = doc.members[m.id];
  const member: Member = {
    ...prev,
    ...m,
    joinedAt: prev?.joinedAt ?? t,
    lastSeen: t,
  };
  doc.members[m.id] = member;
  return member;
}

export async function joinRoom(app: AppName, code: string, m: Omit<Member, 'joinedAt' | 'lastSeen'>): Promise<RoomDoc> {
  const c = code.toUpperCase();
  for (let i = 0; i < 3; i++) {
    const doc = (await getRoom(app, c)) ?? (await createRoom(app, c));
    const before = doc.version;
    const member = upsertMember(doc, m);
    const d = def(app);
    if (d.onJoin) doc.state = d.onJoin(doc.state, member);
    doc.version = before + 1;
    const current = await getRoom(app, c);
    if (current && current.version !== before) continue;
    await store.set(roomKey(app, c), doc, TTL_SEC);
    return doc;
  }
  throw new Error('joinRoom: version conflict');
}

/** load → reduce → version+1 → save. Retries three times on a version conflict. */
export async function act(app: AppName, code: string, action: Action): Promise<RoomDoc> {
  const c = code.toUpperCase();
  let lastError: unknown = null;
  for (let i = 0; i < 3; i++) {
    const doc = (await getRoom(app, c)) ?? (await createRoom(app, c));
    const before = doc.version;

    if (action.name === 'join' && action.payload) {
      const member = upsertMember(doc, action.payload as Omit<Member, 'joinedAt' | 'lastSeen'>);
      const d = def(app);
      if (d.onJoin) doc.state = d.onJoin(doc.state, member);
    } else {
      const m = doc.members[action.memberId];
      if (m) m.lastSeen = now();
      const ctx: Ctx = { app, code: c, llm, members: doc.members };
      try {
        doc.state = await def(app).reduce(doc.state, action, ctx);
      } catch (e) {
        lastError = e;
        throw e;
      }
    }

    doc.version = before + 1;
    const current = await getRoom(app, c);
    if (current && current.version !== before) continue;
    await store.set(roomKey(app, c), doc, TTL_SEC);
    return doc;
  }
  throw (lastError as Error) ?? new Error('act: version conflict');
}
