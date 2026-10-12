"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  ArrowSquareOut,
  Warning,
  SpinnerGap,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  Check,
  MapPin,
  QrCode,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { VerifyCredentialResult } from "@qraksha/shared";
import { getCredentialVerification, ApiError } from "@/lib/api";

interface Props {
  params: Promise<{ credentialId: string }>;
}

export default function VerifyCredentialPage({ params }: Props) {
  const unwrappedParams = use(params);
  const credentialId = unwrappedParams.credentialId;

  const [data, setData] = useState<VerifyCredentialResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  const fetchVerification = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCredentialVerification(credentialId);
      setData(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to load credential verification details. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVerification();
  }, [credentialId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <main className="flex-1 flex flex-col p-6 max-w-[540px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="p-2 rounded-[4px] bg-ink-2 border border-border hover:border-brand transition-colors text-text"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-4 h-4 text-text" weight="bold" />
        </Link>
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-brand">
            <ShieldCheck className="w-3.5 h-3.5" weight="duotone" />
            <span>PUBLIC AUDIT // ON-CHAIN ANCHOR</span>
          </div>
          <h1 className="text-lg font-medium text-text">Credential Audit Record</h1>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 rounded-[4px] bg-ink-2 border border-border flex flex-col items-center justify-center gap-3 text-center my-6">
          <SpinnerGap className="w-6 h-6 animate-spin text-brand" weight="bold" />
          <span className="text-xs font-mono text-muted">
            Retrieving on-chain verification proof…
          </span>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div
          role="alert"
          className="p-5 rounded-[4px] bg-danger/10 border border-danger text-text flex flex-col gap-3 my-4"
        >
          <div className="flex items-start gap-3">
            <Warning className="w-5 h-5 text-danger shrink-0 mt-0.5" weight="duotone" />
            <div className="flex-1">
              <h2 className="text-sm font-medium text-text">Verification Lookup Failed</h2>
              <p className="text-xs text-muted mt-1 leading-relaxed">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchVerification}
            className="self-start h-8 px-3 rounded-[4px] bg-ink border border-border text-xs font-medium text-text hover:border-brand flex items-center gap-1.5 transition-colors"
          >
            <ArrowsClockwise className="w-3 h-3" weight="bold" />
            <span>Retry Lookup</span>
          </button>
        </div>
      )}

      {/* Verification Details */}
      {!isLoading && data && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
          {/* Status Banner Card */}
          <div
            className={`p-5 rounded-[4px] bg-ink-2 border-t border-r border-b border-border flex flex-col gap-3 ${
              data.verifiedOnChain
                ? "border-l-4 border-l-ok"
                : data.anchor?.status === "pending"
                  ? "border-l-4 border-l-warn"
                  : "border-l-4 border-l-danger"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {data.verifiedOnChain ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-ok" weight="duotone" />
                    <span className="font-mono text-xs uppercase tracking-wider text-ok font-medium">
                      Tamper-Evident On-Chain Proof
                    </span>
                  </>
                ) : data.anchor?.status === "pending" ? (
                  <>
                    <Clock className="w-4 h-4 text-warn" weight="duotone" />
                    <span className="font-mono text-xs uppercase tracking-wider text-warn font-medium">
                      Anchoring In Progress
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-danger" weight="duotone" />
                    <span className="font-mono text-xs uppercase tracking-wider text-danger font-medium">
                      Anchor Verification Incomplete
                    </span>
                  </>
                )}
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-[4px] border ${
                  data.verifiedOnChain
                    ? "bg-ok/10 text-ok border-ok/30"
                    : data.anchor?.status === "pending"
                      ? "bg-warn/10 text-warn border-warn/30"
                      : "bg-danger/10 text-danger border-danger/30"
                }`}
              >
                STATUS: {data.status.toUpperCase()}
              </span>
            </div>

            <div>
              <h2 className="text-base font-medium text-text">{data.displayName}</h2>
              <p className="text-xs font-mono text-muted mt-0.5">ID: {data.credentialId}</p>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              {data.verifiedOnChain
                ? "This credential has been anchored to the public testnet. The canonical Keccak-256 hash computed from current registry metadata matches the transaction input data exactly."
                : data.anchor?.status === "pending"
                  ? "A blockchain anchor transaction has been queued and is awaiting block confirmation on Polygon Amoy."
                  : "On-chain verification has not been confirmed for this credential record."}
            </p>
          </div>

          {/* Cryptographic Proof Details */}
          <div className="p-5 rounded-[4px] bg-ink-2 border border-border flex flex-col gap-4 font-mono text-xs">
            <span className="text-[11px] uppercase tracking-wider text-brand font-medium">
              Cryptographic Anchor Details
            </span>

            {/* Canonical Hash Box */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>CANONICAL CREDENTIAL HASH (KECCAK-256)</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(data.canonicalCredentialHash)}
                  className="flex items-center gap-1 hover:text-text text-brand transition-colors"
                >
                  {copiedHash ? (
                    <>
                      <Check className="w-3 h-3 text-ok" weight="bold" />
                      <span className="text-ok">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" weight="bold" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-2.5 rounded-[4px] bg-ink border border-border text-text break-all select-all font-mono text-[11px]">
                {data.canonicalCredentialHash}
              </div>
            </div>

            {/* Anchor Transaction Details Grid */}
            <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted block text-[10px]">NETWORK</span>
                <span className="text-text">
                  {data.anchor?.network
                    ? `Polygon ${data.anchor.network.toUpperCase()}`
                    : "Polygon Amoy"}
                </span>
              </div>
              <div>
                <span className="text-muted block text-[10px]">ANCHOR STATUS</span>
                <span
                  className={
                    data.anchor?.status === "confirmed"
                      ? "text-ok font-medium"
                      : data.anchor?.status === "pending"
                        ? "text-warn font-medium"
                        : "text-muted"
                  }
                >
                  {data.anchor?.status?.toUpperCase() || "PENDING"}
                </span>
              </div>
              <div>
                <span className="text-muted block text-[10px]">TRANSACTION HASH</span>
                <span className="text-text truncate block font-mono">
                  {data.anchor?.txHash
                    ? `${data.anchor.txHash.slice(0, 10)}…${data.anchor.txHash.slice(-8)}`
                    : "Awaiting submission"}
                </span>
              </div>
              <div>
                <span className="text-muted block text-[10px]">CONFIRMED AT</span>
                <span className="text-text">
                  {data.anchor?.confirmedAt
                    ? new Date(data.anchor.confirmedAt).toLocaleTimeString()
                    : "—"}
                </span>
              </div>
            </div>

            {/* Block Explorer Link */}
            {data.anchor?.explorerUrl && (
              <a
                href={data.anchor.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-4 rounded-[4px] bg-brand text-ink font-medium text-sm flex items-center justify-center gap-2 hover:bg-brand-soft transition-colors mt-2"
              >
                <span>Inspect on Amoy PolygonScan</span>
                <ArrowSquareOut className="w-4 h-4" weight="bold" />
              </a>
            )}
          </div>

          {/* Bound Location Details */}
          {data.boundLocation && (
            <div className="p-4 rounded-[4px] bg-ink-2 border border-border flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-text">
                <MapPin className="w-4 h-4 text-brand shrink-0" weight="duotone" />
                <span>
                  Lat: {data.boundLocation.latitude.toFixed(4)}, Lng:{" "}
                  {data.boundLocation.longitude.toFixed(4)}
                </span>
              </div>
              <span className="text-ok text-[11px]">
                Bound (±{data.boundLocation.boundRadiusM}m)
              </span>
            </div>
          )}

          {/* Navigation Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/check"
              className="h-9 px-4 rounded-[4px] bg-transparent border border-border text-muted hover:text-text text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" weight="duotone" />
              <span>Verify a UPI QR Sticker</span>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
