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
      className={`relative shrink-0 flex items-center justify-center min-w-[48px] min-h-[48px] h-[54px] w-[54px] rounded-full bg-surface/85 backdrop-blur-xl border border-brand text-text shadow-[0_8px_32px_rgba(18,9,7,0.7),0_0_15px_rgba(255,75,31,0.15)] hover:border-brand-soft hover:bg-surface/95 active:scale-95 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 cursor-pointer ${className}`}
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
