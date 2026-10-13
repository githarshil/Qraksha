"use client";

import Link from "next/link";
import {
  QrCode,
  ShieldCheck,
  ShieldWarning,
  ClockCounterClockwise,
  ArrowSquareOut,
  ArrowRight,
  LinkSimple,
  CheckCircle,
} from "@phosphor-icons/react";

import { useEffect, useState } from "react";
import { getCredentialVerification } from "@/lib/api";

export default function DashboardPage() {
  // Demo credential data for MVP merchant view
  const demoCredentialId = "550e8400-e29b-41d4-a716-446655440000";
  const [txHash, setTxHash] = useState<string>(
    "0x5934f0384053daf1e88539c6cbd5b940efbe1f683c4b51e49a12bbce8c0be6dc",
  );
  const [explorerUrl, setExplorerUrl] = useState<string>(
    "https://amoy.polygonscan.com/tx/0x5934f0384053daf1e88539c6cbd5b940efbe1f683c4b51e49a12bbce8c0be6dc",
  );

  useEffect(() => {
    async function loadAnchor() {
      try {
        const res = await getCredentialVerification(demoCredentialId);
        if (res?.anchor?.txHash) {
          setTxHash(res.anchor.txHash);
          if (res.anchor.explorerUrl) {
            setExplorerUrl(res.anchor.explorerUrl);
          } else {
            setExplorerUrl(`https://amoy.polygonscan.com/tx/${res.anchor.txHash}`);
          }
        }
      } catch {
        // Retain verified broadcast default
      }
    }
    loadAnchor();
  }, [demoCredentialId]);

  return (
    <main className="flex-1 flex flex-col p-6 max-w-[480px] mx-auto w-full">
      {/* Top Header */}
      <header className="flex justify-between items-center pb-4 border-b border-border mb-6">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-brand">
            <ShieldCheck className="w-3.5 h-3.5" weight="duotone" />
            <span>MERCHANT // DASHBOARD</span>
          </div>
          <h1 className="text-lg font-medium text-text mt-0.5">Sharma Canteen</h1>
          <p className="text-xs font-mono text-muted mt-0.5">
            Tier: <span className="text-ok font-medium">GST-VERIFIED</span> (Fast Ramp)
          </p>
        </div>
        <Link
          href="/settings"
          className="text-xs font-mono px-3 py-1.5 rounded-[4px] bg-ink-2 border border-border text-text hover:border-brand transition-colors"
        >
          Settings
        </Link>
      </header>

      {/* Main Action Banner: Self-Audit */}
      <div className="p-5 rounded-[4px] bg-ink-2 border border-brand/40 flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-brand font-medium">
            Daily Verification Loop
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-ok/10 text-ok border border-ok/30">
            Last audit: Today, 9:30 AM
          </span>
        </div>
        <div>
          <h2 className="text-base font-medium text-text">Audit Physical QR Sticker</h2>
          <p className="text-xs text-muted leading-relaxed mt-1">
            Point your camera at your billing counter sticker to verify payload integrity and
            confirm no physical swap or relocation has occurred.
          </p>
        </div>
        <Link
          href="/audit/run"
          className="h-10 px-4 rounded-[4px] bg-brand text-ink font-medium text-sm flex items-center justify-center gap-2 hover:bg-brand-soft transition-colors mt-1"
        >
          <span>Run Self-Audit Now</span>
          <ArrowRight className="w-4 h-4" weight="bold" />
        </Link>
      </div>

      {/* Blockchain Anchor Status Card (Task 6) */}
      <div className="p-5 rounded-[4px] bg-ink-2 border-l-4 border-l-ok border-t border-r border-b border-border flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-ok" weight="duotone" />
            <span className="font-mono text-xs uppercase tracking-wider text-ok font-medium">
              Blockchain Anchor Confirmed
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-ok/10 text-ok border border-ok/30">
            POLYGON AMOY
          </span>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          Your credential hash is anchored to the Polygon Amoy testnet. Any attempt to alter your
          registered VPA or location will produce a hash mismatch on the public block explorer.
        </p>

        <div className="pt-2 border-t border-border/50 flex flex-col gap-2 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted">TRANSACTION</span>
            <span className="text-text truncate max-w-[200px]">
              {txHash.slice(0, 10)}…{txHash.slice(-8)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted">STATUS</span>
            <span className="text-ok font-medium">CONFIRMED (TAMPER-EVIDENT)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3 rounded-[4px] bg-ink border border-border text-text hover:border-brand text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>PolygonScan</span>
            <ArrowSquareOut className="w-3 h-3 text-brand" weight="bold" />
          </a>
          <Link
            href={`/verify/${demoCredentialId}`}
            className="h-8 px-3 rounded-[4px] bg-ink border border-border text-text hover:border-brand text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Public Audit</span>
            <LinkSimple className="w-3 h-3 text-brand" weight="bold" />
          </Link>
        </div>
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href="/credential/qrs"
          className="p-4 rounded-[4px] bg-ink-2 border border-border hover:border-brand/50 transition-colors"
        >
          <div className="flex items-center gap-1.5 mb-1 text-muted text-xs font-mono">
            <QrCode className="w-3.5 h-3.5 text-brand" weight="duotone" />
            <span>ACTIVE QRS</span>
          </div>
          <span className="text-lg font-medium text-text">1 Registered</span>
        </Link>
        <Link
          href="/audit/history"
          className="p-4 rounded-[4px] bg-ink-2 border border-border hover:border-brand/50 transition-colors"
        >
          <div className="flex items-center gap-1.5 mb-1 text-muted text-xs font-mono">
            <ClockCounterClockwise className="w-3.5 h-3.5 text-ok" weight="duotone" />
            <span>CLEAN AUDITS</span>
          </div>
          <span className="text-lg font-medium text-ok">14 Clean Runs</span>
        </Link>
      </div>

      {/* Auxiliary links */}
      <div className="flex flex-col gap-2">
        <Link
          href="/credential/dispute/new"
          className="p-3.5 rounded-[4px] bg-ink-2 border border-border flex justify-between items-center text-xs font-mono text-text hover:border-danger transition-colors"
        >
          <span>Report Sticker Impersonation / Dispute</span>
          <ShieldWarning className="w-4 h-4 text-danger" weight="duotone" />
        </Link>
      </div>
    </main>
  );
}
