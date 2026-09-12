import { NextResponse } from 'next/server';
import { act } from '@/lib/rooms';
import { now } from '@/lib/time';
import { isAppName } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/rooms/{app}/{code}/act {name, payload, memberId} -> {doc, serverNow} */
export async function POST(req: Request, { params }: { params: Promise<{ app: string; code: string }> }) {
  const { app, code } = await params;
  if (!isAppName(app)) return NextResponse.json({ error: 'unknown app' }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { name?: string; payload?: unknown; memberId?: string };
  if (!body.name) return NextResponse.json({ error: 'missing action name' }, { status: 400 });
  try {
    const doc = await act(app, code, {
      name: body.name,
      payload: body.payload,
      memberId: body.memberId ?? '',
      now: now(),
    });
    return NextResponse.json({ doc, serverNow: now() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
