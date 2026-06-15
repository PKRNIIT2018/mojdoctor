import { en } from "./en";
import { sk } from "./sk";

export type Locale = "en" | "sk";

const dictionaries = { en, sk } as const;

function resolvePath(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof current === "string" ? current : String(current);
}

export function t(locale: Locale, path: string, vars?: Record<string, string | number>): string {
  const dict = dictionaries[locale] ?? en;
  let text = resolvePath(dict as unknown as Record<string, unknown>, path);
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      text = text.replace(`{${key}}`, String(value));
    }
  }
  return text;
}

export function useTranslation(locale: Locale) {
  return {
    locale,
    t: (path: string, vars?: Record<string, string | number>) => t(locale, path, vars),
  };
}

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language?.toLowerCase() || "";
  if (lang.startsWith("sk") || lang.startsWith("cs")) return "sk";
  return "en";
}
