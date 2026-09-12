import { describe, expect, it } from 'vitest';
import {
  dijkstra,
  haversine,
  loadGraph,
  nearestNode,
  pathLatLng,
  pathMeters,
  pathTo,
  streetsAlong,
  turnFrom,
} from '@/lib/detour/graph';
import { VENUES, venueById } from '@/lib/detour/venues';

const g = loadGraph();

describe('oakland graph', () => {
  it('loads a connected walking network with pois', () => {
    expect(Object.keys(g.nodes).length).toBeGreaterThan(5000);
    expect(Object.keys(g.adj).length).toBeGreaterThan(5000);
    expect(g.pois.length).toBeGreaterThan(100);
    for (const p of g.pois.slice(0, 20)) {
      expect(g.nodes[p.nodeId]).toBeTruthy();
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it('snaps every venue to a node within 60 m', () => {
    for (const v of VENUES) {
      const id = nearestNode(g, v.lat, v.lng);
      expect(id).toBeTruthy();
      expect(haversine([v.lat, v.lng], g.nodes[id])).toBeLessThan(60);
    }
  });

  it('walks Tepper to the Cathedral of Learning in 400–1200 m', () => {
    const from = nearestNode(g, venueById('tepper').lat, venueById('tepper').lng);
    const to = nearestNode(g, venueById('cathedral').lat, venueById('cathedral').lng);
    const { dist, prev } = dijkstra(g, from);
    expect(dist[to]).toBeGreaterThan(400);
    expect(dist[to]).toBeLessThan(1200);

    const path = pathTo(prev, to);
    expect(path[0]).toBe(from);
    expect(path[path.length - 1]).toBe(to);
    expect(pathMeters(g, path)).toBeCloseTo(dist[to], 0);

    const line = pathLatLng(g, path);
    expect(line.length).toBe(path.length);

    const streets = streetsAlong(g, path);
    expect(streets.length).toBeGreaterThan(0);
    // no street repeats back to back
    expect(streets.every((s, i) => i === 0 || s !== streets[i - 1])).toBe(true);
  });

  it('reaches most of the network from Tepper', () => {
    const from = nearestNode(g, venueById('tepper').lat, venueById('tepper').lng);
    const { dist } = dijkstra(g, from);
    const reached = Object.keys(dist).length / Object.keys(g.nodes).length;
    expect(reached).toBeGreaterThan(0.8);
  });

  it('reads turns from bearings', () => {
    expect(turnFrom(0, 90)).toBe('right');
    expect(turnFrom(0, 270)).toBe('left');
    expect(turnFrom(10, 20)).toBe('straight');
    expect(turnFrom(350, 10)).toBe('straight');
  });
});
