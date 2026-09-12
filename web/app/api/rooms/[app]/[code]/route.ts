import { NextResponse } from 'next/server';
import { getRoom } from '@/lib/rooms';
import { now } from '@/lib/time';
import { isAppName } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/rooms/{app}/{code}?v=N -> 304 when the version is unchanged, else {doc, serverNow} */
export async function GET(req: Request, { params }: { params: Promise<{ app: string; code: string }> }) {
  const { app, code } = await params;
  if (!isAppName(app)) return NextResponse.json({ error: 'unknown app' }, { status: 400 });
  const doc = await getRoom(app, code);
  if (!doc) return NextResponse.json({ error: 'no such room' }, { status: 404 });
  const v = Number(new URL(req.url).searchParams.get('v'));
  if (Number.isFinite(v) && v === doc.version) {
    return new Response(null, { status: 304, headers: { 'x-server-now': String(now()) } });
  }
  return NextResponse.json({ doc, serverNow: now() });
}
