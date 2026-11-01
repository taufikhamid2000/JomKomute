// Shared by the OG image and the PWA icon route (next/og renders inline SVG
// from a data URI, so these cannot use the React LogoMark component).
// Same artwork as components/logo-mark.tsx and app/icon.svg.
export function logoDataUri({ rounded = true }: { rounded?: boolean } = {}): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
<defs><linearGradient id="g" x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4f46e5"/><stop offset="0.6" stop-color="#6d28d9"/><stop offset="1" stop-color="#0f766e"/></linearGradient></defs>
<rect width="64" height="64" rx="${rounded ? 16 : 0}" fill="url(#g)"/>
<path d="M38 15v20c0 8-4.6 12.5-11 12.5-4.6 0-8-2.2-9.8-5.8" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="38" cy="15" r="6.4" fill="#fcd34d"/><circle cx="38" cy="15" r="2.6" fill="#4338ca"/>
<circle cx="17.2" cy="41.7" r="4.2" fill="#fff" stroke="#4338ca" stroke-width="2.4"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
