import type { Ingredient, Lang } from "./types";

// Iranian kitchen measures: پیمانه = 240 ml, قاشق غذاخوری = 15 ml, قاشق چای‌خوری = 5 ml.
const CUP = 240;
const TBSP = 15;
const TSP = 5;

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function num(n: number | string, lang: Lang) {
  const s = String(n);
  return lang === "fa" ? s.replace(/\d/g, (d) => FA_DIGITS[+d]).replace(".", "٫") : s;
}

const FRACTIONS: [number, string][] = [
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
];
const FA_FRACTION: Record<string, string> = {
  "¼": "یک‌چهارم",
  "⅓": "یک‌سوم",
  "½": "نیم",
  "⅔": "دوسوم",
  "¾": "سه‌چهارم",
};

/** Rounds to the nearest friendly fraction. Returns null if it rounds to nothing. */
function friendly(x: number, lang: Lang, halvesOnly = false): string | null {
  const options: [number, string][] = [[0, ""], ...FRACTIONS, [1, ""]].filter(
    ([v]) => !halvesOnly || v === 0 || v === 0.5 || v === 1,
  ) as [number, string][];
  let whole = Math.floor(x);
  const rest = x - whole;
  let [value, glyph] = options[0];
  for (const o of options) if (Math.abs(o[0] - rest) < Math.abs(value - rest)) [value, glyph] = o;
  if (value === 1) whole += 1;

  if (whole === 0 && !glyph) return null;
  if (lang === "en") return `${whole || ""}${glyph}`;
  if (!glyph) return num(whole, lang);
  return whole ? `${num(whole, lang)} و ${FA_FRACTION[glyph]}` : FA_FRACTION[glyph];
}

function roundTo(x: number, step: number) {
  return Math.round(x / step) * step;
}

function decimal(x: number, lang: Lang) {
  return num(Number(x.toFixed(1)), lang);
}

const LABELS = {
  fa: {
    g: "گرم", kg: "کیلوگرم", l: "لیتر", cup: "پیمانه", tbsp: "قاشق غذاخوری", tsp: "قاشق چای‌خوری",
    piece: "عدد", clove: "حبه", slice: "برش", bunch: "دسته", can: "قوطی",
    pinch: "یک نوک قاشق", to_taste: "به میزان لازم",
  },
  en: {
    g: "g", kg: "kg", l: "L", cup: "cup", tbsp: "tbsp", tsp: "tsp",
    piece: "", clove: "clove", slice: "slice", bunch: "bunch", can: "can",
    pinch: "a pinch", to_taste: "to taste",
  },
};

function withUnit(qty: string, unit: keyof (typeof LABELS)["en"], lang: Lang, plural = false) {
  let label: string = LABELS[lang][unit];
  if (lang === "en" && plural && ["cup", "clove", "slice", "can"].includes(unit)) label += "s";
  if (lang === "en" && plural && unit === "bunch") label += "es";
  return label ? `${qty} ${label}` : qty;
}

function volume(ml: number, lang: Lang): string {
  if (ml >= 1000) return withUnit(decimal(ml / 1000, lang), "l", lang);
  if (ml >= CUP / 4) {
    const cups = ml / CUP;
    return withUnit(friendly(cups, lang)!, "cup", lang, friendly(cups, "en") !== "1");
  }
  if (ml >= TBSP * 0.9) return withUnit(friendly(ml / TBSP, lang)!, "tbsp", lang);
  const tsp = friendly(ml / TSP, lang);
  return tsp ? withUnit(tsp, "tsp", lang) : LABELS[lang].pinch;
}

function weight(g: number, lang: Lang): string {
  if (g >= 1000) return withUnit(decimal(g / 1000, lang), "kg", lang);
  const rounded = g < 1 ? Number(g.toFixed(1)) : g < 20 ? roundTo(g, 0.5) : g < 100 ? roundTo(g, 5) : roundTo(g, 10);
  return withUnit(num(rounded || 0.1, lang), "g", lang);
}

/** Formats one ingredient's amount, scaled by `factor`, in Iranian kitchen units. */
export function formatAmount(ing: Ingredient, factor: number, lang: Lang): string {
  const a = ing.amount * factor;
  switch (ing.unit) {
    case "to_taste":
    case "pinch":
      return LABELS[lang][ing.unit];
    case "g":
      return weight(a, lang);
    case "ml":
      return volume(a, lang);
    default: {
      // Halves for small counts (½ onion); whole numbers past 2 (nobody wants 4½ eggs).
      const count = a > 2 ? Math.round(a) : Math.max(a, 0.5);
      return withUnit(friendly(count, lang, true)!, ing.unit, lang, count > 1.25);
    }
  }
}
