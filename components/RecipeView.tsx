"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { perPerson } from "@/lib/nutrition";
import type { Pin, Recipe } from "@/lib/types";
import { formatAmount, num } from "@/lib/units";
import { LangToggle, useLang } from "./LangProvider";
import { Photo, PinterestPlayer } from "./PinMedia";

const PEOPLE_KEY = "yumsum:people";

function savedPeople(): number | null {
  try {
    const n = Number(localStorage.getItem(PEOPLE_KEY));
    return n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** A recipe page. `pin` is null for AI ideas, which have no photo; `aside` replaces the media then. */
export function RecipeView({
  pin,
  recipe,
  backHref = "/",
  aside,
}: {
  pin: Pin | null;
  recipe: Recipe | null;
  backHref?: string;
  aside?: ReactNode;
}) {
  const { lang, t } = useLang();
  const [people, setPeople] = useState<number | null>(null);

  // Default to however many people you last cooked for.
  useEffect(() => {
    if (recipe) setPeople(savedPeople() ?? recipe.servings);
  }, [recipe]);

  function changePeople(n: number) {
    const next = Math.min(50, Math.max(1, n));
    setPeople(next);
    try {
      localStorage.setItem(PEOPLE_KEY, String(next));
    } catch {}
  }

  const servings = people ?? recipe?.servings ?? 1;
  const factor = recipe ? servings / recipe.servings : 1;
  const steps = recipe ? (lang === "fa" ? recipe.steps_fa : recipe.steps_en) : [];
  const nutrition = recipe ? perPerson(recipe) : null;

  return (
    <main className="wrap">
      <div className="top">
        <Link href={backHref} className="back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {t.back}
        </Link>
        <LangToggle />
      </div>

      <div className="food">
        <section>
          {pin ? (
            <>
              <div className="media">{pin.isVideo ? <PinterestPlayer pin={pin} /> : <Photo pin={pin} />}</div>
              <div className="links">
                <a className="pill" href={`https://www.pinterest.com/pin/${pin.id}/`} target="_blank" rel="noreferrer">
                  {t.onPinterest} ↗
                </a>
                {recipe?.source_url && (
                  <a className="pill" href={recipe.source_url} target="_blank" rel="noreferrer">
                    {t.source} ↗
                  </a>
                )}
              </div>
            </>
          ) : (
            aside
          )}
        </section>

        <section>
          {!recipe ? (
            <div className="note">{t.pending}</div>
          ) : (
            <>
              <h1 className="title">{lang === "fa" ? recipe.title_fa : recipe.title_en}</h1>
              <div className="meta">
                {recipe.time_minutes > 0 && (
                  <span className="pill">
                    ⏱ {num(recipe.time_minutes, lang)} {t.minutes}
                  </span>
                )}
                <span className="pill">{t[recipe.category]}</span>
              </div>
              {recipe.estimated && pin && <div className="note">{t.estimated}</div>}

              <div className="panel">
                <div className="panel-head">
                  <h2>{t.ingredients}</h2>
                  <div className="stepper">
                    <button onClick={() => changePeople(servings - 1)} disabled={servings <= 1} aria-label="-">
                      −
                    </button>
                    <span>
                      {num(servings, lang)} {t.people}
                    </span>
                    <button onClick={() => changePeople(servings + 1)} disabled={servings >= 50} aria-label="+">
                      +
                    </button>
                  </div>
                </div>
                <ul className="ings">
                  {recipe.ingredients.map((ing, i) => {
                    const note = lang === "fa" ? ing.note_fa : ing.note_en;
                    return (
                      <li key={i}>
                        <span>
                          {lang === "fa" ? ing.name_fa : ing.name_en}
                          {note && <small>{note}</small>}
                        </span>
                        <span className="amt">{formatAmount(ing, factor, lang)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {nutrition && nutrition.kcal > 0 && (
                <div className="panel">
                  <div className="panel-head">
                    <h2>{t.nutrition}</h2>
                  </div>
                  <div className="nutri">
                    <div className="kcal">
                      <b>{num(nutrition.kcal, lang)}</b>
                      <span>{t.kcal}</span>
                    </div>
                    {(
                      [
                        [t.protein, nutrition.protein],
                        [t.carbs, nutrition.carbs],
                        [t.fat, nutrition.fat],
                      ] as const
                    ).map(([label, grams]) => (
                      <div key={label}>
                        <b>
                          {num(grams, lang)} {t.gram}
                        </b>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                  <small className="muted">{t.nutritionNote}</small>
                </div>
              )}

              <div className="panel">
                <div className="panel-head">
                  <h2>{t.steps}</h2>
                </div>
                <ol className="steps">
                  {steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
