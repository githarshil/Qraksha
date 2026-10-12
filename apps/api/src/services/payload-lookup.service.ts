import crypto from "crypto";

import { supabaseAdmin, isSupabaseConfigured } from "../db/client.js";

export interface RegisteredQrLookupResult {
  id: string; // registered_qr_id
  credentialId: string;
  qrPayloadHash: string;
  boundLat: number;
  boundLng: number;
  boundRadiusM: number;
  referenceEmbedding?: number[];
  merchantId?: string;
  credentialStatus?: string;
  trustTier?: string;
  trustScore?: number;
}

interface CacheEntry {
  result: RegisteredQrLookupResult | null;
  cachedAt: number;
}

/**
 * PayloadLookupService provides fast QR payload hash lookup
 * with an in-memory read-through cache per ARCHITECTURE.md Section 3 & 5.
 */
export class PayloadLookupService {
  private cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs: number;

  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private db: any = supabaseAdmin,
    ttlMs = 5 * 60 * 1000,
  ) {
    this.cacheTtlMs = ttlMs;
  }

  /**
   * Computes SHA-256 hash of a raw QR payload.
   */
  hashPayload(qrPayload: string): string {
    return crypto.createHash("sha256").update(qrPayload).digest("hex");
  }

  /**
   * Looks up a registered QR record by its raw payload string or precomputed hash.
   * Checks the hot-path in-memory cache first, then falls back to Postgres.
   * Returns null cleanly for unrecognized payloads.
   */
  async lookupByPayload(
    qrPayload: string,
    isAlreadyHashed = false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dbOverride?: any,
  ): Promise<RegisteredQrLookupResult | null> {
    const hash = isAlreadyHashed ? qrPayload : this.hashPayload(qrPayload);

    // 1. Hot-path in-memory cache lookup (<1ms)
    const cached = this.getCached(hash);
    if (cached !== undefined) {
      return cached;
    }

    // 2. Query database for registered_qr record
    let result: RegisteredQrLookupResult | null = null;
    if (isSupabaseConfigured()) {
      try {
        result = await this.queryDatabase(hash, dbOverride);
      } catch (_dbError) {
        // Graceful fallback: unrecognized/unreachable record treated as null
        result = null;
      }
    }

    // 3. Cache result (including null for negative cache with shorter TTL)
    this.setCache(hash, result);
    return result;
  }

  private getCached(hash: string): RegisteredQrLookupResult | null | undefined {
    const entry = this.cache.get(hash);
    if (!entry) return undefined;

    const isExpired = Date.now() - entry.cachedAt > this.cacheTtlMs;
    if (isExpired) {
      this.cache.delete(hash);
      return undefined;
    }

    return entry.result;
  }

  public setCache(hash: string, result: RegisteredQrLookupResult | null): void {
    this.cache.set(hash, {
      result,
      cachedAt: Date.now(),
    });
  }

  private async queryDatabase(
    hash: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dbOverride?: any,
  ): Promise<RegisteredQrLookupResult | null> {
    const dbClient = dbOverride || this.db;
    const { data: qrData, error: qrError } = await dbClient
      .schema("comparison")
      .from("registered_qr")
      .select(
        `
        id,
        credential_id,
        qr_payload_hash,
        bound_lat,
        bound_lng,
        bound_radius_m
      `,
      )
      .eq("qr_payload_hash", hash)
      .maybeSingle();

    if (qrError) {
      throw qrError;
    }

    if (!qrData) {
      return null;
    }

    // Fetch associated credential metadata and embedding
    const [credResult, embResult] = await Promise.all([
      this.db
        .schema("comparison")
        .from("merchant_credential")
        .select("id, merchant_id, status, trust_tier, trust_score")
        .eq("id", qrData.credential_id)
        .maybeSingle(),
      this.db
        .schema("comparison")
        .from("reference_embedding")
        .select("embedding")
        .eq("registered_qr_id", qrData.id)
        .maybeSingle(),
    ]);

    const credential = credResult.data;
    const embeddingData = embResult.data;

    let referenceEmbedding: number[] | undefined;
    if (embeddingData?.embedding) {
      referenceEmbedding =
        typeof embeddingData.embedding === "string"
          ? JSON.parse(embeddingData.embedding)
          : embeddingData.embedding;
    }

    return {
      id: qrData.id,
      credentialId: qrData.credential_id,
      qrPayloadHash: qrData.qr_payload_hash,
      boundLat: qrData.bound_lat,
      boundLng: qrData.bound_lng,
      boundRadiusM: qrData.bound_radius_m,
      referenceEmbedding,
      merchantId: credential?.merchant_id,
      credentialStatus: credential?.status,
      trustTier: credential?.trust_tier,
      trustScore: credential?.trust_score,
    };
  }

  /**
   * Explicitly sets or primes the cache for a given payload hash.
   */
  primeCache(qrPayloadHash: string, result: RegisteredQrLookupResult): void {
    this.setCache(qrPayloadHash, result);
  }

  /**
   * Invalidates one or all cache entries.
   */
  invalidateCache(qrPayloadHash?: string): void {
    if (qrPayloadHash) {
      this.cache.delete(qrPayloadHash);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Returns current cache size for diagnostics.
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

export const payloadLookupService = new PayloadLookupService();
