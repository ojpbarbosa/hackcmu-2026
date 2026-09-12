const DEMO = [
  { name: 'Massaman curry', price: '$17', ingredients: ['coconut milk', 'peanut', 'potato', 'cinnamon'], confidence: 0.9, section: 'curries' },
  { name: 'Larb moo', price: '$15', ingredients: ['pork', 'lime', 'mint', 'toasted rice'], confidence: 0.86, section: 'salads' },
  { name: 'Green curry', price: '$16', ingredients: ['coconut milk', 'green chilli', 'thai basil'], confidence: 0.88, section: 'curries' },
  { name: 'House special', price: '$21', ingredients: [], confidence: 0.2, section: 'kitchen' },
];

export default function mock(input: { menuText?: string }, seed: number) {
  const text = input?.menuText ?? '';
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2);
  if (lines.length === 0) return { restaurant: 'Bangkok Balcony', dishes: DEMO };
  return {
    restaurant: lines[0],
    dishes: lines.slice(1, 12).map((l, i) => ({
      name: l.replace(/\s*[\d.,$]+\s*$/, ''),
      price: (l.match(/[\d.,]+\s*$/) ?? [''])[0].trim(),
      ingredients: DEMO[(seed + i) % DEMO.length].ingredients,
      confidence: 0.6,
      section: 'menu',
    })),
  };
}
