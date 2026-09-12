import { NextResponse } from 'next/server';
import { modelName, provider } from '@/lib/llm';
import { store, storeKind } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /health -> {ok, provider, model, store, rooms} */
export async function GET() {
  let rooms = 0;
  try {
    rooms = (await store.keys('room:')).length;
  } catch {
    /* a store that cannot list keys still serves rooms */
  }
  return NextResponse.json({
    ok: true,
    provider: provider(),
    model: modelName(),
    store: storeKind,
    rooms,
  });
}
