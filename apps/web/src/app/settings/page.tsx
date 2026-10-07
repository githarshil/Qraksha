"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Shield,
  LogOut,
  QrCode,
  History,
  ShieldAlert,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { getMyCredentials } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{
    displayName: string;
    contactPhone: string;
    identityTier: "gst_verified" | "baseline";
    credentialId: string;
    trustTier: string;
    trustScore: number;
    status: string;
    qrCount: number;
    activatedAt: string | null;
  }>({
    displayName: "Sharma Canteen",
    contactPhone: "+91 98765 43210",
    identityTier: "gst_verified",
    credentialId: "550e8400-e29b-41d4-a716-446655440000",
    trustTier: "verified",
    trustScore: 96,
    status: "active",
    qrCount: 1,
    activatedAt: "2026-09-15T08:00:00.000Z",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const storedMerchantId = localStorage.getItem("qraksha_merchant_id");
        const storedName = localStorage.getItem("qraksha_merchant_name");
        const storedPhone = localStorage.getItem("qraksha_merchant_phone");
        const storedTier = localStorage.getItem("qraksha_identity_tier");

        const data = await getMyCredentials(storedMerchantId || undefined);
        const active = data?.activeCredential;

        if (active) {
          setProfile((prev) => ({
            ...prev,
            credentialId: active.id,
            trustTier: active.trust_tier || "unverified",
            trustScore: active.trust_score ?? 0,
            status: active.status || "active",
            qrCount: data.qrs?.length || 1,
            activatedAt: active.activated_at,
            displayName: storedName || prev.displayName,
            contactPhone: storedPhone || prev.contactPhone,
            identityTier:
              storedTier === "baseline" || storedTier === "gst_verified"
                ? storedTier
                : prev.identityTier,
          }));
        }
      } catch (_err) {
        // Fallback to default demo profile
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCopyCredentialId = () => {
    navigator.clipboard.writeText(profile.credentialId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSignOut = () => {
    setIsSigningOut(true);
    // Clear merchant local storage credentials
    localStorage.removeItem("qraksha_merchant_id");
    localStorage.removeItem("qraksha_credential_id");
    localStorage.removeItem("qraksha_merchant_name");
    localStorage.removeItem("qraksha_merchant_phone");
    localStorage.removeItem("qraksha_identity_tier");
    localStorage.removeItem("qraksha_token");

    setTimeout(() => {
      router.push("/");
    }, 600);
  };

  return (
    <main className="flex-1 flex flex-col p-6 max-w-[520px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="p-2 rounded-[4px] bg-ink-2 border border-border hover:border-brand transition-colors text-text"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-4 h-4 text-text" />
        </Link>
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-brand">
            <User className="w-3.5 h-3.5" />
            <span>MERCHANT // SETTINGS</span>
          </div>
          <h1 className="text-lg font-medium text-text">Account & Verification</h1>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs font-mono text-muted mb-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
          <span>Syncing verified credentials…</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Merchant Profile Card */}
        <div className="p-5 rounded-[4px] bg-ink-2 border border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
              MERCHANT PROFILE
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-ok/10 text-ok border border-ok/30 uppercase">
              STATUS: {profile.status}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[4px] bg-ink border border-border flex items-center justify-center text-brand font-medium">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-medium text-text">{profile.displayName}</h2>
              <p className="text-xs font-mono text-muted">{profile.contactPhone}</p>
            </div>
          </div>
        </div>

        {/* Verification Tier & Data Privacy Card */}
        <div className="p-5 rounded-[4px] bg-ink-2 border border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand" />
              <span className="text-xs font-medium text-text">Identity Verification Tier</span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-[4px] border ${
                profile.identityTier === "gst_verified"
                  ? "bg-ok/10 text-ok border-ok/30"
                  : "bg-warn/10 text-warn border-warn/30"
              }`}
            >
              {profile.identityTier === "gst_verified"
                ? "GST / UDYAM VERIFIED (TIER 1)"
                : "BASELINE TIER"}
            </span>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            {profile.identityTier === "gst_verified"
              ? "Your credential benefits from accelerated trust ramping. Real GST and address credentials are stored in a partitioned schema under strict Postgres Row-Level Security."
              : "Baseline credential verified via bank account penny-drop name match. Operates under standard ramp intervals."}
          </p>
        </div>

        {/* Active Credential Standing & On-Chain Hash */}
        <div className="p-5 rounded-[4px] bg-ink-2 border border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand" />
              <span className="text-xs font-medium text-text">Active Credential Standing</span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-[4px] border ${
                profile.trustTier === "verified"
                  ? "bg-ok/10 text-ok border-ok/30"
                  : profile.trustTier === "warning"
                    ? "bg-danger/10 text-danger border-danger/30"
                    : "bg-warn/10 text-warn border-warn/30"
              }`}
            >
              {profile.trustTier.toUpperCase()} // SCORE {Math.round(profile.trustScore)}
            </span>
          </div>

          {/* Credential ID row */}
          <div className="p-3 rounded-[4px] bg-ink border border-border flex items-center justify-between text-xs font-mono">
            <div className="truncate mr-2">
              <span className="text-[10px] text-muted block">CREDENTIAL ID</span>
              <span className="text-text select-all">{profile.credentialId}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyCredentialId}
              className="p-1.5 rounded bg-ink-2 border border-border text-muted hover:text-text transition-colors shrink-0"
              title="Copy Credential ID"
            >
              {copiedId ? (
                <Check className="w-3.5 h-3.5 text-ok" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <Link
            href={`/verify/${profile.credentialId}`}
            className="text-xs font-mono text-brand hover:text-brand-soft flex items-center gap-1.5 transition-colors self-start mt-1"
          >
            <span>View Public Blockchain Proof Record</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* Quick Management Links */}
        <div className="flex flex-col gap-2 pt-2">
          <Link
            href="/credential/qrs"
            className="p-3.5 rounded-[4px] bg-ink-2 border border-border hover:border-brand flex items-center justify-between text-xs font-mono text-text transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <QrCode className="w-4 h-4 text-brand" />
              <span>Manage Registered Physical QRs</span>
            </div>
            <span className="text-muted text-[11px]">{profile.qrCount} Active</span>
          </Link>

          <Link
            href="/audit/history"
            className="p-3.5 rounded-[4px] bg-ink-2 border border-border hover:border-brand flex items-center justify-between text-xs font-mono text-text transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4 text-brand" />
              <span>Audit History Log</span>
            </div>
            <span className="text-muted text-[11px]">View Runs</span>
          </Link>

          <Link
            href="/credential/dispute/new"
            className="p-3.5 rounded-[4px] bg-ink-2 border border-border hover:border-danger flex items-center justify-between text-xs font-mono text-text hover:text-danger transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-warn" />
              <span>File Dispute Against Impersonator</span>
            </div>
            <span className="text-muted text-[11px]">Report</span>
          </Link>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="mt-6 h-11 rounded-[4px] border border-danger/40 bg-danger/10 hover:bg-danger/20 text-danger text-xs font-mono font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {isSigningOut ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          <span>Sign Out of Merchant Session</span>
        </button>
      </div>
    </main>
  );
}
