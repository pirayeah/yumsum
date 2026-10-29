import { notFound } from "next/navigation";
import { RecipeView } from "@/components/RecipeView";
import { loadPins, loadRecipes } from "@/lib/data";

export const dynamicParams = false;

export function generateStaticParams() {
  const ids = loadPins().map((p) => ({ id: p.id }));
  // A static export needs at least one page here, even before the first sync.
  return ids.length ? ids : [{ id: "0" }];
}

export default async function FoodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pin = loadPins().find((p) => p.id === id);
  if (!pin) notFound();
  return <RecipeView pin={pin} recipe={loadRecipes()[id] ?? null} />;
}
