import Link from "next/link";
import { ShieldCheck, QrCode, ShieldAlert, ArrowRight, Lock } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col p-6 max-w-[480px] mx-auto w-full">
      {/* Brand Header */}
      <header className="flex items-center justify-between py-4 border-b border-border">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-[4px] bg-brand flex items-center justify-center text-ink font-mono font-bold text-base">
            Q
          </div>
          <div>
            <h1 className="text-base font-medium tracking-tight text-text leading-none">QRaksha</h1>
            <p className="text-[11px] font-mono text-muted mt-0.5">
              UPI QR Physical Tamper Defense
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[4px] bg-brand/10 text-brand border border-brand/30">
          PILOT MVP
        </span>
      </header>

      {/* Hero section */}
      <section className="my-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[11px] font-mono uppercase bg-ok/10 text-ok border border-ok/30 mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>NPCI verifies accounts. We verify physical stickers.</span>
        </div>
        <h2 className="text-xl font-medium tracking-tight text-text leading-snug mb-2">
          Verify today’s UPI sticker is the one you placed yesterday.
        </h2>
        <p className="text-xs text-muted leading-relaxed">
          Prevent sticker-swap and QR relocation theft. Run an AI self-audit in seconds, backed by a
          tamper-evident public blockchain anchor on Polygon Amoy.
        </p>
      </section>

      {/* Primary Action Buttons */}
      <div className="flex flex-col gap-2.5 my-2">
        <Link
          href="/audit/run"
          className="h-10 px-4 rounded-[4px] bg-brand text-ink font-medium text-sm flex items-center justify-center gap-2 hover:bg-brand-soft transition-colors"
        >
          <QrCode className="w-4 h-4" />
          <span>Run Merchant Self-Audit</span>
        </Link>
        <Link
          href="/register"
          className="h-10 px-4 rounded-[4px] bg-ink-2 border border-border text-text font-medium text-sm flex items-center justify-center gap-2 hover:border-brand/50 transition-colors"
        >
          <span>Register New Merchant Credential</span>
          <ArrowRight className="w-4 h-4 text-muted" />
        </Link>
        <Link
          href="/dashboard"
          className="h-9 px-4 rounded-[4px] bg-transparent border border-border/80 text-muted hover:text-text text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>Open Merchant Dashboard</span>
        </Link>
        <Link
          href="/check"
          className="text-center text-xs font-mono text-muted hover:text-brand transition-colors pt-1"
        >
          Customer check: Scan any merchant QR before paying →
        </Link>
      </div>

      {/* Value pillars */}
      <section className="mt-6 pt-6 border-t border-border flex flex-col gap-3 font-mono">
        <div className="p-4 rounded-[4px] bg-ink-2 border border-border flex gap-3 items-start">
          <div className="p-1.5 rounded-[4px] bg-ink border border-border text-brand shrink-0">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-medium text-text uppercase tracking-wider">
              Detect QR Swaps
            </h3>
            <p className="text-[11px] text-muted font-sans mt-0.5 leading-relaxed">
              Identifies counterfeit replacement stickers pasting unauthorized VPAs over genuine
              merchant counter boards.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-[4px] bg-ink-2 border border-border flex gap-3 items-start">
          <div className="p-1.5 rounded-[4px] bg-ink border border-border text-warn shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-medium text-text uppercase tracking-wider">
              Flag QR Relocation
            </h3>
            <p className="text-[11px] text-muted font-sans mt-0.5 leading-relaxed">
              Binds QR stickers to shop GPS coordinates. If a genuine sticker is moved outside its
              shop radius, it flags a 🔴 WARNING verdict.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-[4px] bg-ink-2 border border-border flex gap-3 items-start">
          <div className="p-1.5 rounded-[4px] bg-ink border border-border text-ok shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-medium text-text uppercase tracking-wider">
              Public Testnet Anchor
            </h3>
            <p className="text-[11px] text-muted font-sans mt-0.5 leading-relaxed">
              Every credential hash is published on Polygon Amoy. Tamper-evidence does not rely on
              trusting our database alone.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto pt-8 pb-4 text-center text-[11px] font-mono text-muted">
        QRaksha &bull; Tamper-Evident UPI QR Self-Audit
      </footer>
    </main>
  );
}
