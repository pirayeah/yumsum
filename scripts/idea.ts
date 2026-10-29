// Invents a recipe from what's at home. Run by the "Recipe idea" GitHub Action when you open an issue
// titled "Suggest: eggs, tomatoes, …". Locally: IDEA_TEXT="eggs, tomatoes" npm run idea
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Idea } from "../lib/types.ts";
import { askJson } from "./ai.ts";
import { normalize, RULES, SCHEMA } from "./recipe.ts";

const IDEAS = "data/ideas.json";
const text = (process.env.IDEA_TEXT || "").replace(/^\s*suggest\s*:/i, "").trim();
const id = process.env.IDEA_ID || String(Date.now());
if (!text) {
  console.error("Nothing to cook with: set IDEA_TEXT.");
  process.exit(1);
}

const SYSTEM = `You suggest one home-cooking recipe for a cook in Iran, built mainly from the ingredients they already have. Reply with one JSON object only.

- Pick a dish that uses as many of their ingredients as sensibly fit together. You don't have to use all of them.
- Assume they also have salt, water, cooking oil, black pepper, turmeric and other common Iranian pantry spices.
- Avoid adding anything else; if one or two more ingredients would make a much better dish, you may add them and say so in that ingredient's note ("buy" / "باید خرید").
- Prefer dishes that are realistic on a weeknight. Persian dishes are welcome, but so is anything else that fits.
- Set estimated=false.

${RULES}`;

const data = await askJson(SYSTEM, [{ type: "text", text: `Ingredients at home: ${text}` }], SCHEMA);
const recipe = normalize(data as Record<string, unknown>, { title: "", link: null }, true);

const ideas: Idea[] = existsSync(IDEAS) ? JSON.parse(readFileSync(IDEAS, "utf8")) : [];
const idea: Idea = { id, ingredients: text, created: new Date().toISOString(), recipe };
writeFileSync(IDEAS, JSON.stringify([idea, ...ideas.filter((i) => i.id !== id)], null, 1) + "\n");

// A short reply for the GitHub issue.
const siteUrl = process.env.SITE_URL ? `${process.env.SITE_URL.replace(/\/$/, "")}/idea/${id}/` : "";
const reply = [
  `### ${recipe.title_fa} · ${recipe.title_en}`,
  "",
  ...recipe.ingredients.map((i) => `- ${i.name_fa} · ${i.name_en}${i.note_en ? ` (${i.note_en})` : ""}`),
  "",
  siteUrl ? `Full recipe with amounts for any number of people: ${siteUrl} (live in a minute or two)` : "",
].join("\n");
writeFileSync(process.env.REPLY_FILE || "idea-reply.md", reply);
console.log(reply);
