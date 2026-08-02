export const LOCALE_STORAGE_KEY = "jomkomute.locale";
export const LOCALES = ["en", "ms"] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
