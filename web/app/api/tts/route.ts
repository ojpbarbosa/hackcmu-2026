export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Eight premade ElevenLabs voices, one per creature hue. */
const VOICES = [
  '21m00Tcm4TlvDq8ikWAM', // Rachel
  'pNInz6obpgDQGcFmaJgB', // Adam
  'EXAVITQu4vr4xnSDxMaL', // Bella
  'ErXwobaYiN019PkySvjV', // Antoni
  'MF3mGyEYCl7XYWbV9V6O', // Elli
  'TxGEqnHWrfWFTfGW9XjX', // Josh
  'AZnzlk1XvdvUeBnXmlld', // Domi
  'yoQ2vLiZvQ0YfKMkGhKA', // Sam
];

/** A familiar says its line. 204 without a key, so the client just shows text. */
export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return new Response(null, { status: 204 });

  const { text, voice } = (await req.json().catch(() => ({}))) as { text?: string; voice?: number };
  const line = (text ?? '').trim().slice(0, 400);
  if (!line) return new Response(null, { status: 204 });

  const id = VOICES[Math.abs(Math.round(voice ?? 0)) % VOICES.length];
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}?output_format=mp3_44100_64`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        text: line,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.4, similarity_boost: 0.7 },
      }),
    });
    if (!r.ok || !r.body) return new Response(null, { status: 204 });
    return new Response(r.body, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } });
  } catch {
    return new Response(null, { status: 204 });
  }
}
