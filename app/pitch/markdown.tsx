// Just enough Markdown for docs/PITCH.md: headings, paragraphs, bullet and
// numbered lists, tables, **bold**, *italic*, `code` and [links](url). Not
// a general-purpose parser; add a library if the docs outgrow this.

import type { ReactNode } from "react";

function inline(text: string, keyPrefix = ""): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}${i++}`;
    if (m[1] !== undefined) out.push(<strong key={key} className="font-semibold text-foreground">{inline(m[1], `${key}-`)}</strong>);
    else if (m[2] !== undefined) out.push(<em key={key}>{inline(m[2], `${key}-`)}</em>);
    else if (m[3] !== undefined) out.push(<code key={key} className="rounded bg-muted px-1 text-[0.9em]">{m[3]}</code>);
    else {
      const href = m[5];
      const external = /^https?:/.test(href);
      out.push(
        <a key={key} href={href} className="font-medium text-primary underline underline-offset-2" {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
          {inline(m[4], `${key}-`)}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function decode(text: string): string {
  return text.replace(/&#91;/g, "[").replace(/\\\]/g, "]");
}

function cells(row: string): string[] {
  return row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    const key = k++;

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = inline(decode(heading[2]));
      if (level === 1) blocks.push(<h1 key={key} className="text-2xl leading-tight font-semibold text-balance text-foreground sm:text-3xl">{content}</h1>);
      else if (level === 2) blocks.push(<h2 key={key} className="mt-6 text-lg font-semibold text-foreground">{content}</h2>);
      else blocks.push(<h3 key={key} className="mt-4 text-base font-semibold text-foreground">{content}</h3>);
      i++;
      continue;
    }

    if (line.trim().startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(lines[i++]);
      const [head, , ...body] = rows;
      blocks.push(
        <div key={key} className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs text-foreground/70">
              <tr>{cells(head).map((c, j) => <th key={j} className="px-3 py-2 font-medium">{inline(decode(c))}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri} className="border-t border-border align-top">
                  {cells(r).map((c, j) => <td key={j} className="px-3 py-2 text-foreground/80">{inline(decode(c))}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const bullet = /^\s*[-*]\s+/;
    const numbered = /^\s*\d+\.\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const marker = ordered ? numbered : bullet;
      const items: string[] = [];
      while (i < lines.length && marker.test(lines[i])) items.push(lines[i++].replace(marker, ""));
      const cls = `flex flex-col gap-1.5 pl-5 text-sm leading-relaxed text-foreground/80 ${ordered ? "list-decimal" : "list-disc"}`;
      const children = items.map((it, j) => <li key={j}>{inline(decode(it))}</li>);
      blocks.push(ordered ? <ol key={key} className={cls}>{children}</ol> : <ul key={key} className={cls}>{children}</ul>);
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,3}\s|\s*\||\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={key} className="text-sm leading-relaxed text-foreground/80">{inline(decode(para.join(" ")))}</p>);
  }

  return <>{blocks}</>;
}
