import { notFound } from "next/navigation";
import MANIFEST from "@/brandmotion-3d/designs/manifest.js";
import { BrandMotionDesign } from "@/components/gl/BrandMotionDesign";

type Entry = { id: string; name: string; blurb: string };
const designs = MANIFEST as Entry[];

export function generateStaticParams() {
  return designs.map((d) => ({ design: d.id }));
}

export function generateMetadata({ params }: { params: { design: string } }) {
  const d = designs.find((x) => x.id === params.design);
  return { title: d ? `${d.name} · BrandMotion` : "BrandMotion" };
}

/** Full-screen preview of one hero study, e.g. /brandmotion/07. */
export default function DesignPage({ params }: { params: { design: string } }) {
  const d = designs.find((x) => x.id === params.design);
  if (!d) notFound();
  return (
    <main style={{ position: "relative", height: "100svh", overflow: "hidden", background: "#040914", cursor: "auto" }}>
      <BrandMotionDesign id={d.id} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", left: "clamp(16px, 4vw, 40px)", bottom: "clamp(16px, 4vw, 40px)", color: "#e8efff", pointerEvents: "none" }}>
        <small style={{ color: "#93a8d2", letterSpacing: "0.1em" }}>{d.id} / {designs.length}</small>
        <h1 style={{ fontWeight: 500, fontSize: "clamp(26px, 4vw, 48px)", letterSpacing: "-0.03em" }}>{d.name}</h1>
        <p style={{ color: "#93a8d2", maxWidth: "44ch", lineHeight: 1.5 }}>{d.blurb}</p>
      </div>
    </main>
  );
}
