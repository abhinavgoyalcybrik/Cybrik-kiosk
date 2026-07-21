"use client";

import * as React from "react";
import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from "framer-motion";

interface SmoothScrollHeroProps {
  scrollHeight?: number;
  desktopImage?: string;
  mobileImage?: string;
  initialClipPercentage?: number;
  finalClipPercentage?: number;
  children?: React.ReactNode;
}

export default function SmoothScrollHero({
  scrollHeight = 420,
  desktopImage = "/hero-journey.webp",
  mobileImage = "/hero-journey.webp",
  initialClipPercentage = 3,
  finalClipPercentage = 97,
  children,
}: SmoothScrollHeroProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: rootRef, offset: ["start start", "end end"] });
  const clipStart = useTransform(scrollYProgress, [0, 1], [initialClipPercentage, 0]);
  const clipEnd = useTransform(scrollYProgress, [0, 1], [finalClipPercentage, 100]);
  const clipPath = useMotionTemplate`polygon(${clipStart}% ${clipStart}%, ${clipEnd}% ${clipStart}%, ${clipEnd}% ${clipEnd}%, ${clipStart}% ${clipEnd}%)`;
  const backgroundSize = useTransform(scrollYProgress, [0, 1], ["116%", "104%"]);

  return (
    <div ref={rootRef} className="smooth-hero-root" style={{ height: `calc(${scrollHeight}px + 100svh)` }}>
      <motion.div className="smooth-hero-sticky" style={{ clipPath: reduceMotion ? "none" : clipPath }}>
        {mobileImage && <motion.div className="smooth-hero-image smooth-hero-mobile" style={{ backgroundImage: `url(${mobileImage})`, backgroundSize: reduceMotion ? "cover" : backgroundSize }} />}
        {desktopImage && <motion.div className="smooth-hero-image smooth-hero-desktop" style={{ backgroundImage: `url(${desktopImage})`, backgroundSize: reduceMotion ? "cover" : backgroundSize }} />}
        <div className="smooth-hero-wash" />
        <div className="smooth-hero-content">{children}</div>
      </motion.div>
    </div>
  );
}
