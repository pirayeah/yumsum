// Reads the board, saves new pins to data/pins.json and writes recipes for pins that don't have one
// yet into data/recipes.json. Runs in the GitHub Action every few hours; locally: `npm run sync`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Pin, Recipe } from "../lib/types.ts";
import { RateLimitError } from "./ai.ts";
import { boardPins, pinsFromLinks } from "./pinterest.ts";
import { extractRecipe } from "./recipe.ts";

const PINS = "data/pins.json";
const RECIPES = "data/recipes.json";
const EXTRA = "extra-pins.txt";
// Free AI tiers allow a few dozen requests an hour; the rest wait for the next run.
const MAX_PER_RUN = Number(process.env.MAX_RECIPES_PER_RUN) || 25;

const username = (process.env.PINTEREST_USERNAME || "").trim().replace(/^@/, "").toLowerCase();
const board = (process.env.PINTEREST_BOARD || "yumsum").trim().toLowerCase();
if (!username) {
  console.error("Set PINTEREST_USERNAME (in .env.local, or as a repository variable on GitHub).");
  process.exit(1);
}

const read = <T,>(file: string, fallback: T): T => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback);
const write = (file: string, data: unknown) => writeFileSync(file, JSON.stringify(data, null, 1) + "\n");
mkdirSync("data", { recursive: true });

// 1. Pins: newest from the board first, then everything seen before, then older pins listed by hand.
const saved = read<Pin[]>(PINS, []);
const latest = await boardPins(username, board);
const known = new Set([...latest, ...saved].map((p) => p.id));
const extraLinks = existsSync(EXTRA)
  ? readFileSync(EXTRA, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
  : [];
const extra = (await pinsFromLinks(extraLinks, username)).filter((p) => !known.has(p.id));

const latestIds = new Set(latest.map((p) => p.id));
const pins = [...latest, ...saved.filter((p) => !latestIds.has(p.id)), ...extra];
write(PINS, pins);
console.log(`Pins: ${pins.length} (${pins.length - saved.length} new)`);

// 2. Recipes for pins that don't have one yet.
const recipes = read<Record<string, Recipe>>(RECIPES, {});
const todo = pins.filter((p) => !recipes[p.id]);
if (!process.env.AI_API_KEY) {
  console.log(`No AI_API_KEY set; skipping ${todo.length} recipes.`);
  process.exit(0);
}

let made = 0;
for (const pin of todo.slice(0, MAX_PER_RUN)) {
  try {
    recipes[pin.id] = await extractRecipe(pin);
    write(RECIPES, recipes); // save as we go, so a crash keeps earlier work
    made++;
    console.log(`✓ ${pin.id} ${recipes[pin.id].title_en}`);
  } catch (err) {
    if (err instanceof RateLimitError) {
      console.log("AI rate limit reached; the rest will be done next run.");
      break;
    }
    console.log(`✗ ${pin.id}: ${err instanceof Error ? err.message : err}`);
  }
}
console.log(`Recipes: ${made} new, ${todo.length - made} still waiting.`);
