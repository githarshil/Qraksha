"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { X, Sparkle, QrCode, Play, Stop } from "@phosphor-icons/react";
import { VoiceVerdictType, VoiceLanguageCode, formatVoiceScript } from "@qraksha/shared";
import { VoiceOrb } from "@/components/voice-orb";
import { LanguageSelector, getInitialVoiceLanguage } from "@/components/language-selector";
import { VoicePlayer, VoiceState } from "@/lib/voice-player";

export interface AIAssistantSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_MERCHANTS: Record<VoiceLanguageCode, Record<VoiceVerdictType, string | undefined>> = {
  "en-IN": {
    VERIFIED: "Sharma General Store",
    RECENTLY_REGISTERED: "Chai Point",
    UNVERIFIED: undefined,
    WARNING: undefined,
  },
  "hi-IN": {
    VERIFIED: "शर्मा जनरल स्टोर",
    RECENTLY_REGISTERED: "चाय पॉइंट",
    UNVERIFIED: undefined,
    WARNING: undefined,
  },
  "kn-IN": {
    VERIFIED: "ಶರ್ಮಾ ಜನರಲ್ ಸ್ಟೋರ್",
    RECENTLY_REGISTERED: "ಚಾಯ್ ಪಾಯಿಂಟ್",
    UNVERIFIED: undefined,
    WARNING: undefined,
  },
};

const VERDICT_OPTIONS: Array<{
  key: VoiceVerdictType;
  label: string;
  badge: string;
  color: string;
}> = [
  {
    key: "VERIFIED",
    label: "Verified",
    badge: "🟢 Safe",
    color: "text-[#2FBF71] border-[#2FBF71]/40",
  },
  {
    key: "RECENTLY_REGISTERED",
    label: "Building Trust",
    badge: "🟡 Caution",
    color: "text-[#F2B531] border-[#F2B531]/40",
  },
  {
    key: "UNVERIFIED",
    label: "Unverified",
    badge: "⚪ Not Found",
    color: "text-[#B8A8A2] border-[#B8A8A2]/40",
  },
  {
    key: "WARNING",
    label: "Warning",
    badge: "🔴 Swap Alert",
    color: "text-[#E5384F] border-[#E5384F]/40",
  },
];

/**
 * QRaksha AI Voice Assistant Sheet.
 * Built with DESIGN.md tokens: dark warm surface (--bg-ink-2),
 * brand line border (--line-dark), mono eyebrow, and Satoshi headings.
 * Provides interactive multilingual voice assistance powered by Sarvam Bulbul TTS.
 */
export function AIAssistantSheet({ isOpen, onClose }: AIAssistantSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Voice Assistant State
  const [selectedVerdict, setSelectedVerdict] = useState<VoiceVerdictType>("VERIFIED");
  const [voiceLang, setVoiceLang] = useState<VoiceLanguageCode>("en-IN");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [amplitude, setAmplitude] = useState<number>(0);
  const playerRef = useRef<VoicePlayer | null>(null);

  // Initialize language from preferences
  useEffect(() => {
    setVoiceLang(getInitialVoiceLanguage());
  }, []);

  // Initialize VoicePlayer
  useEffect(() => {
    const player = new VoicePlayer({
      onStateChange: (state) => setVoiceState(state),
      onAmplitudeChange: (amp) => setAmplitude(amp),
      onError: () => setVoiceState("error"),
    });
    playerRef.current = player;

    return () => {
      player.stop();
    };
  }, []);

  // Stop audio and reset state when sheet is closed
  useEffect(() => {
    if (!isOpen) {
      playerRef.current?.stop();
      setVoiceState("idle");
      setAmplitude(0);
    }
  }, [isOpen]);

  // Focus trap / keyboard accessibility (Escape closes modal)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handlePlayVoice = useCallback(
    (verdictKey: VoiceVerdictType = selectedVerdict, langKey: VoiceLanguageCode = voiceLang) => {
      playerRef.current?.primeAudioContext();

      if (voiceState === "speaking" && verdictKey === selectedVerdict && langKey === voiceLang) {
        playerRef.current?.stop();
        setVoiceState("idle");
        return;
      }

      playerRef.current?.playVerdict(verdictKey, langKey, SAMPLE_MERCHANTS[langKey]?.[verdictKey]);
    },
    [selectedVerdict, voiceLang, voiceState],
  );

  const handleSelectVerdict = useCallback(
    (verdictKey: VoiceVerdictType) => {
      setSelectedVerdict(verdictKey);
      handlePlayVoice(verdictKey, voiceLang);
    },
    [handlePlayVoice, voiceLang],
  );

  const handleLanguageChange = useCallback(
    (newLang: VoiceLanguageCode) => {
      setVoiceLang(newLang);
      if (voiceState === "speaking") {
        handlePlayVoice(selectedVerdict, newLang);
      }
    },
    [handlePlayVoice, selectedVerdict, voiceState],
  );

  if (!isOpen) return null;

  const activeMerchantName = SAMPLE_MERCHANTS[voiceLang]?.[selectedVerdict];
  const spokenScript = formatVoiceScript(selectedVerdict, voiceLang, activeMerchantName);

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
      <div className="relative w-full max-w-[480px] mx-auto bg-surface/90 backdrop-blur-2xl border-t border-x border-border/80 rounded-t-2xl shadow-[0_-8px_32px_rgba(18,9,7,0.7),inset_0_1px_1px_rgba(255,255,255,0.1)] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-4 animate-in fade-in slide-in-from-bottom duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
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

        {/* Top Control Bar: Language Selection */}
        <div className="flex items-center justify-between px-3 py-2 rounded-[4px] bg-[#120907] border border-border">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
            Language
          </span>
          <LanguageSelector currentLang={voiceLang} onSelectLang={handleLanguageChange} />
        </div>

        {/* Interactive Voice Orb Hero Section */}
        <div className="p-4 rounded-[4px] bg-[#120907] border border-border flex flex-col items-center justify-center gap-3 text-center">
          <span className="text-[10px] font-mono uppercase text-muted tracking-wider">
            Sarvam Bulbul AI Voice Copilot
          </span>

          <VoiceOrb
            voiceState={voiceState}
            verdict={selectedVerdict}
            lang={voiceLang}
            amplitude={amplitude}
            onTogglePlay={() => handlePlayVoice(selectedVerdict, voiceLang)}
            size={72}
          />

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePlayVoice(selectedVerdict, voiceLang)}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full bg-surface border border-border hover:border-brand text-text transition-colors"
            >
              {voiceState === "speaking" ? (
                <>
                  <Stop className="w-3.5 h-3.5 text-brand" weight="fill" />
                  <span>Stop Speech</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-brand" weight="fill" />
                  <span>Tap to Speak</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Spoken Script Transcription */}
        <div className="p-3.5 rounded-[4px] bg-[#1a0e0b] border border-border/80 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-muted">
            <span className="uppercase tracking-wider">Voice Script ({voiceLang})</span>
            {activeMerchantName && (
              <span className="text-text font-sans font-medium text-[11px]">
                {activeMerchantName}
              </span>
            )}
          </div>
          <p className="text-xs text-text/90 leading-relaxed font-sans italic">
            &ldquo;{spokenScript}&rdquo;
          </p>
        </div>

        {/* Verdict Simulation Controls */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
              Test Audio Verdicts
            </span>
            <span className="text-[10px] font-mono text-brand">Select to Preview</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {VERDICT_OPTIONS.map((opt) => {
              const isSelected = selectedVerdict === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSelectVerdict(opt.key)}
                  aria-pressed={isSelected}
                  className={`p-2.5 rounded-[4px] border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? `bg-surface shadow-[0_0_12px_rgba(255,75,31,0.2)] ${opt.color}`
                      : "bg-[#120907] border-border text-muted hover:border-border/80 hover:text-text"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium font-sans text-text">{opt.label}</span>
                    <span className="text-[10px] font-mono">{opt.badge}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Action Navigation */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-3">
          <Link
            href="/check"
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-[4px] bg-brand text-ink font-medium text-xs hover:bg-brand/90 transition-colors shadow-sm"
          >
            <QrCode className="w-4 h-4" weight="bold" />
            <span>Scan & Check QR</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
