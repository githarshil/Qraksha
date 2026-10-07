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
  speed = 0.12,
  noise = 0.35,
  softness = 0.85,
  intensity = 0.55,
  scale = 1.1,
  offsetY = 0,
  offsetX = 0,
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

    // Mark shader loaded smoothly to unmount fallback
    const timer = setTimeout(() => setShaderLoaded(true), 250);

    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateMaxPixels, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none bg-[#180505] ${className}`}
    >
      {/* 1. Fast CSS fallback during SSR / early mount */}
      {!shaderLoaded && (
        <div
          className="absolute inset-0 transition-opacity duration-700 ease-out"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, #C23A1C 0%, #6B1408 45%, #180505 80%)`,
          }}
        />
      )}

      {/* 2. WebGL GrainGradient Shader Canvas - Bleeds beyond edges to guarantee zero cutoff */}
      {mounted && (
        <div className="absolute -inset-x-0 -top-16 -bottom-20 w-full h-[calc(100%+9rem)]">
          <GrainGradient
            shape="wave"
            fit="cover"
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

      {/* 3. Subtle Risograph Analog Dither Overlay */}
      {showGrain && (
        <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-20">
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

      {/* 4. Natural Eased Edge Blends (Multi-stop smooth transitions into surrounding sections) */}
      {showVignette && (
        <>
          {/* Top navigation soft fade (prevents harsh line under sticky header) */}
          <div
            className="absolute inset-x-0 top-0 h-28 pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, #180505 0%, rgba(24, 5, 5, 0.7) 35%, rgba(24, 5, 5, 0.2) 70%, transparent 100%)`,
            }}
          />
          {/* Bottom section seamless ease-in (completely eliminates bottom cutoff midway) */}
          <div
            className="absolute inset-x-0 bottom-0 h-44 md:h-56 pointer-events-none"
            style={{
              background: `linear-gradient(to top, #180505 0%, rgba(24, 5, 5, 0.85) 30%, rgba(24, 5, 5, 0.45) 65%, transparent 100%)`,
            }}
          />
        </>
      )}
    </div>
  );
}
