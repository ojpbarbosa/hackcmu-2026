'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QR({ url, size = 148 }: { url: string; size?: number }) {
  const [src, setSrc] = useState<string>('');
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { margin: 1, width: size * 2, color: { dark: '#0A0A0F', light: '#FFFFFF' } })
      .then((d) => {
        if (alive) setSrc(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url, size]);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a data: URL QR needs no optimizer
    <img
      src={src || undefined}
      alt={`QR code for ${url}`}
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: 12, background: '#fff', display: 'block' }}
    />
  );
}
