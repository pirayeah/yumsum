import { PantryView } from "@/components/PantryView";
import { loadIdeas, loadPins, loadRecipes } from "@/lib/data";

export default function PantryPage() {
  const thumbs = Object.fromEntries(loadPins().map((p) => [p.id, p.image]));
  return (
    <PantryView
      recipes={loadRecipes()}
      thumbs={thumbs}
      ideas={loadIdeas()}
      repo={process.env.NEXT_PUBLIC_REPO ?? null}
    />
  );
}
