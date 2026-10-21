"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// false during SSR and the hydration render, true afterward — for UI that
// depends on browser-only state (localStorage, matchMedia, ...) and must
// not mismatch the server-rendered HTML.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
