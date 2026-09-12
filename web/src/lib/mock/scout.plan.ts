/** Deterministic stand-in for the scout planner: three search strings. */
export default function mock(input: { city?: string; keywords?: string[]; brief?: string }, _seed: number) {
  const city = input?.city ?? 'Pittsburgh';
  const k = input?.keywords ?? [];
  const one = k[0] ?? 'community';
  const two = k[1] ?? 'workshop';
  const three = k[2] ?? 'meetup';
  return {
    queries: [
      `${city} ${one} event this weekend`,
      `${city} ${two} meetup next week`,
      `${city} ${three} calendar things to do`,
    ],
  };
}
