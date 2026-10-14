"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Info } from "@phosphor-icons/react";

import { VoiceVerdictType, VoiceLanguageCode, formatVoiceScript } from "@qraksha/shared";
import { CameraCapture } from "../../components/camera-capture";
import { VerdictCard } from "../../components/verdict-card";
import { VoiceOrb } from "../../components/voice-orb";
import { LanguageSelector, getInitialVoiceLanguage } from "../../components/language-selector";
import { runCustomerCheck, AuditResult, ApiError } from "../../lib/api";
import { VoicePlayer, VoiceState } from "../../lib/voice-player";

export default function CustomerCheckPage() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verdictResult, setVerdictResult] = useState<AuditResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Voice Assistant state
  const [voiceLang, setVoiceLang] = useState<VoiceLanguageCode>("en-IN");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [amplitude, setAmplitude] = useState<number>(0);
  const playerRef = useRef<VoicePlayer | null>(null);

  // Initialize language preference from localStorage / browser
  useEffect(() => {
    setVoiceLang(getInitialVoiceLanguage());
  }, []);

  // Initialize VoicePlayer instance
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

  // Compute VoiceVerdictType from AuditResult
  const getVoiceVerdictKey = useCallback((result: AuditResult): VoiceVerdictType => {
    if (result.verdict === "VERIFIED") return "VERIFIED";
    if (result.verdict === "WARNING") return "WARNING";
    if (result.isUnregistered) return "UNVERIFIED";
    return "RECENTLY_REGISTERED";
  }, []);

  const handleCapture = useCallback(
    async (data: { photoBase64: string; qrPayload?: string }) => {
      if (!data.qrPayload) return;

      // Prime AudioContext from the user gesture
      playerRef.current?.primeAudioContext();

      setIsVerifying(true);
      setApiError(null);
      // Voice orb starts "thinking" the moment the check begins
      setVoiceState("thinking");

      try {
        // Best-effort optional geolocation capture without blocking the user
        let latitude: number | undefined;
        let longitude: number | undefined;

        if ("geolocation" in navigator) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 3000,
                enableHighAccuracy: false,
              });
            });
            latitude = pos.coords.latitude;
            longitude = pos.coords.longitude;
          } catch {
            // Geolocation optional for customer check
          }
        }

        const result = await runCustomerCheck({
          qrPayload: data.qrPayload,
          latitude,
          longitude,
          photoBase64: data.photoBase64,
        });

        setVerdictResult(result);

        // TRIGGER: Speak automatically right after verdict renders
        const verdictKey = getVoiceVerdictKey(result);
        playerRef.current?.playVerdict(verdictKey, voiceLang, result.merchantDisplayName);
      } catch (err) {
        const error = err as ApiError;
        setApiError(
          error.message || "Failed to check merchant sticker. Please check your connection.",
        );
        playerRef.current?.stop();
        setVoiceState("idle");
      } finally {
        setIsVerifying(false);
      }
    },
    [getVoiceVerdictKey, voiceLang],
  );

  const resetCheck = useCallback(() => {
    playerRef.current?.stop();
    setVerdictResult(null);
    setApiError(null);
    setVoiceState("idle");
    setAmplitude(0);
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (!verdictResult) return;

    if (voiceState === "speaking") {
      playerRef.current?.stop();
    } else {
      const verdictKey = getVoiceVerdictKey(verdictResult);
      playerRef.current?.playVerdict(verdictKey, voiceLang, verdictResult.merchantDisplayName);
    }
  }, [verdictResult, voiceState, getVoiceVerdictKey, voiceLang]);

  // Re-trigger voice if language changes while viewing a verdict
  const handleLanguageChange = useCallback(
    (newLang: VoiceLanguageCode) => {
      setVoiceLang(newLang);
      if (verdictResult) {
        const verdictKey = getVoiceVerdictKey(verdictResult);
        playerRef.current?.playVerdict(verdictKey, newLang, verdictResult.merchantDisplayName);
      }
    },
    [verdictResult, getVoiceVerdictKey],
  );

  const voiceVerdict = verdictResult ? getVoiceVerdictKey(verdictResult) : "UNVERIFIED";
  const spokenAriaText = verdictResult
    ? formatVoiceScript(voiceVerdict, voiceLang, verdictResult.merchantDisplayName)
    : "";

  return (
    <main className="flex-1 flex flex-col p-6 max-w-[480px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to Home"
            className="p-2 rounded-[4px] bg-ink-2 border border-border hover:border-brand transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-text" weight="bold" />
          </Link>
          <div>
            <h1 className="text-base font-medium text-text">Customer Pre-Pay Check</h1>
            <p className="text-xs font-mono text-muted">Verify any physical UPI sticker</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-brand/10 text-brand border border-brand/30">
          NO LOGIN REQ
        </span>
      </div>

      {/* Language Selector Header Bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
          Voice Assistant
        </span>
        <LanguageSelector currentLang={voiceLang} onSelectLang={handleLanguageChange} />
      </div>

      {/* Explanatory Banner */}
      {!verdictResult && !isVerifying && (
        <div className="mb-4 p-3.5 rounded-[4px] bg-ink-2 border border-border flex items-start gap-2.5 text-xs text-muted leading-relaxed">
          <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" weight="duotone" />
          <p>
            Point your camera at the merchant's physical UPI sticker before paying. QRaksha speaks
            who you are paying and whether the sticker is verified before you leave for your UPI
            app.
          </p>
        </div>
      )}

      {/* API Error alert */}
      {apiError && (
        <div className="mb-4 p-4 rounded-[4px] bg-danger/10 border border-danger text-danger text-xs flex flex-col gap-2">
          <p className="font-medium text-text">{apiError}</p>
          <button
            type="button"
            onClick={resetCheck}
            className="self-end px-3 py-1 rounded-[4px] bg-danger text-ink font-medium text-xs"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading state with active Thinking Orb */}
      {isVerifying && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-[4px] bg-ink-2 border border-brand/40 text-center gap-5">
          <VoiceOrb
            voiceState="thinking"
            verdict="RECENTLY_REGISTERED"
            lang={voiceLang}
            onTogglePlay={() => {}}
            size={72}
          />
          <div>
            <h2 className="text-sm font-medium text-text">Checking Merchant Registry</h2>
            <p className="text-xs font-mono text-brand mt-1">Cross-referencing QR & location…</p>
          </div>
          <p className="text-[11px] text-muted max-w-[260px] leading-relaxed">
            Querying public tamper-evident registry and preparing multilingual voice guidance.
          </p>
        </div>
      )}

      {/* Verdict Takeover with prominent Voice Thinking Orb */}
      {!isVerifying && verdictResult && (
        <div className="flex flex-col gap-5">
          {/* Accessible Live Region */}
          <div aria-live="assertive" className="sr-only">
            {spokenAriaText}
          </div>

          <VerdictCard
            result={verdictResult}
            onReset={resetCheck}
            title="Public Verification Result"
            isCustomerView={true}
            lang={voiceLang}
          />

          {/* Prominent Thinking Orb Voice Button Section */}
          <div className="p-5 rounded-[4px] bg-ink-2 border border-border flex flex-col items-center justify-center gap-3 text-center">
            <span className="text-[10px] font-mono uppercase text-muted tracking-wider">
              Multilingual Audio Verdict
            </span>
            <VoiceOrb
              voiceState={voiceState}
              verdict={voiceVerdict}
              lang={voiceLang}
              amplitude={amplitude}
              onTogglePlay={handleTogglePlay}
              size={68}
            />
            {verdictResult.merchantDisplayName && voiceVerdict === "VERIFIED" && (
              <p className="text-xs text-text font-medium">
                Verified Merchant: {verdictResult.merchantDisplayName}
              </p>
            )}
          </div>

          {/* Pay Button Pointer */}
          <div className="p-4 rounded-[4px] bg-ink-2 border border-border flex flex-col gap-2 text-center">
            <span className="text-xs text-muted">Proceed to pay using your preferred UPI app</span>
            <div className="flex justify-center gap-2 font-mono text-[11px] text-brand">
              <span>Google Pay</span>
              <span>•</span>
              <span>PhonePe</span>
              <span>•</span>
              <span>Paytm</span>
              <span>•</span>
              <span>BHIM</span>
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Viewfinder */}
      {!isVerifying && !verdictResult && (
        <CameraCapture
          title="Scan Merchant QR"
          helperText="Align the merchant's physical UPI sticker inside the frame to verify."
          onCapture={handleCapture}
        />
      )}
    </main>
  );
}
