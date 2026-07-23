"use client";

import { useState } from "react";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { Cursor } from "@/components/Cursor";
import { Preloader } from "@/components/Preloader";
import { Nav } from "@/components/Nav";
import { ScrollProgress } from "@/components/ScrollProgress";
import { PageCurtain } from "@/components/PageCurtain";

import { Hero } from "@/components/sections/Hero";
import { Manifesto } from "@/components/sections/Manifesto";
import { Work } from "@/components/sections/Work";
import { Spotlight } from "@/components/sections/Spotlight";
import { Services } from "@/components/sections/Services";
import { About } from "@/components/sections/About";
import { Awards } from "@/components/sections/Awards";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";

/**
 * STUDIO — page composition.
 * Providers wrap the whole experience so every section shares one Lenis scroll,
 * one custom cursor and one curtain-transition layer. Sections render in the
 * exact order specified in the brief.
 */
export default function Home() {
  const [loaded, setLoaded] = useState(false);

  return (
    <SmoothScroll>
      {/* Global overlays */}
      <Preloader onDone={() => setLoaded(true)} />
      <Cursor />
      <ScrollProgress />
      <Nav />
      <PageCurtain />

      <main data-loaded={loaded}>
        <Hero />
        <Manifesto />
        <Work />
        <Spotlight />
        <Services />
        <About />
        <Awards />
        <Contact />
        <Footer />
      </main>
    </SmoothScroll>
  );
}
