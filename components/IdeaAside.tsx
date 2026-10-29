"use client";

import { useLang } from "./LangProvider";

export function IdeaAside({ ingredients }: { ingredients: string }) {
  const { t } = useLang();
  return (
    <div className="panel idea-aside">
      <div className="spark">✨</div>
      <h2>{t.ideas}</h2>
      <p className="muted">
        {t.with} {ingredients}
      </p>
    </div>
  );
}
