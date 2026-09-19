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

// SavedRoute's shape changed twice: originally a single line/origin/
// destination, then a frozen `legs` array (+ optional `alternateLegs`),
// and now back to just origin/destination — legs are computed live via
// lib/route-finder.ts's findRoute() instead of being stored. A route
// saved under the `legs`-array shape is upgraded in place: origin comes
// from its first leg, destination from its last leg, and `legs`/
// `alternateLegs` are dropped. Detection: has a nonempty `legs` array but
// no top-level `originStation` string yet.
type LegacyLegsRoute = { legs: { originStation: string; destinationStation: string }[] };

function isLegacyLegsRoute(value: unknown): value is LegacyLegsRoute {
  const route = value as { legs?: unknown; originStation?: unknown } | null | undefined;
  return !!route && Array.isArray(route.legs) && route.legs.length > 0 && typeof route.originStation !== "string";
}

function migrateRoute(value: unknown): unknown {
  if (!isLegacyLegsRoute(value)) return value;
  const legs = value.legs;
  const { legs: _legs, alternateLegs: _alternateLegs, ...rest } = value as LegacyLegsRoute & Record<string, unknown>;
  return {
    ...rest,
    originStation: legs[0].originStation,
    destinationStation: legs[legs.length - 1].destinationStation,
  };
}

// A route saved before either shape change would crash the routes list
// (e.g. reading `originStation` off something that has neither it nor a
// `legs` array) rather than just look wrong, so drop anything that still
// doesn't match the current shape after migration instead of rendering it.
function isValidRoute(value: unknown): value is SavedRoute {
  const route = value as Partial<SavedRoute> | null | undefined;
  return !!route && typeof route.originStation === "string" && typeof route.destinationStation === "string";
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
    if (key === ROUTES_KEY) {
      cache.set(key, migrateRoutes(value as unknown[]) as unknown[]);
    } else {
      cache.set(key, value);
    }
  }
  return cache.get(key) as T[];
}

// Upgrades any legacy-shaped routes (see migrateRoute above) and drops
// anything still invalid afterward, then — only if migration actually
// changed something — writes the upgraded array back to localStorage, so
// this runs once per route rather than re-migrating on every read. Called
// from getCached for both the initial readFromStorage path and any fresh
// read triggered by a cross-tab storage event (subscribe's onStorage
// deletes the cache entry, forcing the next getSnapshot back through here).
function migrateRoutes(value: unknown[]): unknown[] {
  let changed = false;
  const migrated = value.map((v) => {
    const upgraded = migrateRoute(v);
    if (upgraded !== v) changed = true;
    return upgraded;
  });
  const valid = migrated.filter(isValidRoute);
  if (valid.length !== migrated.length) changed = true;

  if (changed) {
    try {
      window.localStorage.setItem(ROUTES_KEY, JSON.stringify(valid));
    } catch {
      // Best-effort write-back — migration still applies in memory even
      // if persisting it fails (e.g. storage quota, private mode).
    }
  }

  return valid;
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

  // Only one route can be Home at a time — setting it on one clears it
  // from every other saved route in the same write.
  const setHomeRoute = useCallback((id: string) => {
    setCached(
      ROUTES_KEY,
      getCached<SavedRoute>(ROUTES_KEY).map((r) => (r.id === id ? { ...r, isHome: true } : r.isHome ? { ...r, isHome: false } : r))
    );
  }, []);

  // Unsets Home without picking a new one.
  const clearHomeRoute = useCallback((id: string) => {
    setCached(
      ROUTES_KEY,
      getCached<SavedRoute>(ROUTES_KEY).map((r) => (r.id === id ? { ...r, isHome: false } : r))
    );
  }, []);

  // Only one route can be Work at a time — same pattern as setHomeRoute,
  // but an independent slot: a route can be Home and Work simultaneously.
  const setWorkRoute = useCallback((id: string) => {
    setCached(
      ROUTES_KEY,
      getCached<SavedRoute>(ROUTES_KEY).map((r) => (r.id === id ? { ...r, isWork: true } : r.isWork ? { ...r, isWork: false } : r))
    );
  }, []);

  // Unsets Work without picking a new one.
  const clearWorkRoute = useCallback((id: string) => {
    setCached(
      ROUTES_KEY,
      getCached<SavedRoute>(ROUTES_KEY).map((r) => (r.id === id ? { ...r, isWork: false } : r))
    );
  }, []);

  return { routes, addRoute, removeRoute, setHomeRoute, clearHomeRoute, setWorkRoute, clearWorkRoute };
}

// Not routeId-scoped — used by the dashboard's "Change plan" modal, which
// needs to add a skip exception to every saved route at once (see
// SkipReason in lib/types.ts for why).
export function addExceptionRecord(exception: DistributiveOmit<Exception, "id" | "createdAt">): Exception {
  const next = { ...exception, id: newId(), createdAt: new Date().toISOString() } as Exception;
  setCached(EXCEPTIONS_KEY, [...getCached<Exception>(EXCEPTIONS_KEY), next]);
  return next;
}

export function useAllExceptions() {
  return useSyncExternalStore(
    (onChange) => subscribe(EXCEPTIONS_KEY, onChange),
    () => getCached<Exception>(EXCEPTIONS_KEY),
    () => EMPTY
  );
}

export function useExceptions(routeId: string) {
  const all = useAllExceptions();
  const exceptions = all.filter((e) => e.routeId === routeId);

  const addException = useCallback((exception: DistributiveOmit<Exception, "id" | "createdAt">) => addExceptionRecord(exception), []);

  const removeException = useCallback((id: string) => {
    setCached(
      EXCEPTIONS_KEY,
      getCached<Exception>(EXCEPTIONS_KEY).filter((e) => e.id !== id)
    );
  }, []);

  return { exceptions, addException, removeException };
}
