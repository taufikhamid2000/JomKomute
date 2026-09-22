"use client";

// Persisted "follow this line" set for app/line-status — same
// useSyncExternalStore-backed localStorage pattern as
// lib/map-layer-prefs.ts, so every component reads independently and it
// stays in sync across tabs for free via the native "storage" event. A
// plain Set in memory, serialized as an array in storage.

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "jomkomute.followedLines";

const listeners = new Set<() => void>();
let cached: Set<string> | null = null;

function readFollowed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function getSnapshot(): Set<string> {
  if (cached === null) cached = readFollowed();
  return cached;
}

function getServerSnapshot(): Set<string> {
  return new Set();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  function onStorage(e: StorageEvent) {
    if (e.key !== STORAGE_KEY) return;
    cached = null;
    onChange();
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useFollowedLines() {
  const followed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleFollowed = useCallback((lineId: string) => {
    const next = new Set(getSnapshot());
    if (next.has(lineId)) next.delete(lineId);
    else next.add(lineId);
    cached = next;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    listeners.forEach((l) => l());
  }, []);

  return { followed, toggleFollowed };
}
