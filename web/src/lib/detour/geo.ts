/** Geometry with no data attached — safe to import from the phone. */

export type LatLng = [number, number];

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Metres between two lat/lng points. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Compass bearing in degrees from a to b. */
export function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
  const x =
    Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** left / right / straight for a heading change. */
export function turnFrom(before: number, after: number): 'left' | 'right' | 'straight' {
  const d = ((after - before + 540) % 360) - 180;
  if (d > 35) return 'right';
  if (d < -35) return 'left';
  return 'straight';
}

/** Linear interpolation between two coordinates. */
export function lerpLatLng(a: LatLng, b: LatLng, t: number): LatLng {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function boundsOf(points: LatLng[]): { min: LatLng; max: LatLng } | null {
  if (!points.length) return null;
  let [s, w] = points[0];
  let [n, e] = points[0];
  for (const [lat, lng] of points) {
    s = Math.min(s, lat);
    n = Math.max(n, lat);
    w = Math.min(w, lng);
    e = Math.max(e, lng);
  }
  return { min: [s, w], max: [n, e] };
}
