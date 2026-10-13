"use client";

import React, { useEffect, useRef } from "react";
import { X, Sparkle } from "@phosphor-icons/react";

export interface AIAssistantSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Placeholder bottom sheet for the QRaksha AI Assistant.
 * Built with DESIGN.md tokens: dark warm surface (--bg-ink-2),
 * brand line border (--line-dark), mono eyebrow, and Satoshi headings.
 */
export function AIAssistantSheet({ isOpen, onClose }: AIAssistantSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap / keyboard accessibility (Escape closes modal)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Focus the close button on open
    closeButtonRef.current?.focus();

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-title"
      className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#120907]/60 backdrop-blur-sm transition-opacity duration-200"
        aria-hidden="true"
      />

      {/* Sheet Container with frosted glassmorphic styling */}
      <div className="relative w-full max-w-[480px] mx-auto bg-surface/85 backdrop-blur-2xl border-t border-x border-border/80 rounded-t-2xl shadow-[0_-8px_32px_rgba(18,9,7,0.7),inset_0_1px_1px_rgba(255,255,255,0.1)] p-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-4 animate-in fade-in slide-in-from-bottom duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-brand">
              <Sparkle className="w-3.5 h-3.5" weight="bold" />
              <span>AI ASSISTANT</span>
            </div>
            <h2 id="assistant-title" className="text-lg font-medium text-text">
              QRaksha Assistant
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-full text-muted hover:text-text hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 cursor-pointer"
          >
            <X className="w-5 h-5" weight="bold" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 rounded-[4px] bg-[#120907] border border-border flex flex-col gap-2">
          <p className="text-sm text-text font-medium">Assistant coming soon</p>
          <p className="text-xs text-muted leading-relaxed">
            The multi-agent security copilot will allow merchants to query self-audit verdicts,
            inspect blockchain anchor proofs, and diagnose sticker swap warnings in real time.
          </p>

          {/* TODO: wire AI assistant */}
        </div>
      </div>
    </div>
  );
}
