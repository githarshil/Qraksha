import { describe, expect, it } from "vitest";
import {
  NFC_REGISTRY,
  NFC_VOICE_SCRIPTS,
  normalizeLocation,
  NfcVerdict,
} from "../lib/nfc-constants";

describe("NFC Tap-Verification Registry & Logic", () => {
  it("contains seeded 'reg' tag for Sharma Tea Stall in Zone A", () => {
    const regMerchant = NFC_REGISTRY["reg"];
    expect(regMerchant).toBeDefined();
    expect(regMerchant.merchantName).toBe("Sharma Tea Stall");
    expect(regMerchant.category).toBe("Tea & Snacks");
    expect(regMerchant.upiId).toBe("sharmatea@upi");
    expect(regMerchant.registeredLocation).toBe("Zone A");
    expect(regMerchant.verifiedSince).toBe("2026");
  });

  it("handles unreg and unknown tags as not present in registry", () => {
    expect(NFC_REGISTRY["unreg"]).toBeUndefined();
    expect(NFC_REGISTRY["random-tag-id"]).toBeUndefined();
  });

  it("includes additional fictional merchants for realism", () => {
    const keys = Object.keys(NFC_REGISTRY);
    expect(keys.length).toBeGreaterThanOrEqual(4);
    expect(keys).toContain("reg");
    expect(keys).toContain("cafe-monsoon");
    expect(keys).toContain("gupta-sweets");
  });

  describe("Location Normalization", () => {
    it("normalizes hyphenated, lowercase, and spaced zone formats", () => {
      expect(normalizeLocation("zone-a")).toBe("Zone A");
      expect(normalizeLocation("zone_a")).toBe("Zone A");
      expect(normalizeLocation("Zone A")).toBe("Zone A");
      expect(normalizeLocation("a")).toBe("Zone A");

      expect(normalizeLocation("zone-b")).toBe("Zone B");
      expect(normalizeLocation("zone_b")).toBe("Zone B");
      expect(normalizeLocation("Zone B")).toBe("Zone B");

      expect(normalizeLocation("zone-c")).toBe("Zone C");
      expect(normalizeLocation("c")).toBe("Zone C");
    });

    it("defaults to Zone A for empty or invalid location", () => {
      expect(normalizeLocation(undefined)).toBe("Zone A");
      expect(normalizeLocation(null)).toBe("Zone A");
      expect(normalizeLocation("invalid-zone")).toBe("Zone A");
    });
  });

  describe("Verdict Rules", () => {
    function computeVerdict(tagId: string, currentLoc: string): NfcVerdict {
      const merchant = NFC_REGISTRY[tagId];
      if (!merchant) return "UNVERIFIED";
      if (merchant.registeredLocation === currentLoc) return "VERIFIED";
      return "WARNING";
    }

    it("yields UNVERIFIED when tagId is not in registry", () => {
      expect(computeVerdict("unreg", "Zone A")).toBe("UNVERIFIED");
      expect(computeVerdict("unknown123", "Zone A")).toBe("UNVERIFIED");
    });

    it("yields VERIFIED when tagId is registered and location matches registered location", () => {
      expect(computeVerdict("reg", "Zone A")).toBe("VERIFIED");
    });

    it("yields WARNING when tagId is registered but current location does not match registered location", () => {
      expect(computeVerdict("reg", "Zone B")).toBe("WARNING");
      expect(computeVerdict("reg", "Zone C")).toBe("WARNING");
    });
  });

  describe("Voice Scripts & Locales", () => {
    it("has voice scripts for VERIFIED, UNVERIFIED, and WARNING in en, hi, kn", () => {
      const verdicts: NfcVerdict[] = ["VERIFIED", "UNVERIFIED", "WARNING"];
      const langs = ["en", "hi", "kn"] as const;

      for (const v of verdicts) {
        expect(NFC_VOICE_SCRIPTS[v]).toBeDefined();
        for (const l of langs) {
          expect(NFC_VOICE_SCRIPTS[v][l]).toBeTruthy();
          expect(typeof NFC_VOICE_SCRIPTS[v][l]).toBe("string");
        }
      }
    });

    it("matches canonical script text requirements", () => {
      expect(NFC_VOICE_SCRIPTS.VERIFIED.en).toBe(
        "You are about to pay Sharma Tea Stall. This merchant is verified.",
      );
      expect(NFC_VOICE_SCRIPTS.UNVERIFIED.en).toBe(
        "This tag is not registered. Pay only if you trust this shop.",
      );
      expect(NFC_VOICE_SCRIPTS.WARNING.en).toBe(
        "Warning. This tag does not match its registered location. Do not pay.",
      );
    });
  });
});
