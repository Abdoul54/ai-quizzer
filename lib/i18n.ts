import { getDirection, type LanguageCode } from "./languages";

// ─── Locale imports ───────────────────────────────────────────────────────────

import en from "@/lib/locales/en.json";
import fr from "@/lib/locales/fr.json";
import ar from "@/lib/locales/ar.json";
import es from "@/lib/locales/es.json";
import pt from "@/lib/locales/pt.json";
import it from "@/lib/locales/it.json";
import de from "@/lib/locales/de.json";
import ru from "@/lib/locales/ru.json";

// ─── Translation map ──────────────────────────────────────────────────────────

const locales = { en, fr, ar, es, pt, it, de, ru } as const;

export type TranslationKey = keyof typeof en;

// ─── Translate function ───────────────────────────────────────────────────────

export function t(
    key: TranslationKey,
    lang: LanguageCode,
    vars?: Record<string, string | number>,
): string {
    const locale = locales[lang as keyof typeof locales] ?? locales.en;

    const text =
        (locale as Record<string, string>)[key] ??
        (locales.en as Record<string, string>)[key] ??
        key;

    return interpolate(text, vars);
}

// ─── Convenience: build a bound t() for a fixed language ─────────────────────

export function createT(lang: LanguageCode) {
    return (key: TranslationKey, vars?: Record<string, string | number>) => t(key, lang, vars);
}

// ─── Dir helper (re-exported for convenience) ─────────────────────────────────

// ─── Interpolation helper ─────────────────────────────────────────────────────

function interpolate(
    template: string,
    vars?: Record<string, string | number>,
): string {
    if (!vars) return template;

    return template.replace(/\{(\w+)\}/g, (_, key) =>
        key in vars ? String(vars[key]) : `{${key}}`,
    );
}

export { getDirection };