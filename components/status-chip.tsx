export type StatusKind = "normal" | "delayed" | "incident";

// Colour is never the only signal: each status also gets its own glyph and label.
const STYLE: Record<StatusKind, { cls: string; glyph: string }> = {
  normal: { cls: "bg-soft-ok text-ink-ok", glyph: "●" },
  delayed: { cls: "bg-soft-warn text-ink-warn", glyph: "▲" },
  incident: { cls: "bg-soft-bad text-ink-bad", glyph: "✖" },
};

export function StatusChip({ kind, label, className = "" }: { kind: StatusKind; label: string; className?: string }) {
  const s = STYLE[kind];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls} ${className}`}
    >
      <span aria-hidden="true">{s.glyph}</span>
      {label}
    </span>
  );
}
