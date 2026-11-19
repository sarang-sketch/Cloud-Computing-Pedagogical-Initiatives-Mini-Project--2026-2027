import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const LOOP =
  "M10.5 20.5a4.5 4.5 0 1 1 0-9c3 0 4.5 4.5 5.5 4.5s2.5-4.5 5.5-4.5a4.5 4.5 0 1 1 0 9c-3 0-4.5-4.5-5.5-4.5s-2.5 4.5-5.5 4.5z";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #5B5CEB 0%, #7B4FEA 55%, #C552CF 100%)",
        }}
      >
        <svg width="132" height="132" viewBox="0 0 32 32">
          <path d={LOOP} fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size,
  );
}
