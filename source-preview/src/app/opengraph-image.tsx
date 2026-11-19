import { ImageResponse } from "next/og";

export const alt = "MGM Loop, the student network of MGM College of Engineering, Nanded";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LOOP =
  "M10.5 20.5a4.5 4.5 0 1 1 0-9c3 0 4.5 4.5 5.5 4.5s2.5-4.5 5.5-4.5a4.5 4.5 0 1 1 0 9c-3 0-4.5-4.5-5.5-4.5s-2.5 4.5-5.5 4.5z";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #6d28d9 80%, #a21caf 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="96" height="96" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="9" fill="rgba(255,255,255,0.14)" />
            <path d={LOOP} fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, letterSpacing: -1 }}>MGM Loop</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5, maxWidth: 980 }}>
            The student network of MGM College of Engineering, Nanded
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.78)" }}>
            Notes · Doubts · Department schedules · Events · Messages
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.7)" }}>Learn. Share. Connect.  ·  For @mgmcen.ac.in students</div>
      </div>
    ),
    size,
  );
}
