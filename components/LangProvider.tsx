"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { STRINGS, type Strings } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

const LangContext = createContext<{ lang: Lang; t: Strings; setLang: (l: Lang) => void } | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fa");

  useEffect(() => {
    if (document.documentElement.lang === "en") setLangState("en");
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
    } catch {}
    document.documentElement.lang = l;
    document.documentElement.dir = l === "fa" ? "rtl" : "ltr";
  }

  return <LangContext.Provider value={{ lang, t: STRINGS[lang] as Strings, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="seg" role="group" aria-label="Language">
      <button className={lang === "fa" ? "on" : ""} onClick={() => setLang("fa")}>
        فا
      </button>
      <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>
        EN
      </button>
    </div>
  );
}
