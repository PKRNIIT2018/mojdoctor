"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@web/lib/i18n";
import { Button } from "@web/components/ui/button";

export function LocaleSwitcher() {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem("locale") as Locale | null;
    if (stored === "en" || stored === "sk") {
      setLocale(stored);
    }
  }, []);

  function switchLocale(l: Locale) {
    localStorage.setItem("locale", l);
    setLocale(l);
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={locale === "en" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => switchLocale("en")}
        aria-label="Switch to English"
      >
        EN
      </Button>
      <span className="text-xs text-muted-foreground">|</span>
      <Button
        variant={locale === "sk" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => switchLocale("sk")}
        aria-label="Prepnúť na slovenčinu"
      >
        SK
      </Button>
    </div>
  );
}
