import { findIngredients } from '../palate/score';

type Dish = { name: string; price?: number; ingredients: string[]; confidence: number; section: string };

const THAI = /[\u0E00-\u0E7F]/;
const PT = /\b(com|de|do|da|à|no|na|grelhad|assad|bacalhau|frango|arroz|petisco|sobremesa)\b/i;

const priceOf = (line: string): number | undefined => {
  const m = line.match(/(?:[$€£]\s*)?(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:[$€£]|eur|usd)?\s*$/i);
  if (!m) return undefined;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n < 500 ? n : undefined;
};

const stripPrice = (line: string) => line.replace(/[\s.·—–-]*(?:[$€£]\s*)?\d{1,3}(?:[.,]\d{1,2})?\s*(?:[$€£]|eur|usd)?\s*$/i, '').trim();

/** Parse a pasted menu without inventing anything: the ingredients come from the authored
 *  table finding words that are actually printed on the line. A line that names nothing we
 *  recognise comes back with an empty list and a low confidence — it stays grey downstream. */
export default function mock(input: { menuText?: string; language?: string }) {
  const text = String(input?.menuText ?? '');
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const language = input?.language ?? (THAI.test(text) ? 'th' : PT.test(text) ? 'pt' : 'en');
  let restaurant = 'Pasted menu';
  let section = 'menu';
  const dishes: Dish[] = [];

  lines.forEach((line, i) => {
    const price = priceOf(line);
    const words = line.split(/\s+/).length;
    if (i === 0 && price === undefined && words <= 6) {
      restaurant = line.replace(/[·—–-]+$/, '').trim();
      return;
    }
    if (price === undefined && words <= 3 && !/[,;:]/.test(line)) {
      section = line.toLowerCase().replace(/[—–-]/g, '').trim() || section;
      return;
    }
    const body = stripPrice(line);
    const [head, ...rest] = body.split(/\s+[—–|:]\s+|\s+-\s+/);
    const name = (head || body).replace(/\.+$/, '').trim();
    if (!name) return;
    const ingredients = findIngredients(`${name} ${rest.join(' ')}`);
    dishes.push({
      name,
      price,
      ingredients,
      confidence: ingredients.length >= 2 ? Math.min(0.9, 0.45 + 0.1 * ingredients.length) : 0.2,
      section,
    });
  });

  return { restaurant, language, dishes: dishes.slice(0, 40) };
}
