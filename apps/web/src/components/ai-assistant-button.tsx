"use client";

import React from "react";
import { ThinkingOrb, type OrbState } from "thinking-orbs";

export interface AIAssistantButtonProps {
  /** Current orb animation state. Overridden to 'listening' when open. */
  state?: OrbState;
  /** Whether the assistant sheet/modal is currently open. */
  isOpen?: boolean;
  /** Click handler to toggle or open the assistant. */
  onClick?: () => void;
  /** Optional custom class name. */
  className?: string;
  /** Accessible label. */
  "aria-label"?: string;
}

/**
 * AI Assistant Button for QRaksha.
 *
 * Sits next to the floating pill nav bar with matching surface tokens and height.
 * Houses an animated monochrome ThinkingOrb (light dots on dark background).
 * Easing, radii, borders, and press feedback adhere strictly to DESIGN.md.
 */
export function AIAssistantButton({
  state = "working",
  isOpen = false,
  onClick,
  className = "",
  "aria-label": ariaLabel,
}: AIAssistantButtonProps) {
  // Idle state is 'working' (or prop-controlled), open/pressed is 'listening'
  const activeOrbState: OrbState = isOpen ? "listening" : state;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? (isOpen ? "Close QRaksha assistant" : "Open QRaksha assistant")}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      className={`relative flex items-center justify-center min-w-[48px] min-h-[48px] h-[52px] w-[52px] rounded-full bg-surface/80 backdrop-blur-xl border border-border/80 text-text shadow-[0_8px_32px_rgba(18,9,7,0.65),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:border-brand/70 hover:bg-surface/90 active:scale-95 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 cursor-pointer ${className}`}
    >
      {/* 
        ThinkingOrb is rendered using the 64 preset and constrained with CSS 
        so particles remain high-density, crisp, and comfortable within the circle.
        Pinned to theme="dark" since the button surface is --bg-ink-2 (#1C0F0B).
      */}
      <div className="w-7 h-7 flex items-center justify-center pointer-events-none select-none">
        <ThinkingOrb
          state={activeOrbState}
          size={64}
          theme="dark"
          style={{ width: "28px", height: "28px" }}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}
