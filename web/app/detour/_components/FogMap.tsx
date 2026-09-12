'use client';
import { useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapLibreMap } from 'maplibre-gl';
import type { LatLng } from '@/lib/detour/geo';

export const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

export type MapPoi = { lat: number; lng: number; name?: string; kind?: string; chosen?: boolean; label?: string };

export type FogMapProps = {
  /** where the map looks when nothing else says otherwise */
  center: LatLng;
  zoom?: number;
  /** keep the walker in the middle of the screen */
  follow?: boolean;
  /** live position, read every frame */
  posRef?: React.RefObject<LatLng | null>;
  position?: LatLng | null;
  heading?: number;
  /** the mask: everything further than radiusM from the walker is fog */
  fog?: boolean;
  radiusM?: number;
  /** only ever passed once the walk is over (or on the projector) */
  route?: LatLng[] | null;
  pois?: MapPoi[];
  candidates?: MapPoi[];
  endpoint?: MapPoi | null;
  dark?: boolean;
  /** the projector wants the credit line; the phone does not */
  attribution?: boolean;
  fit?: LatLng[] | null;
  fitPadding?: { top: number; bottom: number; left: number; right: number };
  onTap?: () => void;
  className?: string;
  style?: React.CSSProperties;
  showMarker?: boolean;
};

const FOG = 'rgba(246,247,251,';
const ACCENT = '#FF6B4A';
const WORLD = 256;

type Projector = (p: LatLng) => { x: number; y: number };

function mercator(lat: number, lng: number, scale: number) {
  const x = ((lng + 180) / 360) * scale;
  const s = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale;
  return { x, y };
}

/** Projection that works with or without a live map — so the screen still draws
 *  when WebGL or the tile server is missing. */
function projectorFor(
  map: MapLibreMap | null,
  center: LatLng,
  zoom: number,
  w: number,
  h: number,
): { project: Projector; metersPerPixel: number } {
  if (map) {
    const project: Projector = (p) => {
      const q = map.project([p[1], p[0]]);
      return { x: q.x, y: q.y };
    };
    const c = map.getCenter();
    const mpp = (156543.03392 * Math.cos((c.lat * Math.PI) / 180)) / Math.pow(2, map.getZoom());
    return { project, metersPerPixel: mpp };
  }
  const scale = WORLD * Math.pow(2, zoom);
  const o = mercator(center[0], center[1], scale);
  const project: Projector = (p) => {
    const q = mercator(p[0], p[1], scale);
    return { x: q.x - o.x + w / 2, y: q.y - o.y + h / 2 };
  };
  return { project, metersPerPixel: (156543.03392 * Math.cos((center[0] * Math.PI) / 180)) / Math.pow(2, zoom) };
}

/** The map the walker is allowed to see: a hundred metres of it. */
export function FogMap({
  center,
  zoom = 16.6,
  follow = false,
  posRef,
  position = null,
  heading = 0,
  fog = false,
  radiusM = 100,
  route = null,
  pois = [],
  candidates = [],
  endpoint = null,
  dark = false,
  attribution = false,
  fit = null,
  fitPadding,
  onTap,
  className,
  style,
  showMarker = true,
}: FogMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const markerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const readyRef = useRef(false);

  // keep the latest props for the animation frame without re-creating the map
  const propsRef = useRef({ center, zoom, follow, posRef, position, heading, fog, radiusM, route, pois, candidates, endpoint, dark, showMarker });
  propsRef.current = { center, zoom, follow, posRef, position, heading, fog, radiusM, route, pois, candidates, endpoint, dark, showMarker };

  // 1. the map itself (best effort: no WebGL and no tiles still leaves a usable screen)
  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;
    (async () => {
      try {
        const { Map: MapCtor } = await import('maplibre-gl');
        if (cancelled) return;
        const map = new MapCtor({
          container: host,
          style: dark ? STYLES.dark : STYLES.light,
          center: [center[1], center[0]],
          zoom,
          attributionControl: attribution ? { compact: true } : false,
          interactive: false,
          fadeDuration: 0,
        });
        map.on('error', () => {
          /* a missing tile must never take the screen down */
        });
        map.on('load', () => {
          readyRef.current = true;
        });
        if (cancelled) {
          map.remove();
          return;
        }
        mapRef.current = map;
      } catch {
        mapRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // the map is created once; everything else is applied per frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. fit the map to a set of points (arrival, stage)
  useEffect(() => {
    if (!fit || fit.length < 2) return;
    let tries = 0;
    const id = setInterval(() => {
      const map = mapRef.current;
      tries += 1;
      if (tries > 40) clearInterval(id);
      if (!map) return;
      const lats = fit.map((p) => p[0]);
      const lngs = fit.map((p) => p[1]);
      try {
        map.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          {
            padding: fitPadding ?? { top: 96, bottom: 380, left: 36, right: 36 },
            animate: false,
            maxZoom: 17,
          },
        );
        clearInterval(id);
      } catch {
        /* the map is not ready yet */
      }
    }, 120);
    return () => clearInterval(id);
  }, [fit, fitPadding]);

  // 3. one animation frame loop: follow, fog, route, markers
  useEffect(() => {
    let raf = 0;
    let lastCenter = '';
    let lastRecentre = 0;

    const draw = () => {
      const host = hostRef.current;
      const canvas = canvasRef.current;
      if (!host || !canvas) return;
      const p = propsRef.current;
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }

      const live = p.posRef?.current ?? p.position ?? null;
      const map = mapRef.current;

      // recentre in steps, not every frame: a camera that never settles never
      // gets its tiles (the fog and the marker still move at 60 fps below)
      if (map && p.follow && live && readyRef.current) {
        const key = `${live[0].toFixed(5)},${live[1].toFixed(5)}`;
        const now = performance.now();
        if (key !== lastCenter && now - lastRecentre > 220) {
          lastCenter = key;
          lastRecentre = now;
          map.jumpTo({ center: [live[1], live[0]], zoom: p.zoom });
        }
      }

      const { project, metersPerPixel } = projectorFor(map, live ?? p.center, p.zoom, w, h);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // the projector view dims the basemap so the orange reads across a room
      if (p.dark) {
        ctx.fillStyle = 'rgba(13,13,20,.22)';
        ctx.fillRect(0, 0, w, h);
      }

      // candidate corners the solver weighed but did not take
      for (const c of p.candidates) {
        const q = project([c.lat, c.lng]);
        if (q.x < -40 || q.y < -40 || q.x > w + 40 || q.y > h + 40) continue;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 6, 0, Math.PI * 2);
        ctx.strokeStyle = p.dark ? 'rgba(240,240,248,.45)' : 'rgba(74,74,102,.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // the route, once it is allowed to be seen
      if (p.route && p.route.length > 1) {
        ctx.beginPath();
        p.route.forEach((pt, i) => {
          const q = project(pt);
          if (i === 0) ctx.moveTo(q.x, q.y);
          else ctx.lineTo(q.x, q.y);
        });
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = p.dark ? 'rgba(10,10,20,.55)' : 'rgba(255,255,255,.9)';
        ctx.lineWidth = 9;
        ctx.stroke();
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = 5;
        ctx.stroke();
      }

      // the places the walk actually passed
      const labelBoxes: [number, number, number, number][] = [];
      const fits = (x: number, y: number, w2: number, h2: number) => {
        for (const b of labelBoxes) {
          if (x < b[0] + b[2] && x + w2 > b[0] && y < b[1] + b[3] && y + h2 > b[1]) return false;
        }
        labelBoxes.push([x, y, w2, h2]);
        return true;
      };
      for (const poi of p.pois) {
        const q = project([poi.lat, poi.lng]);
        if (q.x < -60 || q.y < -60 || q.x > w + 60 || q.y > h + 60) continue;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(q.x, q.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = ACCENT;
        ctx.fill();
        if (poi.label) {
          ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
          const tw = ctx.measureText(poi.label).width;
          if (fits(q.x + 10, q.y - 10, tw + 12, 20)) {
            ctx.fillStyle = p.dark ? 'rgba(13,13,20,.78)' : 'rgba(255,255,255,.88)';
            ctx.fillRect(q.x + 10, q.y - 10, tw + 12, 20);
            ctx.fillStyle = p.dark ? '#F0F0F8' : '#0A0A0F';
            ctx.fillText(poi.label, q.x + 16, q.y + 4);
          }
        }
      }

      if (p.endpoint) {
        const q = project([p.endpoint.lat, p.endpoint.lng]);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = p.dark ? '#F0F0F8' : '#0A0A0F';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = p.dark ? '#0D0D14' : '#fff';
        ctx.stroke();
        if (p.endpoint.label) {
          ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
          ctx.fillStyle = p.dark ? '#F0F0F8' : '#0A0A0F';
          ctx.fillText(p.endpoint.label, q.x + 16, q.y + 5);
        }
      }

      // the fog: a real mask, cut open around the walker
      if (p.fog) {
        const c = live ? project(live) : { x: w / 2, y: h * 0.52 };
        const rPx = Math.max(40, p.radiusM / Math.max(0.0001, metersPerPixel));
        ctx.fillStyle = `${FOG}.97)`;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'destination-out';
        const edge = rPx * 1.3;
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, edge);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(rPx / edge, 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
      }

      // the walker
      const marker = markerRef.current;
      if (marker) {
        if (live && p.showMarker) {
          const q = project(live);
          marker.style.display = 'block';
          marker.style.transform = `translate3d(${q.x}px, ${q.y}px, 0) rotate(${p.heading - 28}deg)`;
        } else {
          marker.style.display = 'none';
        }
      }
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={className ?? 'map'}
      style={{ position: 'absolute', inset: 0, background: dark ? '#0D0D14' : '#F2F4F8', ...style }}
      onClick={onTap}
      role={onTap ? 'button' : undefined}
      aria-label={fog ? 'Fogged map around your position' : 'Map'}
    >
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <div ref={markerRef} style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, display: 'none' }}>
        <div className="you" style={{ left: 0, top: 0 }} />
      </div>
    </div>
  );
}
