"use client";

import React from "react";

import { VoiceLanguageCode, SUPPORTED_VOICE_LANGUAGES } from "@qraksha/shared";
import { SpeakerHigh } from "@phosphor-icons/react";

const STORAGE_KEY = "qraksha_voice_lang";

export function getInitialVoiceLanguage(): VoiceLanguageCode {
  if (typeof window === "undefined") {
    return "en-IN";
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY) as VoiceLanguageCode | null;
    if (saved && SUPPORTED_VOICE_LANGUAGES[saved]) {
      return saved;
    }
  } catch {
    // Ignore localStorage errors
  }

  // Detect from browser language
  if (typeof navigator !== "undefined" && navigator.language) {
    const navLang = navigator.language.toLowerCase();
    if (navLang.startsWith("kn")) return "kn-IN";
    if (navLang.startsWith("hi")) return "hi-IN";
  }

  return "en-IN";
}

export function saveVoiceLanguage(lang: VoiceLanguageCode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignore localStorage errors
  }
}

export interface LanguageSelectorProps {
  currentLang: VoiceLanguageCode;
  onSelectLang: (lang: VoiceLanguageCode) => void;
  className?: string;
}

export function LanguageSelector({
  currentLang,
  onSelectLang,
  className = "",
}: LanguageSelectorProps) {
  const languages: VoiceLanguageCode[] = ["en-IN", "hi-IN", "kn-IN"];

  const handleSelect = (lang: VoiceLanguageCode) => {
    saveVoiceLanguage(lang);
    onSelectLang(lang);
  };

  return (
    <div
      role="group"
      aria-label="Select voice assistant language"
      className={`flex items-center gap-1.5 p-1 rounded-[6px] bg-ink-2 border border-border ${className}`}
    >
      <div className="flex items-center pl-1.5 pr-1 text-muted text-xs">
        <SpeakerHigh className="w-3.5 h-3.5 text-brand" weight="duotone" aria-hidden="true" />
      </div>
      {languages.map((lang) => {
        const isSelected = currentLang === lang;
        const meta = SUPPORTED_VOICE_LANGUAGES[lang];
        return (
          <button
            key={lang}
            type="button"
            onClick={() => handleSelect(lang)}
            aria-pressed={isSelected}
            className={`px-2.5 py-1 text-xs font-mono rounded-[4px] transition-all cursor-pointer ${
              isSelected
                ? "bg-brand text-ink font-semibold shadow-[0_0_8px_rgba(255,75,31,0.25)]"
                : "text-muted hover:text-text hover:bg-surface/50"
            }`}
          >
            {meta.nativeLabel}
          </button>
        );
      })}
    </div>
  );
}
