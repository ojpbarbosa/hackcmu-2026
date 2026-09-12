const AXES = ['coconut', 'smoky', 'sour', 'herbal', 'sweet', 'fermented'] as const;
const RULES: Record<string, Partial<Record<(typeof AXES)[number], number>>> = {
  curry: { coconut: 0.9, herbal: 0.5 },
  massaman: { coconut: 0.9, sweet: 0.5 },
  larb: { sour: 0.8, herbal: 0.8 },
  bbq: { smoky: 0.9 },
  kimchi: { fermented: 0.9, sour: 0.6 },
  ceviche: { sour: 0.9 },
  ramen: { fermented: 0.6 },
  taco: { smoky: 0.6, sour: 0.4 },
  pierogi: { sweet: 0.3 },
  bacalhau: { fermented: 0.4, herbal: 0.3 },
};

export default function mock(input: { lovedDishes?: string[] }, seed: number) {
  const dishes = (input?.lovedDishes ?? []).map((d) => String(d).toLowerCase());
  const axes = Object.fromEntries(AXES.map((a) => [a, 0.2 + ((seed >> AXES.indexOf(a)) % 20) / 100])) as Record<
    (typeof AXES)[number],
    number
  >;
  const families: { label: string; count: number }[] = [];
  for (const d of dishes) {
    for (const [k, w] of Object.entries(RULES)) {
      if (!d.includes(k)) continue;
      for (const [axis, v] of Object.entries(w)) axes[axis as (typeof AXES)[number]] = Math.min(1, axes[axis as (typeof AXES)[number]] + (v as number) / 2);
      const f = families.find((x) => x.label === k);
      if (f) f.count += 1;
      else families.push({ label: k, count: 1 });
    }
  }
  if (families.length === 0) families.push({ label: 'unmapped', count: dishes.length });
  return { axes, families };
}
