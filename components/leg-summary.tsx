import { lineById } from "@/lib/lines";
import type { RouteLeg } from "@/lib/types";
import { useDictionary } from "@/lib/use-dictionary";

export function LegSummary({ legs, arrivalTimes }: { legs: RouteLeg[]; arrivalTimes?: string[] }) {
  const { t } = useDictionary();

  return (
    <div className="flex flex-col gap-2">
      {legs.map((leg, index) => {
        const line = lineById(leg.line);
        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: line?.color ?? "#64748b" }}
              aria-hidden="true"
            />
            <span className="text-foreground/70">
              {leg.originStation} <span aria-hidden="true">→</span> {leg.destinationStation}
            </span>
            <span className="text-xs text-foreground/40">{line?.name ?? leg.line}</span>
            {arrivalTimes?.[index] && (
              <span className="text-xs text-foreground/40">· {t.schedule.arrival(arrivalTimes[index])}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
