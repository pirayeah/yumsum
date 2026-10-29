import { existsSync, readFileSync } from "fs";
import path from "path";
import type { Idea, Pin, Recipe } from "./types";

// Read at build time; scripts/sync.ts keeps these files up to date.
function read<T>(file: string, fallback: T): T {
  const p = path.join(process.cwd(), "data", file);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback;
}

export const loadPins = () => read<Pin[]>("pins.json", []);
export const loadRecipes = () => read<Record<string, Recipe>>("recipes.json", {});
export const loadIdeas = () => read<Idea[]>("ideas.json", []);
