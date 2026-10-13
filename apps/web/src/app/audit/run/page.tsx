"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  SpinnerGap,
  MapPin,
  WarningCircle,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import { CameraCapture } from "../../../components/camera-capture";
import { VerdictCard } from "../../../components/verdict-card";
import { runSelfAudit, AuditResult, ApiError } from "../../../lib/api";

export default function AuditRunPage() {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentAgentStep, setCurrentAgentStep] = useState<string>("Checking QR identity…");
  const [verdictResult, setVerdictResult] = useState<AuditResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Request GPS geolocation on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setGeoError(null);
        },
        (err) => {
          // Fallback or permission denial handling per PRD.md Section 6
          setGeoError(
            err.code === 1
              ? "Location permission was denied. Geolocation check requires permission."
              : "Unable to retrieve precise GPS. Using default premises location.",
          );
          // Default fallback coordinates for test/demo environment
          setCoords({ latitude: 12.9716, longitude: 77.5946 });
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } else {
      setCoords({ latitude: 12.9716, longitude: 77.5946 });
    }
  }, []);

  const handleCapture = useCallback(
    async (data: { photoBase64: string; qrPayload?: string }) => {
      if (!data.qrPayload) return;

      setIsVerifying(true);
      setApiError(null);

      // Multi-agent progress simulation labels per PRD.md Section 6
      const steps = [
        "Checking QR identity & format…",
        "Comparing to registered photo embedding…",
        "Verifying geolocation against bound premises…",
        "Synthesizing multi-agent verdict…",
      ];

      let stepIndex = 0;
      const interval = setInterval(() => {
        stepIndex = (stepIndex + 1) % steps.length;
        setCurrentAgentStep(steps[stepIndex]);
      }, 450);

      try {
        const result = await runSelfAudit({
          qrPayload: data.qrPayload,
          latitude: coords?.latitude ?? 12.9716,
          longitude: coords?.longitude ?? 77.5946,
          photoBase64: data.photoBase64,
        });

        clearInterval(interval);
        setVerdictResult(result);
      } catch (err) {
        clearInterval(interval);
        const error = err as ApiError;
        setApiError(
          error.message ||
            "Self-audit verification failed. Please check your connection and try again.",
        );
      } finally {
        setIsVerifying(false);
      }
    },
    [coords],
  );

  const resetAudit = useCallback(() => {
    setVerdictResult(null);
    setApiError(null);
  }, []);

  return (
    <main className="flex-1 flex flex-col p-6 max-w-[480px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to Dashboard"
            className="p-2 rounded-[4px] bg-ink-2 border border-border hover:border-brand transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-text" weight="bold" />
          </Link>
          <div>
            <h1 className="text-base font-medium text-text">Self-Audit Verification</h1>
            <p className="text-xs font-mono text-muted">Daily sticker integrity loop</p>
          </div>
        </div>

        <Link
          href="/audit/history"
          className="text-xs px-3 py-1.5 rounded-[4px] bg-ink-2 border border-border text-muted hover:text-text hover:border-brand flex items-center gap-1.5 transition-colors font-medium"
        >
          <ClockCounterClockwise className="w-3.5 h-3.5 text-brand" weight="bold" />
          <span>History</span>
        </Link>
      </div>

      {/* Geolocation Notice */}
      {coords && (
        <div className="mb-4 px-3 py-2 rounded-[4px] bg-ink-2 border border-border flex items-center justify-between text-xs font-mono text-muted">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-ok" weight="duotone" />
            <span>
              GPS ACTIVE: {coords.latitude.toFixed(3)}, {coords.longitude.toFixed(3)}
            </span>
          </div>
          <span className="text-[10px] text-ok">~100M RADIUS</span>
        </div>
      )}

      {geoError && (
        <div className="mb-4 p-3 rounded-[4px] bg-warn/10 border border-warn/30 text-warn text-xs flex items-center gap-2">
          <WarningCircle className="w-4 h-4 shrink-0" weight="duotone" />
          <span>{geoError}</span>
        </div>
      )}

      {/* API Error Alert */}
      {apiError && (
        <div className="mb-4 p-4 rounded-[4px] bg-danger/10 border border-danger text-danger text-xs flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" weight="duotone" />
            <p className="font-medium text-text">{apiError}</p>
          </div>
          <button
            type="button"
            onClick={resetAudit}
            className="self-end px-3 py-1 rounded-[4px] bg-danger text-ink font-medium text-xs"
          >
            Retry Scan
          </button>
        </div>
      )}

      {/* Loading Skeleton during Multi-Agent Verification (PRD.md Section 6) */}
      {isVerifying && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-[4px] bg-ink-2 border border-brand/40 text-center gap-4 animate-pulse">
          <SpinnerGap className="w-8 h-8 text-brand animate-spin" weight="bold" />
          <div>
            <h2 className="text-sm font-medium text-text">Running 5-Agent Pipeline</h2>
            <p className="text-xs font-mono text-brand mt-1">{currentAgentStep}</p>
          </div>
          <div className="w-full max-w-[240px] h-1.5 bg-ink rounded-full overflow-hidden mt-2">
            <div className="h-full bg-brand animate-pulse w-3/4" />
          </div>
          <p className="text-[11px] text-muted max-w-[260px] leading-relaxed">
            Evaluating QR identity, visual perceptual embedding, bound GPS, and attestation history.
          </p>
        </div>
      )}

      {/* Verdict Result Full-screen Takeover (DESIGN.md Section 5) */}
      {!isVerifying && verdictResult && (
        <div className="flex flex-col gap-4">
          <VerdictCard
            result={verdictResult}
            onReset={resetAudit}
            title="Self-Audit Verification Outcome"
          />
          <Link
            href="/dashboard"
            className="h-10 px-4 rounded-[4px] bg-ink-2 border border-border text-text hover:border-brand text-xs font-medium flex items-center justify-center transition-colors"
          >
            <span>Return to Dashboard</span>
          </Link>
        </div>
      )}

      {/* Quick Sticker Selection for verification */}
      {!isVerifying && !verdictResult && (
        <div className="mb-4 p-3 rounded-[4px] bg-ink-2 border border-border flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted uppercase">
            <span>Sticker Preset // One-Click Audit</span>
            <span className="text-ok">REGISTERED</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => {
                handleCapture({
                  photoBase64:
                    "data:image/jpeg;base64," +
                    btoa("photo-bytes-for-harshil-qr-sample-testing-12345678901234567890"),
                  qrPayload:
                    "upi://pay?pa=harshil.456.sharma@okhdfcbank&pn=Harshil%20Sharma&aid=uGICAgMCc_OiTDg",
                });
              }}
              className="w-full text-left p-2.5 rounded-[4px] bg-ink border border-border hover:border-brand transition-colors text-xs font-mono text-text flex items-center justify-between"
            >
              <div>
                <span className="font-medium text-brand">Counter 2 (Harshil Sharma)</span>
                <p className="text-[10px] text-muted truncate mt-0.5">
                  upi://pay?pa=harshil.456.sharma@okhdfcbank…
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-[2px] bg-brand/10 text-brand border border-brand/30 shrink-0">
                AUDIT NOW
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleCapture({
                  photoBase64:
                    "data:image/jpeg;base64," +
                    btoa("photo-bytes-for-harshil-qr-sample-testing-12345678901234567890"),
                  qrPayload:
                    "upi://pay?pa=sharmacanteen@okaxis&pn=Sharma%20Canteen&mc=5499&aid=uGICAgICAgICAgA",
                });
              }}
              className="w-full text-left p-2.5 rounded-[4px] bg-ink border border-border hover:border-brand transition-colors text-xs font-mono text-text flex items-center justify-between"
            >
              <div>
                <span className="font-medium text-text">Counter 1 (Sharma Canteen)</span>
                <p className="text-[10px] text-muted truncate mt-0.5">
                  upi://pay?pa=sharmacanteen@okaxis…
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-[2px] bg-brand/10 text-brand border border-brand/30 shrink-0">
                AUDIT NOW
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Camera Capture Viewfinder */}
      {!isVerifying && !verdictResult && (
        <CameraCapture
          title="Align Physical UPI Sticker"
          helperText="Position your billing counter sticker inside the frame. Camera captures live photo and checks payload and location."
          defaultPayload="upi://pay?pa=harshil.456.sharma@okhdfcbank&pn=Harshil%20Sharma&aid=uGICAgMCc_OiTDg"
          onCapture={handleCapture}
        />
      )}
    </main>
  );
}
