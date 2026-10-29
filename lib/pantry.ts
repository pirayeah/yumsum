import type { Ingredient, Recipe } from "./types";

// Things nearly every kitchen has; they never count as "missing".
const STAPLES = [
  "salt", "water", "oil", "pepper", "black pepper", "ice",
  "نمک", "آب", "روغن", "فلفل", "فلفل سیاه", "یخ",
];

/**
 * Lowercases, unifies Arabic/Persian letter forms and drops spaces and half-spaces, so «پياز» matches
 * «پیاز» and «تخم مرغ» matches «تخم‌مرغ».
 */
export function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ً-ٟ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function parseList(text: string) {
  return [...new Set(text.split(/[,،\n;؛]+/).map(norm).filter((s) => s.length >= 2))];
}

function isStaple(ing: Ingredient) {
  if (ing.unit === "pinch" || ing.unit === "to_taste") return true;
  return [ing.name_en, ing.name_fa].some((n) => STAPLES.includes(norm(n)));
}

function matches(ing: Ingredient, have: string[]) {
  const names = [norm(ing.name_en), norm(ing.name_fa)].filter(Boolean);
  // "tomato" matches "cherry tomatoes", and "گوجه فرنگی" matches "گوجه".
  return have.some((h) => names.some((n) => n.includes(h) || h.includes(n)));
}

export type Match = { id: string; have: number; total: number; missing: Ingredient[] };

/** Ranks recipes by how much of them you can make, best first. */
export function rank(recipes: Record<string, Recipe>, have: string[]): Match[] {
  if (have.length === 0) return [];
  const out: Match[] = [];
  for (const [id, r] of Object.entries(recipes)) {
    const needed = r.ingredients.filter((i) => !isStaple(i));
    if (needed.length === 0) continue;
    const missing = needed.filter((i) => !matches(i, have));
    const count = needed.length - missing.length;
    if (count > 0) out.push({ id, have: count, total: needed.length, missing });
  }
  return out.sort((a, b) => b.have / b.total - a.have / a.total || a.missing.length - b.missing.length);
}
