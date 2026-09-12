import { NextResponse } from 'next/server';
import { debugQuerit, rawQuerit } from '@/lib/familiars/scout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/scout/debug?q=... -> the raw Querit search + contents result, or the error text. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get('raw');
  if (raw) {
    try {
      return NextResponse.json(await rawQuerit(url.searchParams.get('path') || '/search', JSON.parse(raw)));
    } catch (e) {
      return NextResponse.json({ error: String(e).slice(0, 300) });
    }
  }
  const q = url.searchParams.get('q') || 'Pittsburgh events this weekend';
  const out = await debugQuerit(q);
  return NextResponse.json(out);
}
