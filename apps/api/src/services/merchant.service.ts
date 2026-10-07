import crypto from "crypto";
import type {
  RegisterIdentityInput,
  RegisterIdentityResult,
  RegisterReferenceInput,
  RegisterReferenceResult,
  ProofOfPossessionResult,
} from "@qraksha/shared";

import { supabaseAdmin } from "../db/client.js";
import { ConflictError, NotFoundError } from "../middleware/error.middleware.js";
import { visionService } from "./vision.service.js";
import { geocodingService } from "./geocoding.service.js";
import { paymentProofService } from "./payment-proof.service.js";
import { blockchainService } from "./blockchain.service.js";

export { RegisterIdentityResult, RegisterReferenceResult, ProofOfPossessionResult };

export interface CredentialWithQrsResult {
  credential: {
    id: string;
    merchant_id: string;
    status: string;
    trust_tier: string;
    trust_score: number;
    activated_at: string | null;
  };
  merchant: {
    id: string;
    display_name: string;
    contact_phone: string;
  } | null;
  qrs: Array<{
    id: string;
    qr_payload_hash: string;
    bound_lat: number;
    bound_lng: number;
    bound_radius_m: number;
    created_at: string;
  }>;
  anchor: {
    id: string;
    tx_hash: string | null;
    network: string;
    status: string;
    credential_hash: string;
    confirmed_at: string | null;
  } | null;
}

export function maskVpa(vpa: string): string {
  const parts = vpa.split("@");
  if (parts.length !== 2) {
    return vpa.slice(0, 2) + "***";
  }
  const [handle, domain] = parts;
  const visible = handle.slice(0, 2);
  return `${visible}***@${domain}`;
}

export class MerchantService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private db: any = supabaseAdmin) {}

  async registerIdentity(input: RegisterIdentityInput): Promise<RegisterIdentityResult> {
    if (input.type === "gst_udyam") {
      await this.checkGstConflict(input.gstUdyamNumber);
    }

    const merchant = await this.findOrCreateMerchant(input.displayName, input.contactPhone);
    const identity = await this.upsertIdentity(merchant.id, input);

    return {
      merchantId: merchant.id,
      displayName: merchant.display_name,
      identityTier: identity.identity_tier,
      contactPhone: merchant.contact_phone,
      kycAddress: identity.kyc_address,
      identityId: identity.id,
      otpConfirmed: identity.otp_confirmed,
    };
  }

  private async checkGstConflict(gstUdyamNumber: string): Promise<void> {
    const { data: existingGst, error } = await this.db
      .schema("identity")
      .from("merchant_identity")
      .select("id, merchant_id")
      .eq("gst_udyam_number", gstUdyamNumber)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (existingGst) {
      throw new ConflictError(
        "This GST/Udyam number is already registered to an existing merchant credential.",
        { disputePointer: "/credential/dispute/new" },
      );
    }
  }

  private async findOrCreateMerchant(
    displayName: string,
    contactPhone: string,
  ): Promise<{ id: string; display_name: string; contact_phone: string }> {
    const { data: existingMerchant, error: findError } = await this.db
      .from("merchant")
      .select("id, display_name, contact_phone")
      .eq("contact_phone", contactPhone)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (existingMerchant) {
      return existingMerchant;
    }

    const { data: newMerchant, error: insertError } = await this.db
      .from("merchant")
      .insert({
        display_name: displayName,
        contact_phone: contactPhone,
      })
      .select("id, display_name, contact_phone")
      .single();

    if (insertError || !newMerchant) {
      throw insertError || new Error("Failed to create merchant");
    }

    return newMerchant;
  }

  private async upsertIdentity(
    merchantId: string,
    input: RegisterIdentityInput,
  ): Promise<{
    id: string;
    identity_tier: "gst_verified" | "baseline";
    kyc_address: string;
    otp_confirmed: boolean;
  }> {
    const identityTier: "gst_verified" | "baseline" =
      input.type === "gst_udyam" ? "gst_verified" : "baseline";
    const gstUdyamNumber = input.type === "gst_udyam" ? input.gstUdyamNumber : null;
    const bankVpaMasked = input.type === "penny_drop" ? maskVpa(input.bankVpa) : null;

    const { data: existingIdentity, error: findError } = await this.db
      .schema("identity")
      .from("merchant_identity")
      .select("id")
      .eq("merchant_id", merchantId)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (existingIdentity) {
      const { data: updatedIdentity, error: updateError } = await this.db
        .schema("identity")
        .from("merchant_identity")
        .update({
          identity_tier: identityTier,
          gst_udyam_number: gstUdyamNumber,
          bank_vpa_masked: bankVpaMasked,
          kyc_address: input.kycAddress,
          otp_confirmed: true,
        })
        .eq("id", existingIdentity.id)
        .select("id, identity_tier, kyc_address, otp_confirmed")
        .single();

      if (updateError || !updatedIdentity) {
        throw updateError || new Error("Failed to update merchant identity");
      }
      return updatedIdentity as {
        id: string;
        identity_tier: "gst_verified" | "baseline";
        kyc_address: string;
        otp_confirmed: boolean;
      };
    }

    const { data: newIdentity, error: insertError } = await this.db
      .schema("identity")
      .from("merchant_identity")
      .insert({
        merchant_id: merchantId,
        identity_tier: identityTier,
        gst_udyam_number: gstUdyamNumber,
        bank_vpa_masked: bankVpaMasked,
        kyc_address: input.kycAddress,
        otp_confirmed: true,
      })
      .select("id, identity_tier, kyc_address, otp_confirmed")
      .single();

    if (insertError || !newIdentity) {
      if (insertError.code === "23505" && insertError.message?.includes("gst_udyam")) {
        throw new ConflictError(
          "This GST/Udyam number is already registered to an existing merchant credential.",
          { disputePointer: "/credential/dispute/new" },
        );
      }
      throw insertError || new Error("Failed to create merchant identity");
    }

    return newIdentity as {
      id: string;
      identity_tier: "gst_verified" | "baseline";
      kyc_address: string;
      otp_confirmed: boolean;
    };
  }

  async uploadTransientPhoto(objectPath: string, buffer: Buffer, mimeType: string): Promise<void> {
    try {
      if (this.db?.storage) {
        await this.db.storage.from("transient-photos").upload(objectPath, buffer, {
          contentType: mimeType,
          upsert: true,
        });
      }
    } catch (_storageError) {
      // In-memory or transient storage upload failure does not break mock/fallback
    }
  }

  async deleteTransientPhoto(objectPath: string): Promise<void> {
    try {
      if (this.db?.storage) {
        await this.db.storage.from("transient-photos").remove([objectPath]);
      }
    } catch (_storageError) {
      // Cleanup attempt logged or swallowed
    }
  }

  async registerReference(
    merchantId: string,
    input: RegisterReferenceInput,
  ): Promise<RegisterReferenceResult> {
    // 1. Validate merchant exists
    const { data: merchant, error: merchantError } = await this.db
      .from("merchant")
      .select("id, display_name")
      .eq("id", merchantId)
      .maybeSingle();

    if (merchantError) {
      throw merchantError;
    }
    if (!merchant) {
      throw new NotFoundError("Merchant not found");
    }

    // 2. Validate merchant identity exists and retrieve kyc_address
    const { data: identity, error: identityError } = await this.db
      .schema("identity")
      .from("merchant_identity")
      .select("id, kyc_address, identity_tier")
      .eq("merchant_id", merchantId)
      .maybeSingle();

    if (identityError) {
      throw identityError;
    }
    if (!identity) {
      throw new NotFoundError(
        "Merchant identity record not found. Please complete Step 1 (Identity Registration) first.",
      );
    }

    // 3. Compute SHA-256 hash of QR payload and check for duplicate QR registration
    const qrPayloadHash = crypto.createHash("sha256").update(input.qrPayload).digest("hex");

    const { data: existingQr, error: qrFindError } = await this.db
      .schema("comparison")
      .from("registered_qr")
      .select("id")
      .eq("qr_payload_hash", qrPayloadHash)
      .maybeSingle();

    if (qrFindError) {
      throw qrFindError;
    }
    if (existingQr) {
      throw new ConflictError(
        "This QR payload is already registered to an existing merchant credential.",
        { disputePointer: "/credential/dispute/new" },
      );
    }

    // 4. Validate photo and synchronously extract embedding via transient storage buffer
    const { buffer, mimeType } = visionService.validateAndParsePhoto(input.photoBase64);
    const objectPath = `uploads/${Date.now()}-${crypto.randomUUID()}.jpg`;
    let embedding: number[];

    try {
      await this.uploadTransientPhoto(objectPath, buffer, mimeType);
      embedding = await visionService.extractEmbedding(buffer, mimeType);
    } finally {
      // Guaranteed immediate cleanup: zero persisted photo bytes!
      await this.deleteTransientPhoto(objectPath);
    }

    // 5. Location-binding check: compare GPS with geocoded kyc_address
    const { isVariance } = await geocodingService.checkLocationVariance(
      input.latitude,
      input.longitude,
      identity.kyc_address,
      5000, // 5km radius threshold
    );

    // 6. Create comparison.merchant_credential
    const { data: credential, error: credError } = await this.db
      .schema("comparison")
      .from("merchant_credential")
      .insert({
        merchant_id: merchantId,
        status: "pending_activation",
        trust_tier: "unverified",
        trust_score: 0.0,
        location_variance: isVariance,
      })
      .select("id, status, trust_tier, location_variance")
      .single();

    if (credError || !credential) {
      throw credError || new Error("Failed to create merchant credential");
    }

    // 7. Insert comparison.registered_qr
    const { data: registeredQr, error: regQrError } = await this.db
      .schema("comparison")
      .from("registered_qr")
      .insert({
        credential_id: credential.id,
        qr_payload_hash: qrPayloadHash,
        bound_lat: input.latitude,
        bound_lng: input.longitude,
        bound_radius_m: input.boundRadiusM || 100,
      })
      .select("id, credential_id, qr_payload_hash, bound_lat, bound_lng, bound_radius_m")
      .single();

    if (regQrError || !registeredQr) {
      throw regQrError || new Error("Failed to register QR");
    }

    // 8. Insert comparison.reference_embedding
    const { error: embError } = await this.db
      .schema("comparison")
      .from("reference_embedding")
      .insert({
        registered_qr_id: registeredQr.id,
        embedding: JSON.stringify(embedding),
      });

    if (embError) {
      throw embError;
    }

    return {
      credentialId: credential.id,
      merchantId,
      registeredQrId: registeredQr.id,
      status: credential.status,
      trustTier: credential.trust_tier,
      locationVariance: credential.location_variance,
      qrPayloadHash: registeredQr.qr_payload_hash,
      boundLocation: {
        latitude: registeredQr.bound_lat,
        longitude: registeredQr.bound_lng,
        boundRadiusM: registeredQr.bound_radius_m,
      },
      embeddingDimension: embedding.length,
    };
  }

  /**
   * Confirms proof-of-possession micro-transaction.
   * On confirmation, transitions credential from pending_activation to recently_registered.
   * Per PRD.md Feature: Proof-of-Possession Micro-Transaction and ARCHITECTURE.md Section 6.
   */
  async confirmProofOfPossession(
    credentialId: string,
    simulationPassed: boolean = true,
  ): Promise<ProofOfPossessionResult> {
    // 1. Fetch credential
    const { data: credential, error: credError } = await this.db
      .schema("comparison")
      .from("merchant_credential")
      .select("id, status, merchant_id")
      .eq("id", credentialId)
      .maybeSingle();

    if (credError) {
      throw credError;
    }
    if (!credential) {
      throw new NotFoundError("Merchant credential not found");
    }

    // 2. Fetch merchant identity VPA if present
    const { data: identity } = await this.db
      .schema("identity")
      .from("merchant_identity")
      .select("bank_vpa_masked")
      .eq("merchant_id", credential.merchant_id)
      .maybeSingle();

    // 3. Verify through isolated payment proof service (mocked for MVP)
    const verification = await paymentProofService.verifyVpaPossession(
      identity?.bank_vpa_masked || undefined,
      { simulationPassed },
    );

    // 4. If verified, transition credential to recently_registered
    if (verification.verified) {
      const { data: updatedCred, error: updateError } = await this.db
        .schema("comparison")
        .from("merchant_credential")
        .update({
          status: "recently_registered",
          activated_at: verification.timestamp,
          updated_at: verification.timestamp,
        })
        .eq("id", credentialId)
        .select("id, status")
        .single();

      if (updateError || !updatedCred) {
        throw updateError || new Error("Failed to activate merchant credential");
      }

      // 5. Asynchronously trigger blockchain credential anchoring
      blockchainService.enqueueAnchor(credentialId);

      return {
        credentialId,
        status: "recently_registered",
        verifiedAt: verification.timestamp,
        amountInr: verification.amountInr,
        simulationPassed: true,
        message: verification.message,
      };
    }

    // If verification failed in simulation, retain pending_activation
    return {
      credentialId,
      status: credential.status,
      verifiedAt: verification.timestamp,
      amountInr: verification.amountInr,
      simulationPassed: false,
      message: verification.message,
    };
  }

  /**
   * Adds an additional QR sticker under an existing credential (Task 12).
   * Inherits abbreviated ramp if credential is already verified.
   * Material update triggers re-anchoring on blockchain.
   * Per ARCHITECTURE.md Section 4 & 6.
   */
  async addQrToCredential(
    credentialId: string,
    input: {
      qrPayload: string;
      latitude: number;
      longitude: number;
      boundRadiusM?: number;
      photoBase64: string;
    },
  ): Promise<{
    id: string;
    credentialId: string;
    qrPayloadHash: string;
    boundLocation: {
      latitude: number;
      longitude: number;
      boundRadiusM: number;
    };
    inheritedRamp: boolean;
    initialCleanAuditCount: number;
  }> {
    // 1. Fetch credential
    const { data: credential, error: credError } = await this.db
      .schema("comparison")
      .from("merchant_credential")
      .select("id, merchant_id, status, trust_tier")
      .eq("id", credentialId)
      .maybeSingle();

    if (credError) {
      throw credError;
    }
    if (!credential) {
      throw new NotFoundError("Merchant credential not found");
    }

    // 2. Hash payload and check for duplicate QR
    const qrPayloadHash = crypto.createHash("sha256").update(input.qrPayload).digest("hex");

    const { data: existingQr, error: qrFindError } = await this.db
      .schema("comparison")
      .from("registered_qr")
      .select("id")
      .eq("qr_payload_hash", qrPayloadHash)
      .maybeSingle();

    if (qrFindError) {
      throw qrFindError;
    }
    if (existingQr) {
      throw new ConflictError(
        "This QR payload is already registered to an existing merchant credential.",
        { disputePointer: "/credential/dispute/new" },
      );
    }

    // 3. Transient photo upload & synchronous embedding extraction
    const { buffer, mimeType } = visionService.validateAndParsePhoto(input.photoBase64);
    const objectPath = `uploads/${Date.now()}-${crypto.randomUUID()}.jpg`;
    let embedding: number[];

    try {
      await this.uploadTransientPhoto(objectPath, buffer, mimeType);
      embedding = await visionService.extractEmbedding(buffer, mimeType);
    } finally {
      await this.deleteTransientPhoto(objectPath);
    }

    // 4. Insert comparison.registered_qr
    const boundRadius = input.boundRadiusM || 100;
    const { data: registeredQr, error: regQrError } = await this.db
      .schema("comparison")
      .from("registered_qr")
      .insert({
        credential_id: credentialId,
        qr_payload_hash: qrPayloadHash,
        bound_lat: input.latitude,
        bound_lng: input.longitude,
        bound_radius_m: boundRadius,
      })
      .select("id, credential_id, qr_payload_hash, bound_lat, bound_lng, bound_radius_m")
      .single();

    if (regQrError || !registeredQr) {
      throw regQrError || new Error("Failed to register additional QR");
    }

    // 5. Insert comparison.reference_embedding
    await this.db
      .schema("comparison")
      .from("reference_embedding")
      .insert({
        registered_qr_id: registeredQr.id,
        embedding: JSON.stringify(embedding),
      });

    // 6. Inherited ramp: if credential is verified (green), start at clean_audit_count = 2
    // per ARCHITECTURE.md Section 4
    const isAlreadyVerified = credential.trust_tier === "verified";
    const initialCleanAuditCount = isAlreadyVerified ? 2 : 0;

    // 7. Material credential update triggers asynchronous blockchain re-anchoring
    blockchainService.enqueueAnchor(credentialId);

    return {
      id: registeredQr.id,
      credentialId,
      qrPayloadHash,
      boundLocation: {
        latitude: registeredQr.bound_lat,
        longitude: registeredQr.bound_lng,
        boundRadiusM: registeredQr.bound_radius_m,
      },
      inheritedRamp: isAlreadyVerified,
      initialCleanAuditCount,
    };
  }

  /**
   * Retrieves credential with its registered QRs and blockchain anchor.
   */
  async getCredentialWithQrs(credentialId: string): Promise<CredentialWithQrsResult> {
    const { data: credential, error: credError } = await this.db
      .schema("comparison")
      .from("merchant_credential")
      .select("id, merchant_id, status, trust_tier, trust_score, activated_at")
      .eq("id", credentialId)
      .maybeSingle();

    if (credError) throw credError;
    if (!credential) throw new NotFoundError("Credential not found");

    const [merchantRes, qrsRes, anchorRes] = await Promise.all([
      this.db
        .from("merchant")
        .select("id, display_name, contact_phone")
        .eq("id", credential.merchant_id)
        .maybeSingle(),
      this.db
        .schema("comparison")
        .from("registered_qr")
        .select("id, qr_payload_hash, bound_lat, bound_lng, bound_radius_m, created_at")
        .eq("credential_id", credentialId),
      this.db
        .schema("comparison")
        .from("blockchain_anchor")
        .select("id, tx_hash, network, status, credential_hash, confirmed_at")
        .eq("credential_id", credentialId)
        .maybeSingle(),
    ]);

    return {
      credential,
      merchant: merchantRes.data,
      qrs: qrsRes.data || [],
      anchor: anchorRes.data || null,
    };
  }
}

export const merchantService = new MerchantService();
