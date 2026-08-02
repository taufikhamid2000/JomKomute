"use client";

// DuitDuit reads the locale cookie server-side (lib/get-dictionary.ts) and
// re-renders the whole tree on a Server Action + redirect. There's no
// server here to do that, so this is the client equivalent: a
// useSyncExternalStore-backed locale (same pattern as lib/store.ts's
// saved-routes store) that every component reads independently, no
// Context provider needed.

import { useCallback, useSyncExternalStore } from "react";
import { en } from "@/lib/dictionaries/en";
import { ms } from "@/lib/dictionaries/ms";
import { isLocale, LOCALE_STORAGE_KEY, type Locale } from "@/lib/i18n";

const dictionaries = { en, ms };

const listeners = new Set<() => void>();
let cachedLocale: Locale | null = null;

function readLocale(): Locale {
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(stored) ? stored : "en";
}

function getSnapshot(): Locale {
  if (cachedLocale === null) cachedLocale = readLocale();
  return cachedLocale;
}

function getServerSnapshot(): Locale {
  return "en";
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  function onStorage(e: StorageEvent) {
    if (e.key !== LOCALE_STORAGE_KEY) return;
    cachedLocale = null; // another tab wrote — force a re-read
    onChange();
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useDictionary() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLocale = useCallback((next: Locale) => {
    cachedLocale = next;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    listeners.forEach((l) => l());
  }, []);

  return { locale, t: dictionaries[locale], setLocale };
}
