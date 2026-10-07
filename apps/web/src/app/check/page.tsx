"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Info } from "lucide-react";
import { CameraCapture } from "../../components/camera-capture";
import { VerdictCard } from "../../components/verdict-card";
import { runCustomerCheck, AuditResult, ApiError } from "../../lib/api";

export default function CustomerCheckPage() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verdictResult, setVerdictResult] = useState<AuditResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleCapture = useCallback(async (data: { photoBase64: string; qrPayload?: string }) => {
    if (!data.qrPayload) return;

    setIsVerifying(true);
    setApiError(null);

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
    } catch (err) {
      const error = err as ApiError;
      setApiError(
        error.message || "Failed to check merchant sticker. Please check your connection.",
      );
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const resetCheck = useCallback(() => {
    setVerdictResult(null);
    setApiError(null);
  }, []);

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
            <ArrowLeft className="w-4 h-4 text-text" />
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

      {/* Explanatory Banner */}
      {!verdictResult && !isVerifying && (
        <div className="mb-4 p-3.5 rounded-[4px] bg-ink-2 border border-border flex items-start gap-2.5 text-xs text-muted leading-relaxed">
          <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <p>
            Point your camera at the merchant's physical UPI sticker before paying to confirm it has
            not been swapped or relocated. QRaksha never touches your payment.
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
            className="self-end px-3 py-1 rounded-[4px] bg-danger text-ink font-mono text-[10px]"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading state */}
      {isVerifying && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-[4px] bg-ink-2 border border-brand/40 text-center gap-4 animate-pulse">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
          <div>
            <h2 className="text-sm font-medium text-text">Checking Merchant Registry</h2>
            <p className="text-xs font-mono text-brand mt-1">Cross-referencing QR & location…</p>
          </div>
          <p className="text-[11px] text-muted max-w-[260px] leading-relaxed">
            Querying public tamper-evident registry for matching credential status.
          </p>
        </div>
      )}

      {/* Verdict Takeover */}
      {!isVerifying && verdictResult && (
        <div className="flex flex-col gap-4">
          <VerdictCard
            result={verdictResult}
            onReset={resetCheck}
            title="Public Verification Result"
            isCustomerView={true}
          />

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
