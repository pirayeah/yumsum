"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { parseList, rank } from "@/lib/pantry";
import type { Idea, Recipe } from "@/lib/types";
import { num } from "@/lib/units";
import { LangToggle, useLang } from "./LangProvider";

const PANTRY_KEY = "yumsum:pantry";

export function PantryView({
  recipes,
  thumbs,
  ideas,
  repo,
}: {
  recipes: Record<string, Recipe>;
  thumbs: Record<string, string | null>;
  ideas: Idea[];
  repo: string | null;
}) {
  const { lang, t } = useLang();
  const [text, setText] = useState("");

  useEffect(() => {
    try {
      setText(localStorage.getItem(PANTRY_KEY) ?? "");
    } catch {}
  }, []);

  function update(value: string) {
    setText(value);
    try {
      localStorage.setItem(PANTRY_KEY, value);
    } catch {}
  }

  const have = useMemo(() => parseList(text), [text]);
  const matches = useMemo(() => rank(recipes, have).slice(0, 24), [recipes, have]);
  const name = (r: Recipe) => (lang === "fa" ? r.title_fa : r.title_en);

  // The GitHub Action picks up issues titled "Suggest: …" opened by the repo owner.
  const issueUrl =
    repo &&
    `https://github.com/${repo}/issues/new?` +
      new URLSearchParams({
        title: `Suggest: ${text.split(/[,،\n]+/).map((s) => s.trim()).filter(Boolean).join(", ")}`,
        body: `Language: ${lang}\n\nPress "Submit new issue". The recipe appears on the site in a few minutes.`,
      });

  return (
    <main className="wrap">
      <div className="top">
        <Link href="/" className="back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {t.back}
        </Link>
        <LangToggle />
      </div>

      <h1 className="title">{t.pantryTitle}</h1>
      <p className="muted">{t.pantryHint}</p>
      <textarea
        className="pantry"
        value={text}
        onChange={(e) => update(e.target.value)}
        placeholder={t.pantryPlaceholder}
        rows={3}
      />

      <h2 className="section">{t.fromBoard}</h2>
      {have.length === 0 ? (
        <p className="muted">{t.nothingYet}</p>
      ) : matches.length === 0 ? (
        <p className="muted">{t.noneMatch}</p>
      ) : (
        <ul className="matches">
          {matches.map((m) => (
            <li key={m.id}>
              <Link href={`/food/${m.id}/`}>
                {thumbs[m.id] ? <img src={thumbs[m.id]!} alt="" loading="lazy" /> : <span className="thumb" />}
                <div>
                  <b>{name(recipes[m.id])}</b>
                  <div className="bar">
                    <span style={{ width: `${(m.have / m.total) * 100}%` }} />
                  </div>
                  <small>{t.youHave(num(m.have, lang), num(m.total, lang))}</small>
                  {m.missing.length > 0 && (
                    <small className="miss">
                      {t.missing} {m.missing.map((i) => (lang === "fa" ? i.name_fa : i.name_en)).join(lang === "fa" ? "، " : ", ")}
                    </small>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {issueUrl && (
        <div className="panel ask">
          <a
            className={`btn ${have.length === 0 ? "disabled" : ""}`}
            href={have.length ? issueUrl : undefined}
            target="_blank"
            rel="noreferrer"
          >
            ✨ {t.askAi}
          </a>
          <small className="muted">{t.askAiHint}</small>
        </div>
      )}

      {ideas.length > 0 && (
        <>
          <h2 className="section">{t.ideas}</h2>
          <ul className="matches">
            {ideas.map((idea) => (
              <li key={idea.id}>
                <Link href={`/idea/${idea.id}/`}>
                  <span className="thumb">✨</span>
                  <div>
                    <b>{name(idea.recipe)}</b>
                    <small>
                      {t.with} {idea.ingredients}
                    </small>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
