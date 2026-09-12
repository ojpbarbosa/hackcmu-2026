import { NextResponse } from 'next/server';
import { debugQuerit } from '@/lib/familiars/scout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/scout/debug?q=... -> the raw Querit search + contents result, or the error text. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') || 'Pittsburgh events this weekend';
  const out = await debugQuerit(q);
  return NextResponse.json(out);
}
