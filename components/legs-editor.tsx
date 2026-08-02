"use client";

import { LINES, lineById, linesServing, stationNameOnLine, type LineId } from "@/lib/lines";
import type { RouteLeg } from "@/lib/types";
import { useDictionary } from "@/lib/use-dictionary";

// Editing an earlier leg invalidates whatever came after it (a changed
// line/destination might not even be an interchange for the next leg
// anymore) — simplest correct behavior is to drop everything after the
// edited leg and let the user re-add transfers from there.
export function LegsEditor({ legs, onChange }: { legs: RouteLeg[]; onChange: (legs: RouteLeg[]) => void }) {
  const { t } = useDictionary();

  function setLegLine(index: number, lineId: LineId) {
    const leg = legs[index];
    // A transfer leg's origin is the interchange station — but the new
    // line might call it something else (Glenmarie vs. Glenmarie 2), so
    // resolve to whatever name that line actually uses.
    const origin = index === 0 ? leg.originStation : (stationNameOnLine(leg.originStation, lineId) ?? leg.originStation);
    const updated: RouteLeg = { ...leg, line: lineId, originStation: origin, destinationStation: "" };
    onChange([...legs.slice(0, index), updated]);
  }

  function setLegOrigin(index: number, station: string) {
    onChange([...legs.slice(0, index), { ...legs[index], originStation: station, destinationStation: "" }]);
  }

  function setLegDestination(index: number, station: string) {
    onChange(legs.slice(0, index + 1).map((l, i) => (i === index ? { ...l, destinationStation: station } : l)));
  }

  function addTransfer() {
    const last = legs[legs.length - 1];
    if (!last.destinationStation) return;
    const options = linesServing(last.destinationStation, last.line);
    if (options.length === 0) return;
    const nextLine = options[0];
    const origin = stationNameOnLine(last.destinationStation, nextLine.id) ?? last.destinationStation;
    onChange([...legs, { line: nextLine.id, originStation: origin, destinationStation: "" }]);
  }

  function removeLastTransfer() {
    if (legs.length <= 1) return;
    onChange(legs.slice(0, -1));
  }

  const last = legs[legs.length - 1];
  const transferOptions = last?.destinationStation ? linesServing(last.destinationStation, last.line) : [];

  return (
    <div className="flex flex-col gap-4">
      {legs.map((leg, index) => {
        const line = lineById(leg.line) ?? LINES[0];
        const isFirst = index === 0;
        const previousLine = isFirst ? undefined : legs[index - 1].line;
        // Options must include the leg's own current line, or its <select>
        // would show a value that isn't in the list — only the previous
        // leg's line is excluded (transferring onto the same line you're
        // already on isn't a transfer).
        const lineOptions = isFirst ? LINES : linesServing(leg.originStation, previousLine ?? "");

        return (
          <div key={index} className="flex flex-col gap-3 rounded-2xl border border-border p-3">
            {!isFirst && (
              <p className="text-xs font-medium text-foreground/50">{t.legsEditor.transferAt(leg.originStation)}</p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">{t.legsEditor.line}</label>
                <select
                  value={leg.line}
                  onChange={(e) => setLegLine(index, e.target.value as LineId)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {lineOptions.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {isFirst ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">{t.legsEditor.from}</label>
                  <select
                    required
                    value={leg.originStation}
                    onChange={(e) => setLegOrigin(index, e.target.value)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="" disabled>
                      {t.legsEditor.selectStation}
                    </option>
                    {line.stations.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground/50">{t.legsEditor.from}</span>
                  <p className="rounded-lg border border-transparent px-3 py-2 text-sm text-foreground/70">
                    {leg.originStation}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">{t.legsEditor.to}</label>
              <select
                required
                value={leg.destinationStation}
                onChange={(e) => setLegDestination(index, e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-1/2"
              >
                <option value="" disabled>
                  {t.legsEditor.selectStation}
                </option>
                {line.stations
                  .filter((s) => s !== leg.originStation)
                  .map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={addTransfer}
          disabled={!last?.destinationStation || transferOptions.length === 0}
          title={
            last?.destinationStation && transferOptions.length === 0
              ? t.legsEditor.noOtherLine(last.destinationStation)
              : undefined
          }
          className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t.legsEditor.addTransfer}
        </button>
        {legs.length > 1 && (
          <button
            type="button"
            onClick={removeLastTransfer}
            className="cursor-pointer text-xs text-foreground/40 underline-offset-4 hover:text-destructive hover:underline"
          >
            {t.legsEditor.removeTransfer}
          </button>
        )}
      </div>
    </div>
  );
}
