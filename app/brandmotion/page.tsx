import type { Metadata } from "next";
import { BrandMotionScene } from "@/components/gl/BrandMotionScene";

export const metadata: Metadata = {
  title: "BrandMotion — Fractured Core",
  description: "Interactive 3D hero for BrandMotion.",
};

/** Standalone preview of the BrandMotion 3D hero at /brandmotion. */
export default function BrandMotionPage() {
  return (
    <main style={{ position: "relative", height: "100svh", overflow: "hidden", background: "#040914", cursor: "auto" }}>
      <BrandMotionScene style={{ position: "absolute", inset: 0 }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "clamp(16px, 4vw, 48px)",
          color: "#e8efff",
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, letterSpacing: "0.04em" }}>
          <strong>
            BRAND<span style={{ color: "#9fb3d9", fontWeight: 400 }}>MOTION</span>
          </strong>
          <span>Studio · 2026</span>
        </div>
        <div>
          <h1 style={{ fontSize: "clamp(34px, 6vw, 84px)", lineHeight: 0.95, letterSpacing: "-0.035em", fontWeight: 500, maxWidth: "12ch" }}>
            Brands, broken open to shine.
          </h1>
          <p style={{ color: "#9fb3d9", maxWidth: "34ch", marginTop: 14, lineHeight: 1.5 }}>
            Identity, 3D and motion for companies that refuse to stand still.
          </p>
        </div>
      </div>
    </main>
  );
}
