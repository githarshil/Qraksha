import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { IconProvider } from "@/components/icon-provider";

// Satoshi (Fontshare, ITF Free Font License) is self-hosted as a single variable woff2 so the
// 400/500/600/700 weights all resolve without extra requests.
const satoshi = localFont({
  src: "./fonts/Satoshi-Variable.woff2",
  weight: "300 900",
  style: "normal",
  display: "swap",
  variable: "--font-satoshi",
});

// Geist Mono is reserved for small technical labels only (tags, FIG. markers, agent/verdict chips).
const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "QRaksha — UPI QR Physical Sticker Verification",
  description:
    "Merchant self-audit tool detecting swapped, cloned, or relocated UPI QR stickers with AI verification & public blockchain anchoring.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "QRaksha — Physical UPI QR Tamper Defense",
    description:
      "Detect when a physical UPI QR sticker has been swapped, cloned, or relocated using AI and public blockchain anchoring.",
    type: "website",
    siteName: "QRaksha",
  },
  twitter: {
    card: "summary_large_image",
    title: "QRaksha — Physical UPI QR Tamper Defense",
    description:
      "Detect when a physical UPI QR sticker has been swapped, cloned, or relocated using AI and public blockchain anchoring.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#FF4B1F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${satoshi.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-ink text-text font-sans flex flex-col items-center w-full">
        <IconProvider>
          <div className="w-full min-h-screen flex flex-col bg-ink relative">
            {children}
            <BottomNav />
          </div>
        </IconProvider>
      </body>
    </html>
  );
}
