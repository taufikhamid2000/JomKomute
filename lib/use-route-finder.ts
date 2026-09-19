"use client";

// Shared "manage origin/destination + call the routing engine + surface a
// not-found error" plumbing for the two separate "find a route" UIs
// (app/page.tsx's map-first one-time finder and components/route-form.tsx's
// /new page finder). They deliberately stay separate components — different
// downstream UIs (multiple RouteOption alternatives on a map vs. a single
// result feeding the leg-by-leg editor) — only this state/handler slice was
// duplicated between them.

import { useState } from "react";
import { allStationNames, findRoute, findRouteOptions, type RouteOption } from "@/lib/route-finder";
import type { RouteLeg } from "@/lib/types";

function useFinderFields() {
  const [origin, setOriginRaw] = useState("");
  const [destination, setDestinationRaw] = useState("");
  const [notFound, setNotFound] = useState(false);
  const stationNames = allStationNames();

  // Picking a new station clears any stale "not found" error from a
  // previous search, same as both call sites did locally before.
  function setOrigin(station: string) {
    setOriginRaw(station);
    setNotFound(false);
  }
  function setDestination(station: string) {
    setDestinationRaw(station);
    setNotFound(false);
  }

  return { origin, destination, notFound, setNotFound, setOrigin, setDestination, stationNames };
}

// app/page.tsx's home-screen finder — multiple route alternatives via
// findRouteOptions(), for the map-first "Where to?" flow.
export function useRouteFinderOptions() {
  const fields = useFinderFields();

  function find(): RouteOption[] | undefined {
    if (!fields.origin || !fields.destination) return undefined;
    const options = findRouteOptions(fields.origin, fields.destination);
    fields.setNotFound(!options);
    return options;
  }

  return { ...fields, find };
}

// components/route-form.tsx's /new page finder — a single best result via
// findRoute(), feeding directly into the leg-by-leg LegsEditor.
export function useSingleRouteFinder() {
  const fields = useFinderFields();

  function find(): RouteLeg[] | undefined {
    if (!fields.origin || !fields.destination) return undefined;
    const result = findRoute(fields.origin, fields.destination);
    fields.setNotFound(!result);
    return result;
  }

  return { ...fields, find };
}
