"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ShieldWarning, Warning, SpinnerGap } from "@phosphor-icons/react";
import { fileDispute, FileDisputeResult } from "../../../../lib/api";

function DisputeForm() {
  const searchParams = useSearchParams();
  const initialCredentialId = searchParams.get("credentialId") || "";

  const [credentialId, setCredentialId] = useState(initialCredentialId);
  const [evidenceSummary, setEvidenceSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FileDisputeResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialId.trim()) {
      setError("Target Credential ID is required.");
      return;
    }
    if (evidenceSummary.trim().length < 10) {
      setError("Please provide at least 10 characters detailing the dispute evidence.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fileDispute({
        credentialId: credentialId.trim(),
        evidenceSummary: evidenceSummary.trim(),
      });
      setResult(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to file dispute. Please verify the target credential ID and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center text-center py-8">
        <div className="w-12 h-12 rounded-[4px] bg-danger/10 border border-danger/30 flex items-center justify-center text-danger mb-4">
          <ShieldWarning className="w-6 h-6" weight="duotone" />
        </div>

        <span className="text-[11px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-[4px] bg-danger/10 text-danger border border-danger/30 mb-2">
          DISPUTE FILED • TIER DOWNGRADED
        </span>

        <h2 className="text-xl font-medium tracking-tight text-text mb-2">
          Target Credential Flagged
        </h2>

        <p className="text-xs text-muted leading-relaxed max-w-sm mb-6">
          The credential has been immediately downgraded to{" "}
          <strong className="text-danger font-mono font-medium">🔴 WARNING</strong>. Its previous
          tier was <span className="font-mono uppercase">{result.previousTrustTier}</span>. An
          administrative auditor will review your evidence within 24 hours.
        </p>

        <div className="w-full p-4 rounded-[4px] bg-ink-2 border border-border text-left mb-6 font-mono text-xs">
          <div className="flex justify-between py-1 border-b border-border/50 text-[11px]">
            <span className="text-muted">Dispute ID:</span>
            <span className="text-text select-all">{result.dispute.id}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/50 text-[11px]">
            <span className="text-muted">Target Credential:</span>
            <span className="text-text select-all truncate max-w-[200px]">
              {result.targetCredentialId}
            </span>
          </div>
          <div className="flex justify-between py-1 text-[11px]">
            <span className="text-muted">Status:</span>
            <span className="text-warn uppercase font-semibold">UNDER ADMIN REVIEW</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <Link
            href="/dashboard"
            className="h-10 px-4 rounded-[4px] bg-brand text-ink font-medium text-sm flex items-center justify-center gap-2 hover:bg-brand-soft transition-colors"
          >
            <span>Return to Merchant Dashboard</span>
          </Link>
          <Link
            href="/audit/run"
            className="h-9 px-4 rounded-[4px] bg-transparent border border-border text-muted hover:text-text text-xs font-medium flex items-center justify-center transition-colors"
          >
            <span>Run Another Audit Scan</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
        <Link
          href="/dashboard"
          aria-label="Back to Dashboard"
          className="w-8 h-8 rounded-[4px] bg-ink-2 border border-border flex items-center justify-center text-text hover:border-brand/40 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" weight="bold" />
        </Link>
        <div>
          <h1 className="text-base font-medium tracking-tight text-text leading-none">
            Report Impersonation / QR Swap
          </h1>
          <p className="text-[11px] font-mono text-muted mt-0.5">
            File a formal merchant credential dispute
          </p>
        </div>
      </div>

      {/* Immediate Downgrade Impact Banner */}
      <div className="p-3.5 rounded-[4px] bg-danger/10 border border-danger/30 mb-6 flex gap-3 items-start">
        <ShieldWarning className="w-4 h-4 text-danger shrink-0 mt-0.5" weight="duotone" />
        <div className="text-xs leading-relaxed text-text">
          <span className="font-semibold text-danger block mb-0.5 font-mono text-[11px] uppercase tracking-wide">
            Immediate Auto-Downgrade
          </span>
          Submitting a dispute automatically downgrades the target credential to{" "}
          <span className="text-danger font-mono font-medium">🔴 WARNING</span> across all customer
          and audit scans while an admin reviews your report.
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-[4px] bg-danger/10 border border-danger/30 text-danger text-xs mb-4 flex items-center gap-2">
          <Warning className="w-4 h-4 shrink-0" weight="duotone" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium text-text mb-1 block">Target Credential ID</label>
          <input
            type="text"
            required
            value={credentialId}
            onChange={(e) => setCredentialId(e.target.value)}
            placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            className="w-full h-10 px-3 rounded-[4px] border border-border bg-ink-2 text-text font-mono text-xs focus:outline-none focus:border-brand"
          />
          <p className="text-[10px] font-mono text-muted mt-1">
            Found on the merchant's physical sticker, QRaksha verification URL, or audit logs.
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-text mb-1 block">
            Evidence Summary & Circumstances
          </label>
          <textarea
            rows={5}
            required
            minLength={10}
            maxLength={2000}
            value={evidenceSummary}
            onChange={(e) => setEvidenceSummary(e.target.value)}
            placeholder="Explain why this credential is fraudulent (e.g. Unauthorized sticker pasted over counter, fake merchant name, altered VPA recipient, photo evidence link)..."
            className="w-full p-3 rounded-[4px] border border-border bg-ink-2 text-text text-xs focus:outline-none focus:border-brand resize-none leading-relaxed"
          />
          <div className="flex justify-between items-center text-[10px] font-mono text-muted mt-1">
            <span>Minimum 10 characters required</span>
            <span>{evidenceSummary.length} / 2000</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 h-10 px-4 rounded-[4px] bg-danger text-white font-medium text-xs flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isSubmitting ? (
            <>
              <SpinnerGap className="w-4 h-4 animate-spin" weight="bold" />
              <span>Flagging Target Credential...</span>
            </>
          ) : (
            <>
              <ShieldWarning className="w-4 h-4" weight="bold" />
              <span>Submit Dispute & Flag Credential</span>
            </>
          )}
        </button>

        <p className="text-[10px] text-center text-muted leading-relaxed mt-1">
          Frivolous or malicious filings will be rejected and may result in penalties to your
          merchant account.
        </p>
      </form>
    </>
  );
}

export default function NewDisputePage() {
  return (
    <main className="flex-1 flex flex-col p-6 max-w-[480px] mx-auto w-full">
      <Suspense
        fallback={<div className="text-xs font-mono text-muted p-4">Loading dispute form...</div>}
      >
        <DisputeForm />
      </Suspense>
    </main>
  );
}
