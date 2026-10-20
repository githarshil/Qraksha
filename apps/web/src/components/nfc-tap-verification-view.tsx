"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  ShieldWarning,
  Shield,
  SpeakerHigh,
  CaretDown,
  Check,
  Warning,
  X,
  ArrowLeft,
  MapPin,
  Sliders,
  Flag,
  SpinnerGap,
} from "@phosphor-icons/react";
import {
  NfcVerdict,
  NfcLanguage,
  NfcMerchant,
  DEMO_ZONES,
  DemoZone,
  DEFAULT_DEMO_ZONE,
  NFC_REGISTRY,
  NFC_LANGUAGES,
  normalizeLocation,
} from "@/lib/nfc-constants";
import { announceVerdict, stopVoiceAnnouncement } from "@/lib/nfc-voice";

interface NfcTapVerificationViewProps {
  tagId: string;
  initialLoc?: string;
}

export function NfcTapVerificationView({ tagId, initialLoc }: NfcTapVerificationViewProps) {
  const searchParams = useSearchParams();

  // Location determination priority:
  // 1. ?loc= query param
  // 2. localStorage ("qraksha_demo_location")
  // 3. Default "Zone A"
  const [currentLocation, setCurrentLocation] = useState<DemoZone>(() => {
    const queryLoc = searchParams.get("loc") || initialLoc;
    if (queryLoc) {
      return normalizeLocation(queryLoc);
    }
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("qraksha_demo_location");
      if (stored) return normalizeLocation(stored);
    }
    return DEFAULT_DEMO_ZONE;
  });

  const [isVerifying, setIsVerifying] = useState(true);
  const [verifyingStep, setVerifyingStep] = useState(0);
  const [selectedLang, setSelectedLang] = useState<NfcLanguage>("en");
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDemoControlsOpen, setIsDemoControlsOpen] = useState(false);
  const [isReported, setIsReported] = useState(false);

  // Sync query param changes
  useEffect(() => {
    const queryLoc = searchParams.get("loc");
    if (queryLoc) {
      const normalized = normalizeLocation(queryLoc);
      setCurrentLocation(normalized);
      if (typeof window !== "undefined") {
        localStorage.setItem("qraksha_demo_location", normalized);
      }
    }
  }, [searchParams]);

  const cleanTagId = tagId.trim().toLowerCase();
  const merchant: NfcMerchant | undefined = NFC_REGISTRY[cleanTagId];

  // Verdict evaluation logic
  let verdict: NfcVerdict = "UNVERIFIED";
  if (!merchant) {
    verdict = "UNVERIFIED";
  } else if (currentLocation === merchant.registeredLocation) {
    verdict = "VERIFIED";
  } else {
    verdict = "WARNING";
  }

  // Toast auto-hide
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Simulated 1.2s verification animation matching PWA loading feel
  useEffect(() => {
    setIsVerifying(true);
    setVerifyingStep(0);

    const step1 = setTimeout(() => setVerifyingStep(1), 380);
    const step2 = setTimeout(() => setVerifyingStep(2), 760);
    const finish = setTimeout(() => {
      setIsVerifying(false);
      handlePlayAnnouncement(verdict, selectedLang, merchant?.merchantName, true);
    }, 1150);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(finish);
      stopVoiceAnnouncement();
    };
  }, [cleanTagId, currentLocation]);

  const handlePlayAnnouncement = async (
    targetVerdict: NfcVerdict,
    lang: NfcLanguage,
    merchantName?: string,
    isAutoplayAttempt: boolean = false,
  ) => {
    setIsAudioPlaying(true);
    try {
      const res = await announceVerdict(targetVerdict, lang, merchantName, () => {
        if (!isAutoplayAttempt) {
          setToastMessage("Audio unavailable");
        }
      });
      if (!res.success && !isAutoplayAttempt) {
        setToastMessage("Audio unavailable");
      }
    } catch {
      if (!isAutoplayAttempt) {
        setToastMessage("Audio unavailable");
      }
    } finally {
      setIsAudioPlaying(false);
    }
  };

  const handleLanguageChange = (lang: NfcLanguage) => {
    setSelectedLang(lang);
    handlePlayAnnouncement(verdict, lang, merchant?.merchantName, false);
  };

  const handleSelectZone = (zone: DemoZone) => {
    setCurrentLocation(zone);
    if (typeof window !== "undefined") {
      localStorage.setItem("qraksha_demo_location", zone);
    }
    const url = new URL(window.location.href);
    url.searchParams.set("loc", zone.toLowerCase().replace(" ", "-"));
    window.history.replaceState({}, "", url.toString());
  };

  const handleReportTag = () => {
    setIsReported(true);
    setToastMessage("Audit alert submitted. Tag reported for inspection.");
  };

  // PWA Semantic verdict styling matching verdict-card.tsx
  let borderColor = "border-l-warn";
  let textColor = "text-warn";
  let bgBadge = "bg-warn/10 text-warn border-warn/30";
  let ShieldIcon = Shield;
  let verdictDisplayLabel = "UNVERIFIED";

  if (verdict === "VERIFIED") {
    borderColor = "border-l-ok";
    textColor = "text-ok";
    bgBadge = "bg-ok/10 text-ok border-ok/30";
    ShieldIcon = ShieldCheck;
    verdictDisplayLabel = "VERIFIED";
  } else if (verdict === "WARNING") {
    borderColor = "border-l-danger";
    textColor = "text-danger";
    bgBadge = "bg-danger/15 text-[#FF6B81] border-danger/40";
    ShieldIcon = ShieldWarning;
    verdictDisplayLabel = "LOCATION MISMATCH";
  }

  return (
    <main className="flex-1 flex flex-col p-4 sm:p-6 max-w-[440px] mx-auto w-full pb-[calc(8rem+env(safe-area-inset-bottom,0px))]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 card-glass border border-[var(--brand)] text-[var(--text-primary)] text-xs font-mono px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-[var(--brand)] animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* PWA Standard Header */}
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to Home"
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-[14px] bg-[var(--header-btn-bg)] border border-[var(--header-btn-border)] shadow-[var(--header-btn-shadow)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--header-btn-border-hover)] flex items-center justify-center transition-all select-none"
          >
            <ArrowLeft className="w-5 h-5" weight="bold" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">NFC Tap Check</h1>
            <p className="text-xs text-[var(--text-secondary)]">Physical sticker audit proof</p>
          </div>
        </div>

        {/* Demo Controls Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDemoControlsOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer select-none"
            title="Simulated Demo Location Controls"
          >
            <Sliders weight="bold" className="w-3.5 h-3.5 text-[#E0262F]" />
            <span className="font-semibold text-[var(--text-primary)]">{currentLocation}</span>
            <CaretDown
              weight="bold"
              className={`w-3 h-3 transition-transform ${isDemoControlsOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Demo Controls Dropdown */}
          {isDemoControlsOpen && (
            <div className="absolute right-0 mt-2 w-64 p-3.5 rounded-[18px] card-glass shadow-2xl z-40 flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-2">
                <span className="font-mono text-[10px] text-[#E0262F] uppercase tracking-wider font-semibold">
                  demo location (simulated)
                </span>
                <span className="text-[9px] font-mono text-[var(--text-muted)]">Live Audit</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-sans">
                GPS is simulated for indoor demo. Switch zones to test physical relocation &
                mismatch detection in real time.
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {DEMO_ZONES.map((zone) => {
                  const isActive = currentLocation === zone;
                  return (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => {
                        handleSelectZone(zone);
                        setIsDemoControlsOpen(false);
                      }}
                      className={`py-1.5 px-2 rounded-[10px] font-mono text-[11px] text-center border transition-all cursor-pointer ${
                        isActive
                          ? "btn-red-glass text-white font-bold shadow-md"
                          : "bg-[var(--box-mono-bg)] text-[var(--text-secondary)] border-[var(--box-mono-border)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {zone}
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] font-mono text-[var(--text-muted)] pt-1 border-t border-[var(--surface-border)] flex items-center justify-between">
                <span>Active param:</span>
                <span className="text-[var(--text-primary)] font-medium">
                  ?loc={currentLocation.toLowerCase().replace(" ", "-")}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Language Selector Bar matching PWA */}
      <div className="card-glass px-4 py-2.5 rounded-[16px] flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs">
          <SpeakerHigh
            weight="fill"
            className={`w-4 h-4 text-[#E0262F] ${isAudioPlaying ? "animate-pulse" : ""}`}
          />
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-medium">
            Voice Announcement
          </span>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-[12px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)]">
          {NFC_LANGUAGES.map((lang) => {
            const isSelected = selectedLang === lang.id;
            return (
              <button
                key={lang.id}
                type="button"
                onClick={() => handleLanguageChange(lang.id)}
                className={`px-2.5 py-1 text-xs font-mono rounded-[8px] transition-all cursor-pointer ${
                  isSelected
                    ? "btn-red-glass text-white font-medium shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
                title={lang.nativeName}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Card Area */}
      {isVerifying ? (
        /* PWA Loading State */
        <div className="card-glass p-8 flex flex-col items-center justify-center gap-4 text-center my-auto min-h-[380px] rounded-[24px]">
          <SpinnerGap className="w-8 h-8 animate-spin text-[#E0262F]" weight="bold" />
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Verifying NFC Cryptographic Anchor...
            </h2>
            <p className="text-xs text-[var(--text-secondary)] font-mono">
              Resolving physical merchant binding & cell proximity
            </p>
          </div>

          <div className="w-full max-w-[280px] flex flex-col gap-2 font-mono text-[11px] text-left mt-2">
            <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
              {verifyingStep >= 0 ? (
                <Check className="w-3.5 h-3.5 text-ok shrink-0" weight="bold" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-[var(--surface-border)] shrink-0" />
              )}
              <span className={verifyingStep >= 0 ? "text-[var(--text-primary)] font-medium" : ""}>
                Read cryptographic tag UID
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
              {verifyingStep >= 1 ? (
                <Check className="w-3.5 h-3.5 text-ok shrink-0" weight="bold" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-t-[#E0262F] border-transparent animate-spin shrink-0" />
              )}
              <span className={verifyingStep >= 1 ? "text-[var(--text-primary)] font-medium" : ""}>
                Query merchant registry binding
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
              {verifyingStep >= 2 ? (
                <Check className="w-3.5 h-3.5 text-ok shrink-0" weight="bold" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-[var(--surface-border)] shrink-0" />
              )}
              <span className={verifyingStep >= 2 ? "text-[var(--text-primary)] font-medium" : ""}>
                Validate physical zone proximity
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* PWA Verdict Card (Matching verdict-card.tsx 1:1) */
        <div className="flex flex-col gap-4 animate-verdict-reveal">
          <div
            className={`p-6 rounded-[24px] bg-[var(--surface)] border-t border-r border-b border-[var(--surface-border)] border-l-4 ${borderColor} shadow-[var(--surface-shadow)] flex flex-col gap-5 transition-colors duration-200`}
          >
            {/* Top: Verdict Name & Shield Icon */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                  Merchant Status
                </span>
                <h2 className={`text-2xl font-mono font-medium tracking-tight mt-0.5 ${textColor}`}>
                  {verdictDisplayLabel}
                </h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${bgBadge}`}
                  >
                    TAG // {cleanTagId}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    LOC: {currentLocation}
                  </span>
                </div>
              </div>
              <div
                className={`p-2.5 rounded-[14px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] ${textColor}`}
              >
                <ShieldIcon className="w-7 h-7" weight="duotone" />
              </div>
            </div>

            {/* Merchant Details Box */}
            <div className="p-3.5 rounded-[16px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] tracking-wider">
                    Merchant Identity
                  </span>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mt-0.5">
                    {merchant ? merchant.merchantName : "Unregistered Merchant"}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {merchant ? merchant.category : "Category Unknown"}
                  </p>
                </div>
                {merchant && (
                  <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--surface-border)]">
                    Est. {merchant.verifiedSince}
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-[var(--surface-border)] flex flex-col gap-1.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-secondary)]">UPI ID</span>
                  <span className="text-[11px] font-medium text-[var(--text-primary)] select-all">
                    {merchant ? merchant.upiId : "Not registered"}
                  </span>
                </div>

                {/* Location Display */}
                {verdict === "WARNING" ? (
                  <div className="p-3 rounded-[14px] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 flex flex-col gap-2 mt-1">
                    <span className="text-[10px] uppercase font-mono text-[#E0262F] font-semibold flex items-center gap-1.5">
                      <Warning weight="bold" className="w-3.5 h-3.5" />
                      Location Discrepancy Detected
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 rounded-[10px] bg-[var(--surface)] border border-[var(--surface-border)]">
                        <span className="block text-[9px] uppercase font-mono text-[var(--text-muted)]">
                          Registered At
                        </span>
                        <span className="block text-xs font-bold text-ok mt-0.5 font-mono">
                          {merchant?.registeredLocation}
                        </span>
                      </div>
                      <div className="p-2 rounded-[10px] bg-red-100/60 dark:bg-red-900/40 border border-red-300 dark:border-red-800">
                        <span className="block text-[9px] uppercase font-mono text-[#E0262F]">
                          Observed Here
                        </span>
                        <span className="block text-xs font-bold text-[#E0262F] mt-0.5 font-mono">
                          {currentLocation}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-secondary)]">Physical Zone</span>
                    <span className="text-[11px] font-medium text-[var(--text-primary)] flex items-center gap-1 font-mono">
                      <MapPin weight="bold" className="w-3 h-3 text-[#E0262F]" />
                      {merchant ? merchant.registeredLocation : `${currentLocation} (Unregistered)`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Plain Language Message */}
            <p className="text-xs text-[var(--text-primary)] leading-relaxed font-sans border-t border-[var(--surface-border)] pt-3">
              {verdict === "VERIFIED" &&
                "Credential matches this physical location. The physical NFC cryptographic anchor and merchant registration are authentic."}
              {verdict === "UNVERIFIED" && (
                <>
                  No merchant credential found for this tag.{" "}
                  <span className="font-semibold text-warn">
                    Advice: pay only if you know and trust this shop.
                  </span>
                </>
              )}
              {verdict === "WARNING" && (
                <span className="text-[#E0262F] font-medium">
                  This tag is registered to {merchant?.merchantName} at{" "}
                  {merchant?.registeredLocation}, but it is being used at {currentLocation}.
                  Possible relocated or cloned tag. Do not pay.
                </span>
              )}
            </p>

            {/* 3-Row Checks Run Breakdown (Matching verdict-card.tsx 1:1) */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[var(--surface-border)]">
              <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] tracking-wider">
                Multi-Point Evidence Breakdown
              </span>

              {/* Check 1: Tag Lookup */}
              <div className="p-3 rounded-[14px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className="text-[var(--text-muted)] font-mono text-[11px] shrink-0 mt-0.5">
                    01
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] leading-tight">
                      Tag Lookup
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mt-0.5 break-words">
                      {merchant
                        ? "Cryptographic NFC tag verified in registry"
                        : "Tag UID not found in registered merchant ledger"}
                    </p>
                  </div>
                </div>
                {merchant ? (
                  <span className="shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-ok/10 text-ok border border-ok/30">
                    <Check className="w-3 h-3" weight="bold" /> PASS
                  </span>
                ) : (
                  <span className="shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-warn/10 text-warn border border-warn/30">
                    <Warning className="w-3 h-3" weight="bold" /> NOT FOUND
                  </span>
                )}
              </div>

              {/* Check 2: Merchant Identity */}
              <div className="p-3 rounded-[14px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className="text-[var(--text-muted)] font-mono text-[11px] shrink-0 mt-0.5">
                    02
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] leading-tight">
                      Merchant Identity
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mt-0.5 break-words">
                      {merchant
                        ? `${merchant.merchantName} (${merchant.upiId})`
                        : "Cannot bind unverified tag to merchant identity"}
                    </p>
                  </div>
                </div>
                {merchant ? (
                  <span className="shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-ok/10 text-ok border border-ok/30">
                    <Check className="w-3 h-3" weight="bold" /> PASS
                  </span>
                ) : (
                  <span className="shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--surface-border)]">
                    SKIPPED
                  </span>
                )}
              </div>

              {/* Check 3: Location Context */}
              <div className="p-3 rounded-[14px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className="text-[var(--text-muted)] font-mono text-[11px] shrink-0 mt-0.5">
                    03
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] leading-tight">
                      Location Context
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mt-0.5 break-words">
                      {verdict === "VERIFIED"
                        ? `Physical proximity confirmed for ${currentLocation}`
                        : verdict === "WARNING"
                          ? `Registered ${merchant?.registeredLocation} vs detected ${currentLocation}`
                          : "Location verification skipped for unregistered tag"}
                    </p>
                  </div>
                </div>
                {verdict === "VERIFIED" ? (
                  <span className="shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-ok/10 text-ok border border-ok/30">
                    <Check className="w-3 h-3" weight="bold" /> PASS
                  </span>
                ) : verdict === "WARNING" ? (
                  <span className="shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-danger/10 text-[#FF6B81] border border-danger/30">
                    <X className="w-3 h-3" weight="bold" /> MISMATCH
                  </span>
                ) : (
                  <span className="shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--surface-border)]">
                    SKIPPED
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Matching PWA Style */}
          <div className="flex flex-col gap-2.5 mt-1">
            {verdict === "VERIFIED" && merchant && (
              <a
                href={`upi://pay?pa=${encodeURIComponent(merchant.upiId)}&pn=${encodeURIComponent(merchant.merchantName)}&cu=INR`}
                className="h-12 w-full px-4 rounded-[16px] bg-[#2FBF71] hover:bg-[#28A763] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(47,191,113,0.35)] transition-all cursor-pointer select-none"
              >
                <Check weight="bold" className="w-4 h-4" />
                <span>Continue to pay</span>
              </a>
            )}

            {verdict === "WARNING" && (
              <>
                <button
                  type="button"
                  onClick={handleReportTag}
                  disabled={isReported}
                  className={`h-12 w-full px-4 rounded-[16px] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isReported
                      ? "bg-stone-500 cursor-not-allowed opacity-75"
                      : "btn-red-glass shadow-[var(--red-glass-shadow)]"
                  }`}
                >
                  <Flag weight="fill" className="w-4 h-4" />
                  <span>{isReported ? "Tag Reported to Security" : "Report this tag"}</span>
                </button>

                <Link
                  href="/"
                  className="btn-pill-secondary h-11 w-full px-4 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer select-none"
                >
                  <ArrowLeft weight="bold" className="w-3.5 h-3.5" />
                  <span>Go back</span>
                </Link>
              </>
            )}

            {verdict === "UNVERIFIED" && (
              <Link
                href="/"
                className="btn-pill-secondary h-12 w-full px-4 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer select-none"
              >
                <ArrowLeft weight="bold" className="w-3.5 h-3.5" />
                <span>Go back</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
