"use client";

import { LOCALES, type Locale } from "@/lib/i18n";
import { useDictionary } from "@/lib/use-dictionary";

// Unlike theme/accent (batched behind Save — see AppearanceForm), a
// locale switch applies immediately on click. DuitDuit's equivalent is
// also immediate (a Server Action + redirect per click, not part of its
// dirty-state flow) since re-rendering in the new language is instant
// either way — there's nothing worth previewing first.
export function LanguagePicker() {
  const { locale, t, setLocale } = useDictionary();

  const LANGUAGE_LABEL: Record<Locale, string> = {
    en: t.settings.languageEnglish,
    ms: t.settings.languageMalay,
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-foreground/60">{t.settings.language}</h2>
      <div className="flex gap-2">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            aria-pressed={locale === l}
            className={
              locale === l
                ? "cursor-pointer rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                : "cursor-pointer rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            }
          >
            {LANGUAGE_LABEL[l]}
          </button>
        ))}
      </div>
    </section>
  );
}
