import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";

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
    <html lang="en">
      <body className="min-h-screen bg-ink text-text flex flex-col items-center w-full">
        <div className="w-full min-h-screen flex flex-col bg-ink relative">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
