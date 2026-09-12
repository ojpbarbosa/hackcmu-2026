import { AXES, FAMILY_LABELS, type AxisName, type FamilyKey } from '../palate/score';

/** Keyword rules over the dishes a person names. Authored, not learned: each rule says
 *  which axes a dish pushes up and which family it belongs to. A dish that matches
 *  nothing adds nothing — the mock never invents a taste the diner did not describe. */
const RULES: { re: RegExp; axes: Partial<Record<AxisName, number>>; family?: FamilyKey }[] = [
  {
    re: /coconut|massaman|panang|khao ?soi|tom kha|curry|korma|laksa|rendang|creamy|alfredo|carbonara|chowder|gratin|natas|butter chicken|mac and cheese/,
    axes: { coconut: 0.92, sweet: 0.32, herbal: 0.3 },
    family: 'coconut',
  },
  {
    re: /grill|char|bbq|barbecue|smok|brisket|steak|skewer|satay|churrasco|chourico|chorizo|sardin|yakitori|moo ?ping|gai ?yang|kebab|roast|burnt ends|carne asada|bacon|pastrami|brisket/,
    axes: { smoky: 0.92, fermented: 0.28 },
    family: 'smoky',
  },
  {
    re: /lime|lemon|vinegar|sour|ceviche|pickle|som ?tam|papaya salad|tom ?yum|adobo|kraut|tamarind|yuzu|citrus|escabeche|tangy|aguachile/,
    axes: { sour: 0.9, herbal: 0.34 },
    family: 'sour',
  },
  {
    re: /mint|basil|herb|cilantro|coriander|larb|pho|green curry|salad|parsley|pesto|chimichurri|dill|tabbouleh|banh mi|caldo verde|couve/,
    axes: { herbal: 0.88, sour: 0.3 },
    family: 'herbal',
  },
  {
    re: /dessert|cake|pie|ice ?cream|sticky rice|pastel de nata|nata|pancake|waffle|chocolate|churro|donut|doughnut|tiramisu|flan|custard|mango|sweet|honey|maple|arroz doce/,
    axes: { sweet: 0.92, coconut: 0.3 },
    family: 'sweet',
  },
  {
    re: /kimchi|miso|natto|fish sauce|funky|blue cheese|sourdough|ferment|anchov|bacalhau|salt cod|olive|aged|corned beef|feijoada|nduja|reuben|gochujang|doubanjiang/,
    axes: { fermented: 0.92, sour: 0.34 },
    family: 'fermented',
  },
  { re: /peanut|cashew|satay|nut/, axes: { coconut: 0.5, sweet: 0.26 } },
  { re: /chilli|chili|spicy|piri|szechuan|sichuan|hot|jalapeno/, axes: { smoky: 0.38, herbal: 0.34 } },
  { re: /cheese|cream|butter|queijo|panna/, axes: { coconut: 0.7 }, family: 'coconut' },
  { re: /noodle|ramen|udon|pad ?thai|dumpling|pierogi/, axes: { fermented: 0.36, sweet: 0.24 } },
  { re: /taco|mole|birria|al pastor/, axes: { smoky: 0.6, sour: 0.4 } },
  { re: /rice|risotto|paella|arroz|congee/, axes: { fermented: 0.24 } },
];

const FLOOR = 0.28;

export default function mock(input: { lovedDishes?: string[]; never?: string[] }) {
  const dishes = (input?.lovedDishes ?? []).map((d) => String(d).toLowerCase().trim()).filter(Boolean);
  const hits: Record<AxisName, number[]> = { coconut: [], smoky: [], sour: [], herbal: [], sweet: [], fermented: [] };
  const familyCounts = new Map<FamilyKey, number>();

  for (const dish of dishes) {
    const families = new Set<FamilyKey>();
    for (const rule of RULES) {
      if (!rule.re.test(dish)) continue;
      for (const [axis, w] of Object.entries(rule.axes)) hits[axis as AxisName].push(w as number);
      if (rule.family) families.add(rule.family);
    }
    for (const f of families) familyCounts.set(f, (familyCounts.get(f) ?? 0) + 1);
  }

  // an axis reads as high as the dishes that push it are strong and often named: one grilled
  // dish out of five is a fifth of a palate, not a whole one.
  const axes = Object.fromEntries(
    AXES.map((a) => {
      const list = hits[a];
      if (list.length === 0 || dishes.length === 0) return [a, FLOOR];
      const top = Math.max(...list);
      const share = Math.min(1, list.length / dishes.length);
      return [a, Math.min(1, Number((FLOOR + (1 - FLOOR) * top * share).toFixed(3)))];
    }),
  ) as Record<AxisName, number>;

  const families = [...familyCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([key, count]) => ({ label: FAMILY_LABELS[key], count }));

  return { axes, families };
}
