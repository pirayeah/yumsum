import { notFound } from "next/navigation";
import { IdeaAside } from "@/components/IdeaAside";
import { RecipeView } from "@/components/RecipeView";
import { loadIdeas } from "@/lib/data";

export const dynamicParams = false;

export function generateStaticParams() {
  const ids = loadIdeas().map((i) => ({ id: i.id }));
  // A static export needs at least one page here, even before the first idea.
  return ids.length ? ids : [{ id: "0" }];
}

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idea = loadIdeas().find((i) => i.id === id);
  if (!idea) notFound();
  return (
    <RecipeView pin={null} recipe={idea.recipe} backHref="/pantry/" aside={<IdeaAside ingredients={idea.ingredients} />} />
  );
}
