/**
 * SplashScreen — Logo appears centered, then morphs/flies to the nav position
 *
 * Flow:
 *  1. Screen is white, logo fades in at center (large)
 *  2. "DocuMind AI" text fades up below
 *  3. Loading bar fills
 *  4. Logo shrinks and flies to top-left (nav position)
 *  5. Screen fades away, revealing the actual page beneath
 */
"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline();

    // 1. Logo entrance — scale up with slight rotation
    tl.fromTo(
      logoRef.current,
      { scale: 0.3, opacity: 0, rotate: -20 },
      { scale: 1, opacity: 1, rotate: 0, duration: 0.7, ease: "back.out(1.6)" }
    );

    // 2. Glow pulse on logo
    tl.to(logoRef.current, {
      boxShadow: "0 0 80px rgba(13,148,136,0.5), 0 0 160px rgba(13,148,136,0.15)",
      duration: 0.35,
      ease: "power2.inOut",
      yoyo: true,
      repeat: 1,
    });

    // 3. Text slides up
    tl.fromTo(
      textRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" },
      "-=0.25"
    );

    // 4. Tagline fades in
    tl.fromTo(
      tagRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.35 },
      "-=0.15"
    );

    // 5. Loading bar fills
    tl.fromTo(
      barRef.current,
      { scaleX: 0 },
      { scaleX: 1, duration: 0.8, ease: "power2.inOut" },
      "-=0.1"
    );

    // 6. Hold briefly
    tl.to({}, { duration: 0.3 });

    // 7. Text and tagline fade out
    tl.to([textRef.current, tagRef.current, barRef.current?.parentElement], {
      opacity: 0,
      y: -10,
      duration: 0.3,
      ease: "power2.in",
    });

    // 8. Logo shrinks and flies to the top-left nav position
    tl.to(logoRef.current, {
      width: 32,
      height: 32,
      borderRadius: 9,
      x: -(window.innerWidth / 2) + 56, // fly to left edge + padding
      y: -(window.innerHeight / 2) + 32, // fly to top
      duration: 0.6,
      ease: "power3.inOut",
    });

    // 9. Fade the whole container out
    tl.to(containerRef.current, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete,
    });

    return () => { tl.kill(); };
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#f8f9fc",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      {/* Logo */}
      <img
        ref={logoRef}
        src="/images/logo.png"
        alt="DocuMind AI"
        style={{
          width: 88,
          height: 88,
          borderRadius: 22,
          opacity: 0,
          boxShadow: "0 12px 48px rgba(13,148,136,0.2)",
          willChange: "transform, width, height",
        }}
      />

      {/* App name */}
      <div ref={textRef} style={{ opacity: 0, textAlign: "center" }}>
        <div style={{
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "#0f172a",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          DocuMind
          <span style={{
            background: "linear-gradient(135deg, #0d9488, #2563eb)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginLeft: 8,
          }}>
            AI
          </span>
        </div>
      </div>

      {/* Tagline */}
      <div
        ref={tagRef}
        style={{
          opacity: 0,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase" as const,
          color: "#94a3b8",
        }}
      >
        Enterprise RAG Intelligence
      </div>

      {/* Loading bar */}
      <div style={{
        width: 140,
        height: 3,
        borderRadius: 3,
        background: "#e2e8f0",
        overflow: "hidden",
        marginTop: 4,
      }}>
        <div
          ref={barRef}
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(90deg, #0d9488, #2563eb)",
            borderRadius: 3,
            transformOrigin: "left",
            transform: "scaleX(0)",
          }}
        />
      </div>
    </div>
  );
}
