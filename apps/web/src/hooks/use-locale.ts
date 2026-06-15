"use client";

import { useState, useEffect } from "react";
import { detectLocale } from "@web/lib/i18n";
import type { Locale } from "@web/lib/i18n";

export function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem("locale") as Locale | null;
    if (stored === "en" || stored === "sk") {
      setLocale(stored);
    } else {
      setLocale(detectLocale());
    }
  }, []);

  return locale;
}
