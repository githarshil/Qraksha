import { Suspense } from "react";
import type { Metadata } from "next";
import { NfcTapVerificationView } from "@/components/nfc-tap-verification-view";

export const metadata: Metadata = {
  title: "NFC Tap Verification — QRaksha",
  description:
    "Physical NFC sticker tamper-evident verification with cryptographic binding and zone proximity proof.",
};

export function generateStaticParams() {
  return [{ tagId: "reg" }, { tagId: "unreg" }];
}

export const dynamicParams = true;

interface PageProps {
  params: Promise<{ tagId: string }>;
  searchParams: Promise<{ loc?: string }>;
}

export default async function NfcTagPage({ params, searchParams }: PageProps) {
  const { tagId } = await params;
  const { loc } = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-6 text-center font-mono text-xs text-[var(--text-secondary)]">
          Loading NFC Verification...
        </div>
      }
    >
      <NfcTapVerificationView tagId={tagId} initialLoc={loc} />
    </Suspense>
  );
}
