import { FoodGrid, type GridItem } from "@/components/FoodGrid";
import { loadPins, loadRecipes } from "@/lib/data";

export default function Home() {
  const recipes = loadRecipes();
  const items: GridItem[] = loadPins().map((p) => {
    const r = recipes[p.id];
    return {
      id: p.id,
      thumb: p.image,
      isVideo: p.isVideo,
      pinTitle: p.title || p.description.split(/[.\n]/)[0].slice(0, 60),
      recipe: r ? { title_en: r.title_en, title_fa: r.title_fa, category: r.category } : null,
    };
  });
  return <FoodGrid items={items} repo={process.env.NEXT_PUBLIC_REPO ?? null} />;
}
