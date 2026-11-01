import { ImageResponse } from "next/og";
import { logoDataUri } from "@/components/logo-svg-markup";

// Next wires this up as the default og:image (and twitter:image, absent
// a separate twitter-image.tsx) for every route that doesn't define its
// own — one branded card instead of link previews falling back to
// nothing. Mark and colours match app/icon.svg / app/globals.css.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          backgroundImage: "linear-gradient(135deg, #3730a3 0%, #5b21b6 55%, #0f5f73 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* A dashed rail line along the bottom with three stations. */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 80px" }}>
          <div style={{ width: 22, height: 22, borderRadius: 9999, backgroundColor: "#fcd34d" }} />
          <div style={{ flex: 1, height: 0, borderTop: "6px dashed rgba(255,255,255,0.35)", margin: "0 18px" }} />
          <div style={{ width: 22, height: 22, borderRadius: 9999, backgroundColor: "#ffffff" }} />
          <div style={{ flex: 1, height: 0, borderTop: "6px dashed rgba(255,255,255,0.35)", margin: "0 18px" }} />
          <div style={{ width: 22, height: 22, borderRadius: 9999, backgroundColor: "#99f6e4" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoDataUri()} width={132} height={132} alt="" />
          <div style={{ display: "flex", fontSize: 108, fontWeight: 700, color: "#ffffff", letterSpacing: -2 }}>
            Jom<span style={{ color: "#fcd34d" }}>Komute</span>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#e0e7ff", maxWidth: 960, textAlign: "center" }}>
          Save your KTM/LRT/MRT commute, see how crowded it gets, and get live rider-reported delays
        </div>
      </div>
    ),
    { ...size },
  );
}
