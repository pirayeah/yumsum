import { UNITS, type Category, type Ingredient, type Pin, type Recipe, type Unit } from "../lib/types.ts";
import { askJson } from "./ai.ts";

const str = { type: "string" } as const;
const num = { type: "number" } as const;
export const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title_en", "title_fa", "category", "servings", "time_minutes", "estimated", "ingredients", "steps_en", "steps_fa"],
  properties: {
    title_en: str,
    title_fa: str,
    category: { type: "string", enum: ["food", "drink", "dessert"] },
    servings: { type: "integer" },
    time_minutes: { type: "integer" },
    estimated: { type: "boolean" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name_en", "name_fa", "amount", "unit", "note_en", "note_fa", "kcal", "protein_g", "carbs_g", "fat_g"],
        properties: {
          name_en: str,
          name_fa: str,
          amount: num,
          unit: { type: "string", enum: [...UNITS] },
          note_en: str,
          note_fa: str,
          kcal: num,
          protein_g: num,
          carbs_g: num,
          fat_g: num,
        },
      },
    },
    steps_en: { type: "array", items: str },
    steps_fa: { type: "array", items: str },
  },
};

const PIN_TASK = `You turn a saved Pinterest pin of a food, drink or sweet into a clean, cookable recipe for a home cook in Iran who reads Persian and English. Reply with one JSON object only.

Source:
- If a written recipe from the pin's website is given, follow it faithfully: same ingredients, amounts and method. Set estimated=false.
- If there is no written recipe (common for video pins), work out the most likely recipe for exactly what the image, title and description show, with realistic amounts. Set estimated=true.`;

/** Formatting rules shared by pin recipes and pantry ideas. */
export const RULES = `Amounts — always convert to metric so the app can rescale them:
- Weights in grams (unit "g"): 1 oz = 28 g, 1 lb = 454 g, 1 stick butter = 113 g.
- Volumes in millilitres (unit "ml"): 1 cup = 240 ml, 1 tbsp = 15 ml, 1 tsp = 5 ml, 1 fl oz = 30 ml. Keep ingredients that the source measures by volume (flour, sugar, rice) in ml; don't convert them to grams.
- Countable things use piece / clove / slice / bunch / can with a count.
- "pinch" or "to_taste" when there's no real amount; then amount = 0.
- servings = how many people the amounts feed (glasses for drinks). If the source gives pieces (e.g. 12 cookies), estimate people.
- time_minutes = total time, 0 if unknown.

Nutrition: for each ingredient, estimate kcal, protein_g, carbs_g and fat_g for the full listed amount (not per serving), using standard food-composition values. Use 0 for water, salt, spices to taste and pinches.

Language:
- title_fa / name_fa: the natural words an Iranian cook would use (e.g. آرد سفید، پودر قند، خامه قنادی، کره). Transliterate well-known foreign dish names (e.g. تیرامیسو). Use ingredients available in Iran where the original is obscure, and mention the original in the note.
- note_*: short prep notes like "softened" / "نرم‌شده", or "" if none.
- Steps: concise, one action per step, temperatures in °C, pan sizes in cm. Persian steps should read naturally, not as a word-for-word translation.
- Never repeat amounts inside steps; refer to ingredients by name, because the app rescales amounts for a different number of people.

JSON shape:
{"title_en","title_fa","category":"food|drink|dessert","servings":int,"time_minutes":int,"estimated":bool,
 "ingredients":[{"name_en","name_fa","amount":number,"unit":"${UNITS.join("|")}","note_en","note_fa","kcal","protein_g","carbs_g","fat_g"}],
 "steps_en":[string],"steps_fa":[string]}`;

const SYSTEM = `${PIN_TASK}\n\n${RULES}`;

type Page = { recipe: unknown | null; text: string };

function findRecipe(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipe(n);
      if (r) return r;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  if (t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"))) return obj;
  return findRecipe(obj["@graph"]);
}

async function readPage(url: string): Promise<Page | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; YumSum/1.0)", Accept: "text/html" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok || !res.headers.get("content-type")?.includes("html")) return null;
    const html = await res.text();

    // Most recipe sites publish a schema.org Recipe as JSON-LD; prefer that over page text.
    for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const r = findRecipe(JSON.parse(m[1]));
        if (r) {
          const { name, recipeYield, totalTime, recipeIngredient, recipeInstructions } = r;
          return { recipe: { name, recipeYield, totalTime, recipeIngredient, recipeInstructions }, text: "" };
        }
      } catch {}
    }
    const text = html
      .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Page text is only a fallback; the recipe is near the top of almost every page.
    return { recipe: null, text: text.slice(0, 25_000) };
  } catch {
    return null;
  }
}

async function imageDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/jpeg";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

function prompt(pin: Pin, page: Page | null) {
  const parts = [
    `Pin title: ${pin.title || "(none)"}`,
    `Pin description: ${pin.description || "(none)"}`,
    `Pin type: ${pin.isVideo ? "video (you are seeing its cover image)" : "image"}`,
    `Linked website: ${pin.link ?? "(none)"}`,
  ];
  if (page?.recipe) parts.push(`Written recipe from the website (schema.org JSON):\n${JSON.stringify(page.recipe)}`);
  else if (page?.text) parts.push(`Text of the linked page (may or may not contain a recipe):\n${page.text}`);
  else parts.push("No written recipe is available.");
  return parts.join("\n\n");
}

// Open models don't always follow the schema exactly, so coerce rather than trust.
const n = (v: unknown) => (typeof v === "number" && isFinite(v) && v >= 0 ? v : Number(v) >= 0 ? Number(v) : 0);
const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const list = (v: unknown) => (Array.isArray(v) ? v.map(s).filter(Boolean) : []);

export function normalize(
  d: Record<string, unknown>,
  pin: Pick<Pin, "title" | "link">,
  hadRecipe: boolean,
): Recipe {
  const ingredients = (Array.isArray(d.ingredients) ? d.ingredients : []).map((raw): Ingredient => {
    const i = raw as Record<string, unknown>;
    return {
      name_en: s(i.name_en),
      name_fa: s(i.name_fa) || s(i.name_en),
      amount: n(i.amount),
      unit: (UNITS as readonly string[]).includes(s(i.unit)) ? (s(i.unit) as Unit) : "piece",
      note_en: s(i.note_en),
      note_fa: s(i.note_fa),
      kcal: n(i.kcal),
      protein_g: n(i.protein_g),
      carbs_g: n(i.carbs_g),
      fat_g: n(i.fat_g),
    };
  });
  if (ingredients.length === 0) throw new Error("AI returned a recipe with no ingredients.");
  const category = (["food", "drink", "dessert"] as const).includes(d.category as Category) ? (d.category as Category) : "food";
  return {
    title_en: s(d.title_en) || pin.title,
    title_fa: s(d.title_fa) || s(d.title_en) || pin.title,
    category,
    servings: Math.max(1, Math.round(n(d.servings)) || 1),
    time_minutes: Math.round(n(d.time_minutes)),
    ingredients,
    steps_en: list(d.steps_en),
    steps_fa: list(d.steps_fa),
    estimated: d.estimated === true || !hadRecipe,
    source_url: pin.link,
  };
}

export async function extractRecipe(pin: Pin): Promise<Recipe> {
  const [page, image] = await Promise.all([pin.link ? readPage(pin.link) : null, imageDataUrl(pin.image)]);
  const data = await askJson(
    SYSTEM,
    [...(image ? [{ type: "image_url" as const, image_url: { url: image } }] : []), { type: "text", text: prompt(pin, page) }],
    SCHEMA,
  );
  return normalize(data as Record<string, unknown>, pin, !!page?.recipe);
}
