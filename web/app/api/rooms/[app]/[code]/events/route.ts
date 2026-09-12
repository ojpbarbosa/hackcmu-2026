import { NextResponse } from 'next/server';
import { observe } from '@/lib/observe';
import { isAppName } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/rooms/{app}/{code}/events -> ObserveEvent[] (oldest first) */
export async function GET(req: Request, { params }: { params: Promise<{ app: string; code: string }> }) {
  const { app, code } = await params;
  if (!isAppName(app)) return NextResponse.json({ error: 'unknown app' }, { status: 400 });
  const n = Number(new URL(req.url).searchParams.get('n')) || 50;
  return NextResponse.json(await observe.recent(app, code, n));
}
