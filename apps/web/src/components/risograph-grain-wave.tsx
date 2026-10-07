"use client";

import React, { useEffect, useState, useId } from "react";
import { GrainGradient } from "@paper-design/shaders-react";

interface RisographGrainWaveProps {
  className?: string;
  showGrain?: boolean;
  showVignette?: boolean;
  speed?: number;
  noise?: number;
  softness?: number;
  intensity?: number;
  scale?: number;
  offsetY?: number;
  offsetX?: number;
}

const BASE_COLOR = "#180505";
const PALETTE_COLORS = [
  "#6B1408", // maroon-mid
  "#C23A1C", // ember
  "#FF5A36", // radiant crest accent
  "#FF8A6B", // soft terracotta
  "#FFE9E4", // warm risograph cream
];

export function RisographGrainWave({
  className = "",
  showGrain = true,
  showVignette = true,
  speed = 0.14,
  noise = 0.42,
  softness = 0.7,
  intensity = 0.6,
  scale = 0.8,
  offsetY = 0.3,
  offsetX = -0.15,
}: RisographGrainWaveProps) {
  const [mounted, setMounted] = useState(false);
  const [maxPixels, setMaxPixels] = useState(1920 * 1080 * 1.5);
  const [shaderLoaded, setShaderLoaded] = useState(false);
  const filterId = useId();

  useEffect(() => {
    setMounted(true);

    const updateMaxPixels = () => {
      if (typeof window !== "undefined") {
        const w = window.innerWidth || 1920;
        const h = window.innerHeight || 1080;
        // Dynamic cap at 1.5x DPR: innerWidth * innerHeight * 2.25
        setMaxPixels(Math.round(w * h * 2.25));
      }
    };

    updateMaxPixels();

    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateMaxPixels, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none bg-[#180505] ${className}`}
    >
      {/* 1. Fast CSS fallback gradient during SSR / initialization */}
      <div
        className="absolute inset-0 transition-opacity duration-1000 ease-out"
        style={{
          opacity: shaderLoaded ? 0 : 1,
          background: `
            radial-gradient(ellipse at 50% 35%, #FF5A36 0%, #C23A1C 30%, #6B1408 55%, #180505 85%),
            linear-gradient(180deg, #180505 0%, #6B1408 45%, #FF8A6B 75%, #FFE9E4 100%)
          `,
          backgroundBlendMode: "screen",
        }}
      />

      {/* 2. WebGL GrainGradient Shader Canvas */}
      {mounted && (
        <div
          className="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-out"
          style={{ opacity: shaderLoaded ? 1 : 0.85 }}
          onAnimationEnd={() => setShaderLoaded(true)}
        >
          <GrainGradient
            shape="wave"
            colorBack={BASE_COLOR}
            colors={PALETTE_COLORS}
            softness={softness}
            intensity={intensity}
            noise={noise}
            speed={speed}
            scale={scale}
            offsetY={offsetY}
            offsetX={offsetX}
            minPixelRatio={1}
            maxPixelCount={maxPixels}
            className="w-full h-full"
          />
        </div>
      )}

      {/* 3. Subtle Risograph Analog Dither & Grain Texture Overlay */}
      {showGrain && (
        <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-25">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <filter id={`grain-${filterId}`}>
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.8"
                numOctaves={3}
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#grain-${filterId})`} />
          </svg>
        </div>
      )}

      {/* 4. Vignette Gradients to maintain contrast for Hero typography and cards */}
      {showVignette && (
        <>
          {/* Top navigation edge blend */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#180505] via-[#180505]/70 to-transparent" />
          {/* Bottom section boundary blend */}
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#180505] via-[#180505]/80 to-transparent" />
          {/* Radial depth focus */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: "radial-gradient(circle at 50% 40%, transparent 45%, #180505 100%)",
            }}
          />
        </>
      )}
    </div>
  );
}
