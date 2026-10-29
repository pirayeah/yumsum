import type { Recipe } from "./types";

/** Calories and macros for one person. Doesn't change with the number of people. */
export function perPerson(recipe: Recipe) {
  const sum = (key: "kcal" | "protein_g" | "carbs_g" | "fat_g") =>
    recipe.ingredients.reduce((total, i) => total + (i[key] || 0), 0) / recipe.servings;
  return {
    kcal: Math.round(sum("kcal") / 10) * 10,
    protein: Math.round(sum("protein_g")),
    carbs: Math.round(sum("carbs_g")),
    fat: Math.round(sum("fat_g")),
  };
}
