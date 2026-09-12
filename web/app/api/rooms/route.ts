import { NextResponse } from 'next/server';
import { createRoom } from '@/lib/rooms';
import { isAppName } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/rooms {app, code?} -> RoomDoc */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { app?: string; code?: string };
  if (!isAppName(body.app)) return NextResponse.json({ error: 'unknown app' }, { status: 400 });
  const doc = await createRoom(body.app, body.code);
  return NextResponse.json(doc);
}
