import { describe, it, expect } from "vitest";
import { checkWalletBalance } from "../scripts/verify-wallet-balance.js";

describe("Phase 7 — Blockchain Anchoring Wallet Balance Verification", () => {
  it("computes wallet report with gas estimation and anchoring capacity", async () => {
    const report = await checkWalletBalance({
      customAddress: "0x8a92842C2366113bE11A89b6574f075d52E46244",
      targetTxCount: 50,
    });

    expect(report.walletAddress.toLowerCase()).toBe(
      "0x8a92842C2366113bE11A89b6574f075d52E46244".toLowerCase(),
    );
    expect(report.network).toBeDefined();
    expect(report.balancePol).toBeDefined();
    expect(report.gasPriceGwei).toBeDefined();
    expect(report.costPerTxPol).toBeDefined();
    expect(report.maxTransactions).toBeGreaterThanOrEqual(0);
    expect(typeof report.isSufficientForDemo).toBe("boolean");
    expect(report.recommendation).toBeDefined();
  });

  it("calculates sufficient capacity when target transaction count is met", async () => {
    const report = await checkWalletBalance({
      customAddress: "0x8a92842C2366113bE11A89b6574f075d52E46244",
      targetTxCount: 10,
    });

    expect(report.maxTransactions).toBeGreaterThan(0);
    expect(report.isSufficientForDemo).toBe(true);
  });
});
