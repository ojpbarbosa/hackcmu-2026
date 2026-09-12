import { NextResponse } from 'next/server';
import { llm } from '@/lib/llm';
import { isTaskName } from '@/lib/tasks';
import { isAppName } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** POST /api/llm/{task} {input, app, code} -> {data, meta}. For dev and smoke tests;
 *  app code normally calls llm.json() from inside a reducer. */
export async function POST(req: Request, { params }: { params: Promise<{ task: string }> }) {
  const { task } = await params;
  if (!isTaskName(task)) return NextResponse.json({ error: `unknown task: ${task}` }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { input?: object; app?: string; code?: string };
  const app = isAppName(body.app) ? body.app : task.split('.')[0];
  if (!isAppName(app)) return NextResponse.json({ error: 'unknown app' }, { status: 400 });
  const { data, meta } = await llm.json(task, body.input ?? {}, { app, code: body.code });
  return NextResponse.json({ data, meta });
}
