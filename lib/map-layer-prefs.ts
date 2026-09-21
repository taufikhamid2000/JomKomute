"use client";

// Persisted on/off switches for the home screen map's optional layers
// (components/home-map.tsx's "layers" toggle panel, app/page.tsx). Same
// useSyncExternalStore-backed localStorage pattern as lib/use-dictionary.ts
// — every component reads independently, no Context provider, and it
// stays in sync across tabs for free via the native "storage" event.

import { useCallback, useSyncExternalStore } from "react";

export type MapLayerPrefs = {
  // Whether tapping a station on the map opens the report flow for it
  // (see components/home-map.tsx's pickableStations/onPickStation).
  stationsClickable: boolean;
  // Whether nearby report clusters render on the map at all.
  showReports: boolean;
  // Whether visible station markers get a permanent name label.
  showStationNames: boolean;
};

const DEFAULT_PREFS: MapLayerPrefs = {
  stationsClickable: true,
  showReports: true,
  // Off by default — labelling every visible station at once (the full
  // idle-map pickable overlay can be ~190 stations) would be far too
  // noisy to have on unconditionally.
  showStationNames: false,
};

const STORAGE_KEY = "jomkomute.mapLayers";

const listeners = new Set<() => void>();
let cached: MapLayerPrefs | null = null;

function readPrefs(): MapLayerPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<MapLayerPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function getSnapshot(): MapLayerPrefs {
  if (cached === null) cached = readPrefs();
  return cached;
}

function getServerSnapshot(): MapLayerPrefs {
  return DEFAULT_PREFS;
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

export function useMapLayerPrefs() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setPref = useCallback(<K extends keyof MapLayerPrefs>(key: K, value: MapLayerPrefs[K]) => {
    const next = { ...getSnapshot(), [key]: value };
    cached = next;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    listeners.forEach((l) => l());
  }, []);

  return { prefs, setPref };
}
