"use client";

// Client-only persistence for the UI prototype — localStorage, no backend
// yet. Swap this module for real Supabase-backed calls once the data layer
// is built; components only import the hooks below, not the storage
// mechanism.
//
// Built on useSyncExternalStore (not useState+useEffect) since that's the
// React-blessed way to read a mutable external source like localStorage
// without a setState-in-effect render cascade, and it keeps same-tab and
// cross-tab (native "storage" event) updates in sync for free.

import { useCallback, useSyncExternalStore } from "react";
import type { DistributiveOmit, Exception, SavedRoute } from "@/lib/types";

const ROUTES_KEY = "transit.routes";
const EXCEPTIONS_KEY = "transit.exceptions";

function readFromStorage<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

// SavedRoute's shape changed (single line/origin/destination -> a legs
// array) — a route saved before that change would crash the routes list
// (e.g. `route.legs[0]` on undefined) rather than just look wrong, so drop
// anything that doesn't match the current shape instead of rendering it.
function isValidRoute(value: unknown): value is SavedRoute {
  const route = value as Partial<SavedRoute> | null | undefined;
  return !!route && Array.isArray(route.legs) && route.legs.length > 0;
}

// Mirrors localStorage in memory so getSnapshot can return a stable
// reference — useSyncExternalStore compares snapshots with Object.is, and
// a fresh JSON.parse on every call would never be equal to the last one.
const cache = new Map<string, unknown[]>();
const listeners = new Map<string, Set<() => void>>();
const EMPTY: never[] = [];

function getCached<T>(key: string): T[] {
  if (typeof window === "undefined") return EMPTY;
  if (!cache.has(key)) {
    const value = readFromStorage<T>(key);
    cache.set(key, key === ROUTES_KEY ? (value as unknown[]).filter(isValidRoute) : value);
  }
  return cache.get(key) as T[];
}

function setCached<T>(key: string, value: T[]) {
  cache.set(key, value);
  window.localStorage.setItem(key, JSON.stringify(value));
  listeners.get(key)?.forEach((l) => l());
}

function subscribe(key: string, onChange: () => void) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(onChange);

  function onStorage(e: StorageEvent) {
    if (e.key !== key) return;
    cache.delete(key); // another tab wrote — force a re-read on next getSnapshot
    onChange();
  }
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.get(key)?.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useSavedRoutes() {
  const routes = useSyncExternalStore(
    (onChange) => subscribe(ROUTES_KEY, onChange),
    () => getCached<SavedRoute>(ROUTES_KEY),
    () => EMPTY
  );

  const addRoute = useCallback((route: Omit<SavedRoute, "id" | "createdAt">) => {
    const next: SavedRoute = { ...route, id: newId(), createdAt: new Date().toISOString() };
    setCached(ROUTES_KEY, [...getCached<SavedRoute>(ROUTES_KEY), next]);
    return next;
  }, []);

  const removeRoute = useCallback((id: string) => {
    setCached(
      ROUTES_KEY,
      getCached<SavedRoute>(ROUTES_KEY).filter((r) => r.id !== id)
    );
    setCached(
      EXCEPTIONS_KEY,
      getCached<Exception>(EXCEPTIONS_KEY).filter((e) => e.routeId !== id)
    );
  }, []);

  return { routes, addRoute, removeRoute };
}

export function useExceptions(routeId: string) {
  const all = useSyncExternalStore(
    (onChange) => subscribe(EXCEPTIONS_KEY, onChange),
    () => getCached<Exception>(EXCEPTIONS_KEY),
    () => EMPTY
  );
  const exceptions = all.filter((e) => e.routeId === routeId);

  const addException = useCallback((exception: DistributiveOmit<Exception, "id" | "createdAt">) => {
    const next = { ...exception, id: newId(), createdAt: new Date().toISOString() } as Exception;
    setCached(EXCEPTIONS_KEY, [...getCached<Exception>(EXCEPTIONS_KEY), next]);
    return next;
  }, []);

  const removeException = useCallback((id: string) => {
    setCached(
      EXCEPTIONS_KEY,
      getCached<Exception>(EXCEPTIONS_KEY).filter((e) => e.id !== id)
    );
  }, []);

  return { exceptions, addException, removeException };
}
