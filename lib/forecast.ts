// Placeholder forecast model — deterministic, not real data. Once actual
// historical crowd/schedule data is wired in (see the OD ridership +
// GTFS-static sources), this is the module that gets replaced; the UI
// only depends on `hourlyForecast`'s shape, not how it's computed.

// Small string hash so the same route always renders the same "typical"
// pattern instead of reshuffling on every reload.
function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Bell-curve bias around the two commute rush windows, so the mock data
// still looks like a plausible transit crowding curve rather than noise.
function rushBias(hour: number): number {
  const morning = Math.exp(-((hour - 7.5) ** 2) / 3);
  const evening = Math.exp(-((hour - 18) ** 2) / 4);
  return Math.max(morning, evening);
}

export type HourForecast = { hour: number; crowdLevel: number }; // crowdLevel 0-100

export function hourlyForecast(routeId: string): HourForecast[] {
  const seed = hash(routeId);
  return Array.from({ length: 24 }, (_, hour) => {
    const noise = ((seed * (hour + 1)) % 37) / 37; // 0..1, stable per route+hour
    const level = rushBias(hour) * 75 + noise * 25;
    return { hour, crowdLevel: Math.round(Math.min(100, level)) };
  });
}

export function crowdLabel(level: number): string {
  if (level >= 70) return "Usually packed";
  if (level >= 40) return "Usually busy";
  if (level >= 15) return "Usually comfortable";
  return "Usually quiet";
}

export function forecastForTime(routeId: string, time: string): HourForecast {
  const hour = Number(time.split(":")[0] ?? 0);
  return hourlyForecast(routeId)[hour] ?? { hour, crowdLevel: 0 };
}
