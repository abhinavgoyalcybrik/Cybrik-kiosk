"use client";

import { useEffect, useRef } from "react";

export function PremiumMotion() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canQueryMedia = typeof window.matchMedia === "function";
    const reduced = canQueryMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = !canQueryMedia || window.matchMedia("(pointer: fine)").matches;
    const reveals = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const heroSequence = document.querySelector<HTMLElement>("[data-hero-sequence]");
    if (typeof IntersectionObserver === "undefined") {
      reveals.forEach((element) => element.setAttribute("data-visible", "true"));
      heroSequence?.setAttribute("data-visible", "true");
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-visible", "true");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -6%" });
    reveals.forEach((element) => observer.observe(element));
    if (heroSequence) observer.observe(heroSequence);

    if (reduced || !finePointer) return () => observer.disconnect();

    const cursor = cursorRef.current;
    let cursorFrame = 0;
    let targetX = -100;
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;
    const drawCursor = () => {
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      if (cursor) cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      cursorFrame = requestAnimationFrame(drawCursor);
    };
    const trackCursor = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!cursor) return;
      cursor.dataset.active = "true";
      const target = event.target as Element | null;
      cursor.dataset.intent = target?.closest("a, button, summary") ? "action" : target?.closest("[data-cursor-intent]") ? "section" : "quiet";
    };
    const hideCursor = () => { if (cursor) cursor.dataset.active = "false"; };
    document.addEventListener("pointermove", trackCursor, { passive: true });
    document.documentElement.addEventListener("pointerleave", hideCursor);
    cursorFrame = requestAnimationFrame(drawCursor);

    const reactive = Array.from(document.querySelectorAll<HTMLElement>("[data-craft-reactive]"));
    const cleanups = reactive.map((element) => {
      let frame = 0;
      const move = (event: PointerEvent) => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const rect = element.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width;
          const y = (event.clientY - rect.top) / rect.height;
          element.style.setProperty("--pointer-x", `${x * 100}%`);
          element.style.setProperty("--pointer-y", `${y * 100}%`);
          element.style.setProperty("--tilt-x", `${(0.5 - y) * 2.2}deg`);
          element.style.setProperty("--tilt-y", `${(x - 0.5) * 2.8}deg`);
        });
      };
      const leave = () => {
        element.style.setProperty("--tilt-x", "0deg");
        element.style.setProperty("--tilt-y", "0deg");
      };
      element.addEventListener("pointermove", move);
      element.addEventListener("pointerleave", leave);
      return () => { cancelAnimationFrame(frame); element.removeEventListener("pointermove", move); element.removeEventListener("pointerleave", leave); };
    });

    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      cancelAnimationFrame(cursorFrame);
      document.removeEventListener("pointermove", trackCursor);
      document.documentElement.removeEventListener("pointerleave", hideCursor);
    };
  }, []);

  return <div ref={cursorRef} className="craft-cursor" aria-hidden="true"><span /></div>;
}
