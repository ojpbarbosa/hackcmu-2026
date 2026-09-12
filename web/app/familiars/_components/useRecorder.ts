'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type SttProvider = 'unknown' | 'elevenlabs' | 'none';

function pickMime(): string {
  const want = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const m of want) {
    try {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) return m;
    } catch {
      /* Safari throws on odd strings */
    }
  }
  return '';
}

/** Mic → /api/stt in standalone chunks. Each `chunkMs` the recorder is stopped and
 *  restarted so every blob carries its own container header and decodes alone. */
export function useRecorder({
  onText,
  chunkMs = 4000,
}: {
  onText: (full: string) => void;
  chunkMs?: number;
}): {
  start: () => Promise<void>;
  stop: () => void;
  listening: boolean;
  level: number;
  supported: boolean;
  provider: SttProvider;
} {
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [supported, setSupported] = useState(true);
  const [provider, setProvider] = useState<SttProvider>('unknown');

  const liveRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef('');
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => {
    const ok =
      typeof window !== 'undefined' &&
      typeof window.MediaRecorder !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia;
    setSupported(ok);
  }, []);

  const send = useCallback(async (blob: Blob) => {
    if (!blob || blob.size < 900) return;
    const fd = new FormData();
    fd.append('audio', blob, blob.type.includes('mp4') ? 'clip.mp4' : 'clip.webm');
    try {
      const res = await fetch('/api/stt', { method: 'POST', body: fd });
      if (!res.ok) return;
      const body = (await res.json()) as { text?: string; provider?: SttProvider };
      if (body.provider) setProvider(body.provider);
      const piece = (body.text ?? '').trim();
      if (!piece) return;
      textRef.current = textRef.current ? `${textRef.current} ${piece}` : piece;
      onTextRef.current(textRef.current);
    } catch {
      /* a dropped chunk is just a dropped chunk */
    }
  }, []);

  const cycle = useCallback(
    function run() {
      const stream = streamRef.current;
      if (!stream || !liveRef.current) return;
      let rec: MediaRecorder;
      try {
        const mime = pickMime();
        rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      } catch {
        setSupported(false);
        return;
      }
      recRef.current = rec;
      rec.ondataavailable = (e: BlobEvent) => {
        if (e.data) void send(e.data);
      };
      rec.onstop = () => {
        if (liveRef.current) run();
      };
      try {
        rec.start();
      } catch {
        setSupported(false);
        return;
      }
      timerRef.current = setTimeout(() => {
        try {
          if (rec.state !== 'inactive') rec.stop();
        } catch {
          /* already gone */
        }
      }, chunkMs);
    },
    [chunkMs, send],
  );

  const stop = useCallback(() => {
    liveRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    try {
      if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try {
      void ctxRef.current?.close();
    } catch {
      /* ignore */
    }
    ctxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setListening(false);
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    if (liveRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      liveRef.current = true;
      setListening(true);

      try {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          ctxRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          ctx.createMediaStreamSource(stream).connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          const loop = () => {
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
              const v = (data[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / data.length);
            setLevel(Math.max(0, Math.min(1, rms * 3.2)));
            rafRef.current = requestAnimationFrame(loop);
          };
          rafRef.current = requestAnimationFrame(loop);
        }
      } catch {
        /* no meter, still records */
      }

      cycle();
    } catch {
      liveRef.current = false;
      setSupported(false);
      setListening(false);
    }
  }, [cycle]);

  useEffect(() => () => stop(), [stop]);

  return { start, stop, listening, level, supported, provider };
}
