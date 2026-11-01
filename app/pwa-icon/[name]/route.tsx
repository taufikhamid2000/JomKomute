import { ImageResponse } from "next/og";
import { logoDataUri } from "@/components/logo-svg-markup";

// PNG icons for the web app manifest (app/manifest.ts): /pwa-icon/192,
// /pwa-icon/512 and /pwa-icon/maskable. The maskable one is full-bleed with
// the mark inside the safe zone, so launchers can crop it to any shape.
export const dynamic = "force-static";

const ICONS: Record<string, { size: number; maskable: boolean }> = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  maskable: { size: 512, maskable: true },
};

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const icon = ICONS[name];
  if (!icon) return new Response("Not found", { status: 404 });
  const inner = icon.maskable ? Math.round(icon.size * 0.66) : icon.size;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: icon.maskable ? "#4f46e5" : "transparent" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoDataUri({ rounded: !icon.maskable })} width={inner} height={inner} alt="" />
      </div>
    ),
    { width: icon.size, height: icon.size },
  );
}
