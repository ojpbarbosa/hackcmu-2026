import { NextResponse } from 'next/server';
import { bumpStatus, recordBump } from '@/lib/bump';
import { isAppName } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/bump {app, code, memberId, at, magnitude} -> {bumpId, matched?} */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    app?: string;
    code?: string;
    memberId?: string;
    at?: number;
    magnitude?: number;
  };
  if (!isAppName(body.app)) return NextResponse.json({ error: 'unknown app' }, { status: 400 });
  if (!body.code || !body.memberId) return NextResponse.json({ error: 'missing code or memberId' }, { status: 400 });
  const res = await recordBump({
    app: body.app,
    code: body.code,
    memberId: body.memberId,
    at: typeof body.at === 'number' ? body.at : Date.now(),
    magnitude: typeof body.magnitude === 'number' ? body.magnitude : 0,
  });
  return NextResponse.json(res);
}

/** GET /api/bump?bumpId= -> {matched?} */
export async function GET(req: Request) {
  const bumpId = new URL(req.url).searchParams.get('bumpId');
  if (!bumpId) return NextResponse.json({ error: 'missing bumpId' }, { status: 400 });
  return NextResponse.json(await bumpStatus(bumpId));
}
