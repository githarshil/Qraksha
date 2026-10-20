/**
 * NFC Tap-Verification Constants & Registry
 * Per project specifications:
 * - Dynamic route /t/:tagId
 * - Seeded tags: "reg" -> Sharma Tea Stall (Zone A), "unreg" -> Unregistered
 * - Voice scripts for verified, unverified, warning in en, hi, kn
 */

export type NfcVerdict = "VERIFIED" | "UNVERIFIED" | "WARNING";

export type NfcLanguage = "en" | "hi" | "kn";

export interface NfcMerchant {
  merchantName: string;
  category: string;
  upiId: string;
  registeredLocation: string;
  verifiedSince: string;
}

export const DEMO_ZONES = ["Zone A", "Zone B", "Zone C"] as const;
export type DemoZone = (typeof DEMO_ZONES)[number];

export const DEFAULT_DEMO_ZONE: DemoZone = "Zone A";

/**
 * Fictional merchant registry for NFC tap verification.
 * Only "reg" and "unreg" are tap targets for the demo flow.
 */
export const NFC_REGISTRY: Record<string, NfcMerchant> = {
  reg: {
    merchantName: "Sharma Tea Stall",
    category: "Tea & Snacks",
    upiId: "sharmatea@upi",
    registeredLocation: "Zone A",
    verifiedSince: "2026",
  },
  "cafe-monsoon": {
    merchantName: "Monsoon Coffee Roasters",
    category: "Specialty Coffee & Bakes",
    upiId: "monsoon@hdfcbank",
    registeredLocation: "Zone B",
    verifiedSince: "2025",
  },
  "gupta-sweets": {
    merchantName: "Gupta Sweets & Chaat",
    category: "Indian Sweets & Savories",
    upiId: "guptasweets@icici",
    registeredLocation: "Zone C",
    verifiedSince: "2024",
  },
  "raj-provisions": {
    merchantName: "Raj Provisions & Grocery",
    category: "Daily Essentials",
    upiId: "rajprovisions@sbi",
    registeredLocation: "Zone A",
    verifiedSince: "2025",
  },
};

/**
 * Canonical Voice Scripts
 * Used by pre-recorded audio (/audio/{verdict}_{lang}.mp3),
 * fallback browser window.speechSynthesis, and /public/audio/README.txt.
 */
export const NFC_VOICE_SCRIPTS: Record<NfcVerdict, Record<NfcLanguage, string>> = {
  VERIFIED: {
    en: "You are about to pay Sharma Tea Stall. This merchant is verified.",
    hi: "आप शर्मा टी स्टॉल को भुगतान करने वाले हैं। यह व्यापारी सत्यापित है।",
    kn: "ನೀವು ಶರ್ಮಾ ಟೀ ಸ್ಟಾಲ್‌ಗೆ ಹಣ ಪಾವತಿಸಲಿದ್ದೀರಿ. ಈ ವ್ಯಾಪಾರಿ ಪರಿಶೀಲಿಸಲ್ಪಟ್ಟಿದ್ದಾರೆ.",
  },
  UNVERIFIED: {
    en: "This tag is not registered. Pay only if you trust this shop.",
    hi: "यह टैग पंजीकृत नहीं है। केवल तभी भुगतान करें जब आप इस दुकान पर भरोसा करते हों।",
    kn: "ಈ ಟ್ಯಾಗ್ ನೋಂದಾಯಿಸಲಾಗಿಲ್ಲ. ನೀವು ಈ ಅಂಗಡಿಯನ್ನು ನಂಬಿದರೆ ಮಾತ್ರ ಪಾವತಿಸಿ.",
  },
  WARNING: {
    en: "Warning. This tag does not match its registered location. Do not pay.",
    hi: "चेतावनी। यह टैग इसके पंजीकृत स्थान से मेल नहीं खाता है। भुगतान न करें।",
    kn: "ಎಚ್ಚರಿಕೆ. ಈ ಟ್ಯಾಗ್ ಅದರ ನೋಂದಾಯಿತ ಸ್ಥಳಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ. ಪಾವತಿಸಬೇಡಿ.",
  },
};

export const NFC_LANGUAGES: {
  id: NfcLanguage;
  label: string;
  nativeName: string;
  speechLocale: string;
}[] = [
  { id: "en", label: "EN", nativeName: "English", speechLocale: "en-IN" },
  { id: "hi", label: "हि", nativeName: "हिन्दी", speechLocale: "hi-IN" },
  { id: "kn", label: "ಕ", nativeName: "ಕನ್ನಡ", speechLocale: "kn-IN" },
];

/**
 * Normalizes query string or stored string into a valid DemoZone.
 * Handles "zone-a", "zone_a", "Zone A", "zone a", etc.
 */
export function normalizeLocation(locStr?: string | null): DemoZone {
  if (!locStr) return DEFAULT_DEMO_ZONE;
  const clean = locStr.toLowerCase().replace(/[-_]/g, " ").trim();
  if (clean === "zone a" || clean === "a") return "Zone A";
  if (clean === "zone b" || clean === "b") return "Zone B";
  if (clean === "zone c" || clean === "c") return "Zone C";
  return DEFAULT_DEMO_ZONE;
}
