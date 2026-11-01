// WCAG AA check for the design tokens in app/globals.css.
// Run: node scripts/check-contrast.mjs   (exits 1 if any pair fails)
import fs from "node:fs";

const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function block(selector) {
  const i = css.indexOf(selector + " {");
  if (i < 0) throw new Error("missing block " + selector);
  return css.slice(i, css.indexOf("\n}", i));
}
function tokens(selector) {
  const out = {};
  for (const m of block(selector).matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2];
  return out;
}
const themes = { light: tokens(':root[data-theme="light"]'), dark: tokens(':root[data-theme="dark"]') };

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (c) => {
  const [r, g, b] = c.map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const mix = (fg, bg, a) => fg.map((v, i) => v * a + bg[i] * (1 - a));
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const hues = ["indigo", "teal", "amber", "rose", "sky", "violet", "ok", "warn", "bad"];
let failed = 0;
for (const [name, t] of Object.entries(themes)) {
  const pairs = []; // [label, fg rgb, bg rgb, min]
  const add = (label, fg, bg, min = 4.5) => pairs.push([label, fg, bg, min]);
  const c = (k) => rgb(t[k]);
  for (const h of hues) {
    add(`${h}-fg on ${h}-bg`, c(`${h}-fg`), c(`${h}-bg`));
    add(`${h}-fg on ${h}-bg (icon plate inverse)`, c(`${h}-bg`), c(`${h}-fg`));
    add(`${h}-fg on background`, c(`${h}-fg`), c("background"), 4.5);
    add(`${h}-fg on tile-plate (72% background over ${h}-bg)`, c(`${h}-fg`), mix(c("background"), c(`${h}-bg`), 0.72));
  }
  add("foreground on background", c("foreground"), c("background"));
  add("foreground/70 on background", mix(c("foreground"), c("background"), 0.7), c("background"));
  add("foreground on surface-tint", c("foreground"), c("surface-tint"));
  add("foreground/70 on surface-tint", mix(c("foreground"), c("surface-tint"), 0.7), c("surface-tint"));
  add("primary-foreground on primary", c("primary-foreground"), c("primary"));
  add("primary on background (text-primary)", c("primary"), c("background"));
  add("primary on surface-tint (text-primary)", c("primary"), c("surface-tint"));
  add("brand-wordmark on background", c("brand-wordmark"), c("background"));
  for (const stop of ["band-from", "band-via", "band-to", "band"]) {
    add(`band-foreground on ${stop}`, c("band-foreground"), c(stop));
    add(`band-foreground on ${stop} + 12% white (decor overlay)`, c("band-foreground"), mix(rgb("#ffffff"), c(stop), 0.12));
    add(`band-accent on ${stop}`, c("band-accent"), c(stop));
    add(`white/90 on ${stop}`, mix(rgb("#ffffff"), c(stop), 0.9), c(stop));
    // Glass pill (bg-white/15) holding band-foreground text.
    add(`band-foreground on white/15 over ${stop}`, c("band-foreground"), mix(rgb("#ffffff"), c(stop), 0.15));
  }
  // Selected view toggle: indigo-fg on white.
  add("indigo-900 on white (selected toggle)", rgb("#312e81"), rgb("#ffffff"));
  // Live badge: emerald-950 on emerald-400.
  add("emerald-950 on emerald-400 (Live badge)", rgb("#022c22"), rgb("#34d399"));
  for (const [label, fg, bg, min] of pairs) {
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? "pass" : "FAIL"} ${name.padEnd(5)} ${r.toFixed(2).padStart(5)} (min ${min})  ${label}`);
  }
}
console.log(failed ? `\n${failed} pair(s) failed` : "\nAll pairs pass WCAG AA");
process.exit(failed ? 1 : 0);
