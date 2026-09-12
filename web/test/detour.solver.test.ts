import { describe, expect, it } from 'vitest';
import { haversine, loadGraph } from '@/lib/detour/graph';
import { MAX_LEGS, planWalk, SLACK_SECONDS } from '@/lib/detour/solver';
import { venueById } from '@/lib/detour/venues';

const g = loadGraph();
const STARTS = ['tepper', 'gates', 'cathedral'] as const;
const BUDGETS = [15, 45, 90];
const END = venueById('schenley');

describe('planWalk', () => {
  for (const startId of STARTS) {
    for (const budget of BUDGETS) {
      it(`${startId} · ${budget} min → a feasible walk that ends at the endpoint`, () => {
        const s = venueById(startId);
        const walk = planWalk(g, [s.lat, s.lng], END, budget, 'somewhere new', []);

        expect(walk.legs.length).toBeGreaterThanOrEqual(1);
        expect(walk.legs.length).toBeLessThanOrEqual(MAX_LEGS + 1);
        expect(walk.totalSeconds).toBeLessThanOrEqual(budget * 60);
        expect(walk.budgetSeconds).toBe(budget * 60);

        // every leg is continuous with the one before it
        for (let i = 1; i < walk.legs.length; i++) {
          expect(walk.legs[i].fromNode).toBe(walk.legs[i - 1].toNode);
        }
        for (const l of walk.legs) {
          expect(l.path.length).toBeGreaterThan(1);
          expect(l.meters).toBeGreaterThan(0);
          expect(['left', 'right', 'straight']).toContain(l.turn);
        }

        // the walk lands on the endpoint
        const end = walk.legs[walk.legs.length - 1].path.slice(-1)[0];
        expect(haversine(end, [END.lat, END.lng])).toBeLessThan(60);

        // no place is visited twice
        const ids = walk.legs.map((l) => l.poi?.id).filter(Boolean);
        expect(new Set(ids).size).toBe(ids.length);
      });
    }
  }

  it('fills 45 minutes with at least three places', () => {
    const s = venueById('tepper');
    const walk = planWalk(g, [s.lat, s.lng], END, 45, 'somewhere new', []);
    const pois = walk.legs.filter((l) => l.poi);
    expect(pois.length).toBeGreaterThanOrEqual(3);
    expect(walk.totalSeconds).toBeGreaterThan(8 * 60);
    expect(walk.totalSeconds).toBeLessThanOrEqual(45 * 60 - SLACK_SECONDS + walk.legs.slice(-1)[0].seconds);
  });

  it('keeps a short budget short', () => {
    const s = venueById('gates');
    const walk = planWalk(g, [s.lat, s.lng], venueById('hunt'), 15, 'quiet', []);
    expect(walk.totalSeconds).toBeLessThanOrEqual(15 * 60);
    expect(walk.legs.length).toBeGreaterThanOrEqual(1);
  });

  it('moves with the mood: hungry prefers places you can eat', () => {
    const s = venueById('cathedral');
    const hungry = planWalk(g, [s.lat, s.lng], END, 45, 'hungry', []);
    const food = new Set(['cafe', 'restaurant', 'bakery', 'fast_food', 'ice_cream', 'deli', 'pub']);
    const eats = hungry.legs.filter((l) => l.poi && food.has(l.poi.kind)).length;
    expect(eats).toBeGreaterThanOrEqual(1);
  });

  it('skips places the walker has already seen', () => {
    const s = venueById('tepper');
    const first = planWalk(g, [s.lat, s.lng], END, 45, 'somewhere new', []);
    const seen = first.legs.map((l) => l.poi?.id).filter(Boolean) as string[];
    const second = planWalk(g, [s.lat, s.lng], END, 45, 'somewhere new', seen);
    const again = second.legs.map((l) => l.poi?.id).filter(Boolean) as string[];
    expect(again.some((id) => !seen.includes(id))).toBe(true);
    expect(again.filter((id) => seen.includes(id)).length).toBeLessThan(seen.length);
  });

  it('reports the candidates it weighed', () => {
    const s = venueById('tepper');
    const walk = planWalk(g, [s.lat, s.lng], END, 45, 'somewhere new', []);
    expect(walk.candidates.length).toBeGreaterThan(5);
    expect(walk.candidates.filter((c) => c.chosen).length).toBe(walk.legs.filter((l) => l.poi).length);
    expect(walk.candidates.every((c) => c.considered)).toBe(true);
  });
});
