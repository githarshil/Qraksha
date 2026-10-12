"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  QrCode,
  CheckCircle,
  WarningCircle,
  X,
  MapPin,
} from "@phosphor-icons/react";
import { CameraCapture } from "../../../components/camera-capture";
import { addQrToCredential, getRegisteredQrs, ApiError } from "../../../lib/api";

interface RegisteredQrItem {
  id: string;
  qr_payload_hash: string;
  bound_lat: number;
  bound_lng: number;
  bound_radius_m: number;
  created_at: string;
  label?: string;
}

export default function CredentialQrsPage() {
  const credentialId = "550e8400-e29b-41d4-a716-446655440000"; // Demo merchant credential
  const [qrs, setQrs] = useState<RegisteredQrItem[]>([
    {
      id: "qr-primary",
      qr_payload_hash: "8f3c7a2b9e1d4c5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
      bound_lat: 12.9716,
      bound_lng: 77.5946,
      bound_radius_m: 100,
      created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      label: "Counter 1 (Main Billing Counter)",
    },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: 12.9716,
    longitude: 77.5946,
  });
  const [capturedData, setCapturedData] = useState<{
    photoBase64: string;
    qrPayload?: string;
  } | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );

  // Load existing QRs from API
  const loadQrs = useCallback(async () => {
    try {
      const items = await getRegisteredQrs(credentialId);
      if (items && items.length > 0) {
        setQrs(
          items.map((q, idx) => ({
            ...q,
            label: idx === 0 ? "Counter 1 (Main Billing Counter)" : `Counter ${idx + 1} Sticker`,
          })),
        );
      }
    } catch {
      // Retain demo list if API unreachable
    }
  }, [credentialId]);

  useEffect(() => {
    loadQrs();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {},
        { timeout: 5000 },
      );
    }
  }, [loadQrs]);

  const handleCapture = useCallback((data: { photoBase64: string; qrPayload?: string }) => {
    setCapturedData(data);
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedData || !capturedData.qrPayload) {
      setFeedback({ type: "error", message: "Please photograph and decode the QR sticker first." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await addQrToCredential(credentialId, {
        qrPayload: capturedData.qrPayload,
        latitude: coords.latitude,
        longitude: coords.longitude,
        boundRadiusM: 100,
        photoBase64: capturedData.photoBase64,
      });

      const newQrItem: RegisteredQrItem = {
        id: res.id,
        qr_payload_hash: res.qrPayloadHash,
        bound_lat: res.boundLocation.latitude,
        bound_lng: res.boundLocation.longitude,
        bound_radius_m: res.boundLocation.boundRadiusM,
        created_at: new Date().toISOString(),
        label: labelInput.trim() || `Counter ${qrs.length + 1} Sticker`,
      };

      setQrs((prev) => [...prev, newQrItem]);
      setIsAdding(false);
      setCapturedData(null);
      setLabelInput("");
      setFeedback({
        type: "success",
        message: res.inheritedRamp
          ? "Additional QR registered successfully! Inherited abbreviated trust ramp (starts at 2 clean audits)."
          : "Additional QR registered successfully! Anchored to blockchain.",
      });
    } catch (err) {
      const error = err as ApiError;
      setFeedback({
        type: "error",
        message: error.message || "Failed to register additional QR. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col p-6 max-w-[480px] mx-auto w-full">
      {/* Header */}
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
            <h1 className="text-base font-medium text-text">Registered QR Stickers</h1>
            <p className="text-xs font-mono text-muted">Multi-QR management per credential</p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-brand/10 text-brand border border-brand/30">
          {qrs.length} REGISTERED
        </span>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`mb-4 p-3.5 rounded-[4px] border text-xs flex items-start gap-2.5 ${
            feedback.type === "success"
              ? "bg-ok/10 border-ok text-ok"
              : "bg-danger/10 border-danger text-danger"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" weight="duotone" />
          ) : (
            <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" weight="duotone" />
          )}
          <div className="flex-1">
            <p className="font-medium">{feedback.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss feedback"
            className="p-0.5 text-muted hover:text-text"
          >
            <X className="w-3.5 h-3.5" weight="bold" />
          </button>
        </div>
      )}

      {/* List of Registered QRs */}
      {!isAdding && (
        <div className="flex flex-col gap-3 mb-6">
          {qrs.map((qr) => (
            <div
              key={qr.id}
              className="p-4 rounded-[4px] bg-ink-2 border border-border flex items-start justify-between"
            >
              <div className="flex gap-3">
                <div className="p-2.5 rounded-[4px] bg-ink border border-border text-brand">
                  <QrCode className="w-5 h-5" weight="duotone" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-text">{qr.label}</h2>
                  <p className="text-[11px] font-mono text-muted mt-0.5">
                    HASH // {qr.qr_payload_hash.slice(0, 10)}…{qr.qr_payload_hash.slice(-8)}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted mt-1.5">
                    <MapPin className="w-3 h-3 text-ok" weight="duotone" />
                    <span>
                      {qr.bound_lat.toFixed(3)}, {qr.bound_lng.toFixed(3)} ({qr.bound_radius_m}m)
                    </span>
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-ok/10 text-ok border border-ok/30">
                ACTIVE
              </span>
            </div>
          ))}

          {/* Add New QR Action Button */}
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="h-11 px-4 rounded-[4px] border border-dashed border-brand text-brand font-medium text-xs flex items-center justify-center gap-2 hover:bg-brand/10 transition-colors mt-2"
          >
            <Plus className="w-4 h-4" weight="bold" />
            <span>Register Additional QR Sticker</span>
          </button>
        </div>
      )}

      {/* Add New QR Modal / Step Flow */}
      {isAdding && (
        <div className="flex flex-col gap-4 p-5 rounded-[4px] bg-ink-2 border border-brand/40">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-sm font-medium text-text">New QR Sticker Registration</h2>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setCapturedData(null);
              }}
              aria-label="Close dialog"
              className="p-1 rounded-[4px] bg-ink border border-border text-muted hover:text-text"
            >
              <X className="w-4 h-4" weight="bold" />
            </button>
          </div>

          <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="labelInput"
                className="block text-[11px] font-mono text-muted uppercase mb-1"
              >
                Sticker Counter Label
              </label>
              <input
                id="labelInput"
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="e.g. Counter 2 (Takeaway Window)"
                className="w-full h-9 px-3 rounded-[4px] bg-ink border border-border text-xs font-mono text-text focus:outline-none focus:border-brand"
              />
            </div>

            {/* Camera viewfinder capture component */}
            <CameraCapture
              title="Photograph Additional Sticker"
              helperText="Position new sticker in frame. Embedding extracted synchronously and raw photo discarded."
              defaultPayload="upi://pay?pa=sharma.counter2@upi&pn=SharmaCanteen&cu=INR"
              onCapture={handleCapture}
            />

            <div className="flex gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setCapturedData(null);
                }}
                className="flex-1 h-10 px-4 rounded-[4px] bg-ink border border-border text-muted hover:text-text font-mono text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!capturedData || isSubmitting}
                className="flex-1 h-10 px-4 rounded-[4px] bg-brand text-ink font-medium text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-soft transition-colors flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? "Registering…" : "Bind & Register QR"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
