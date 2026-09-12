import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Speech to text for the hatch screen. Without a key the answer is an honest
 *  empty transcript and provider 'none', and the client shows a text field. */
export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  const form = await req.formData();
  const audio = form.get('audio');
  if (!key || !(audio instanceof Blob)) return NextResponse.json({ text: '', provider: 'none' });

  const fd = new FormData();
  fd.append('file', audio, 'chunk.webm');
  fd.append('model_id', 'scribe_v1');
  fd.append('language_code', 'en');

  try {
    const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': key },
      body: fd,
    });
    if (!r.ok) return NextResponse.json({ text: '', provider: 'none', error: r.status });
    const body = (await r.json()) as { text?: string };
    return NextResponse.json({ text: body.text ?? '', provider: 'elevenlabs' });
  } catch {
    return NextResponse.json({ text: '', provider: 'none' });
  }
}
