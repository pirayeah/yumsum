"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Category, Recipe } from "@/lib/types";
import { num } from "@/lib/units";
import { LangToggle, useLang } from "./LangProvider";

export type GridItem = {
  id: string;
  thumb: string | null;
  isVideo: boolean;
  pinTitle: string;
  recipe: Pick<Recipe, "title_en" | "title_fa" | "category"> | null;
};

const FILTERS: ("all" | Category)[] = ["all", "food", "drink", "dessert"];

export function FoodGrid({ items, repo }: { items: GridItem[]; repo: string | null }) {
  const { lang, t } = useLang();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");

  const title = (i: GridItem) => (i.recipe ? (lang === "fa" ? i.recipe.title_fa : i.recipe.title_en) : i.pinTitle);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (filter === "all" || i.recipe?.category === filter) &&
        (!q || [i.pinTitle, i.recipe?.title_en, i.recipe?.title_fa].some((s) => s?.toLowerCase().includes(q))),
    );
  }, [items, filter, query]);

  return (
    <main className="wrap">
      <div className="top">
        <h1 className="brand">{t.appName}</h1>
        <LangToggle />
      </div>

      <Link href="/pantry/" className="cta">
        <span>🧺 {t.cook}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </Link>

      <div className="toolbar">
        <input className="search" placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f} className={`chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
              {t[f]}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="empty">{items.length === 0 ? t.empty : t.noMatch}</p>
      ) : (
        <div className="grid">
          {shown.map((i) => (
            <Link key={i.id} href={`/food/${i.id}/`} className="card">
              <div className="square">
                {i.thumb && <img src={i.thumb} alt="" loading="lazy" />}
                {i.isVideo && (
                  <span className="play" aria-label="video">
                    <svg width="12" height="12" viewBox="0 0 12 12">
                      <path d="M3 1.5v9l7.5-4.5z" fill="#1c1c1e" />
                    </svg>
                  </span>
                )}
              </div>
              <div className={`card-title ${i.recipe ? "" : "pending"}`}>{title(i) || t.untitled}</div>
            </Link>
          ))}
        </div>
      )}

      {repo && <AddPins repo={repo} />}
    </main>
  );
}

const PIN_LINK = /https?:\/\/(?:[a-z]+\.)?(?:pinterest\.[a-z.]+\/pin\/[^\s]+|pin\.it\/[^\s]+)/gi;

/** Opens a GitHub issue with the links; the "Add pins" Action adds them to extra-pins.txt. */
function AddPins({ repo }: { repo: string }) {
  const { lang, t } = useLang();
  const [text, setText] = useState("");
  const links = [...new Set(text.match(PIN_LINK) ?? [])];

  const issueUrl =
    `https://github.com/${repo}/issues/new?` +
    new URLSearchParams({
      title: `Add pins (${links.length})`,
      body: `${links.join("\n")}\n\nPress "Submit new issue". The pins appear on the site in a few minutes.`,
    });

  return (
    <details className="addpins">
      <summary>+ {t.addOlder}</summary>
      <p>{t.addOlderHint}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"https://www.pinterest.com/pin/123456789/\nhttps://pin.it/abc123"}
      />
      <a
        className={`btn ${links.length ? "" : "disabled"}`}
        href={links.length ? issueUrl : undefined}
        target="_blank"
        rel="noreferrer"
      >
        {t.addPinsButton(num(links.length, lang))}
      </a>
    </details>
  );
}
