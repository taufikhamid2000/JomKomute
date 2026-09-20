import { ImageResponse } from "next/og";

// Next wires this up as the default og:image (and twitter:image, absent
// a separate twitter-image.tsx) for every route that doesn't define its
// own — one branded card instead of link previews falling back to
// nothing. Colors match app/icon.svg / app/globals.css's --primary.
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
          gap: 24,
          backgroundColor: "#0f172a",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 9999,
              backgroundColor: "#1e40af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <path
                d="M9 20.5 16 8l7 12.5M12 20.5h8"
                stroke="#f1f5f9"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "#f8fafc" }}>JomKomute</div>
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#94a3b8", maxWidth: 900, textAlign: "center" }}>
          Save your KTM/LRT/MRT commute, see how crowded it gets, and get live rider-reported delays
        </div>
      </div>
    ),
    { ...size },
  );
}
