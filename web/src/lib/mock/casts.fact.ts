export default function castsFact(input: { transcript?: string }): { fact: string } {
  const words = String(input.transcript ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  return { fact: words.slice(-12).join(' ') || 'nothing yet' };
}
