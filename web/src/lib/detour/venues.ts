/** Endpoints a walk can finish at, and the places it can start from.
 *  Safe to import from the client: no graph, no OSM data. */
export type Venue = { id: string; name: string; lat: number; lng: number; hint: string };

export const VENUES: Venue[] = [
  { id: 'tepper', name: 'Tepper School', lat: 40.444097, lng: -79.945064, hint: 'CMU · Forbes at Tepper' },
  { id: 'gates', name: 'Gates Center', lat: 40.443358, lng: -79.944603, hint: 'CMU · computer science' },
  { id: 'cathedral', name: 'Cathedral of Learning', lat: 40.444452, lng: -79.953165, hint: 'Pitt · the tall one' },
  { id: 'hunt', name: 'Hunt Library', lat: 40.441589, lng: -79.943497, hint: 'CMU · the cut' },
  { id: 'schenley', name: 'Schenley Plaza', lat: 40.44242, lng: -79.951908, hint: 'the carousel and the lawn' },
];

export const DEFAULT_VENUE = VENUES[0];

export function venueById(id: string): Venue {
  return VENUES.find((v) => v.id === id) ?? DEFAULT_VENUE;
}

export function venueByName(name: string): Venue {
  return VENUES.find((v) => v.name === name) ?? DEFAULT_VENUE;
}

export const MOODS = ['somewhere new', 'quiet', 'hungry', 'trees', 'people-watching'] as const;
export type Mood = (typeof MOODS)[number];
