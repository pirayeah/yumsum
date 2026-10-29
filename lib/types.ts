export const UNITS = ["g", "ml", "piece", "clove", "slice", "bunch", "can", "pinch", "to_taste"] as const;
export type Unit = (typeof UNITS)[number];

export type Category = "food" | "drink" | "dessert";

export type Ingredient = {
  name_en: string;
  name_fa: string;
  amount: number; // grams for "g", millilitres for "ml", a count otherwise
  unit: Unit;
  note_en: string;
  note_fa: string;
  // Nutrition for `amount` of this ingredient, as estimated by the AI.
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type Recipe = {
  title_en: string;
  title_fa: string;
  category: Category;
  servings: number;
  time_minutes: number;
  ingredients: Ingredient[];
  steps_en: string[];
  steps_fa: string[];
  estimated: boolean; // true when the AI inferred it rather than reading a written recipe
  source_url: string | null;
};

export type Pin = {
  id: string;
  title: string;
  description: string;
  link: string | null;
  image: string | null; // 564px wide, always available
  original: string | null; // full size, best guess; the UI falls back to `image`
  width: number;
  height: number;
  isVideo: boolean;
};

/** A recipe the AI invented from what you have at home (requested through a GitHub issue). */
export type Idea = {
  id: string; // the GitHub issue number
  ingredients: string;
  created: string;
  recipe: Recipe;
};

export type Lang = "fa" | "en";
