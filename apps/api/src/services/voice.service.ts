import crypto from "crypto";
import {
  formatVoiceScript,
  VoiceLanguageCode,
  VoiceVerdictType,
  VoiceVerdictResponse,
  assertSarvamVoiceDataBoundary,
  TtsResponse,
} from "@qraksha/shared";
import { logger } from "../middleware/logger.middleware.js";
import { supabaseAdmin, isSupabaseConfigured } from "../db/client.js";

export interface VoiceServiceOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  speaker?: string;
  timeoutMs?: number;
}

export class VoiceService {
  private explicitApiKey: string | undefined;
  private explicitBaseUrl: string | undefined;
  private explicitModel: string | undefined;
  private explicitSpeaker: string | undefined;
  private timeoutMs: number;

  // Cache for static no-name phrases (4 verdicts x 3 languages)
  private staticAudioCache = new Map<
    string,
    { audioBase64: string; mimeType: string; textSpoken: string }
  >();

  // Cache for transliterated merchant names: `${cleanName}:${targetLang}` -> transliterated string
  private transliterationCache = new Map<string, string>();

  // Cache for full audio: `${verdict}:${lang}:${merchantName || 'none'}` -> VoiceVerdictResponse
  private dynamicAudioCache = new Map<string, VoiceVerdictResponse>();

  constructor(options: VoiceServiceOptions = {}) {
    this.explicitApiKey = options.apiKey;
    this.explicitBaseUrl = options.baseUrl;
    this.explicitModel = options.model;
    this.explicitSpeaker = options.speaker;
    this.timeoutMs =
      options.timeoutMs ??
      (process.env.SARVAM_TIMEOUT_MS ? parseInt(process.env.SARVAM_TIMEOUT_MS, 10) : 10000);
  }

  get apiKey(): string | undefined {
    return this.explicitApiKey ?? process.env.SARVAM_API_KEY;
  }

  get baseUrl(): string {
    return this.explicitBaseUrl ?? process.env.SARVAM_BASE_URL ?? "https://api.sarvam.ai";
  }

  get model(): string {
    return this.explicitModel ?? process.env.SARVAM_TTS_MODEL ?? "bulbul:v3";
  }

  get speaker(): string {
    return this.explicitSpeaker ?? process.env.SARVAM_SPEAKER ?? "shubh";
  }

  public setApiKey(key: string | undefined): void {
    this.explicitApiKey = key;
  }

  public clearCache(): void {
    this.staticAudioCache.clear();
    this.transliterationCache.clear();
    this.dynamicAudioCache.clear();
  }

  /**
   * Transliterates a Latin script merchant name into the target language's native script
   * (e.g. "Sharma Kirana" -> "शर्मा किराना" for hi-IN or "ಶರ್ಮಾ ಕಿರಾಣಿ" for kn-IN).
   */
  async transliterateMerchantName(
    name: string,
    targetLang: VoiceLanguageCode,
    correlationId?: string,
  ): Promise<string> {
    const cleanName = name.trim();
    if (!cleanName || targetLang === "en-IN") {
      return cleanName;
    }

    // Only transliterate if it contains Latin characters
    if (!/[a-zA-Z]/.test(cleanName)) {
      return cleanName;
    }

    const cacheKey = `${cleanName}:${targetLang}`;
    const cached = this.transliterationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.apiKey) {
      return cleanName;
    }

    try {
      const payload = {
        input: cleanName,
        source_language_code: "en-IN",
        target_language_code: targetLang,
        numerals_format: "international",
        spoken_form: false,
      };

      // Assert privacy boundary: only allowed transliteration params reach Sarvam
      assertSarvamVoiceDataBoundary(payload);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const resp = await fetch(`${this.baseUrl}/transliterate`, {
        method: "POST",
        headers: {
          "api-subscription-key": this.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!resp.ok) {
        logger.warn(`Sarvam transliterate returned HTTP ${resp.status}`, correlationId, {
          status: resp.status,
          text: await resp.text().catch(() => ""),
        });
        return cleanName;
      }

      const data = (await resp.json()) as { transliterated_text?: string };
      const result = data.transliterated_text?.trim() || cleanName;
      this.transliterationCache.set(cacheKey, result);
      return result;
    } catch (err) {
      logger.warn("Transliteration request failed or timed out", correlationId, {
        error: (err as Error).message,
      });
      return cleanName;
    }
  }

  /**
   * Formats the merchant name announcement script (e.g. "You are about to pay Sharma Kirana.")
   */
  formatMerchantNameAnnouncement(displayName: string, lang: VoiceLanguageCode): string {
    const cleanName = displayName.trim();
    if (lang === "hi-IN") {
      return `आप ${cleanName} को भुगतान करने जा रहे हैं।`;
    }
    if (lang === "kn-IN") {
      return `ನೀವು ${cleanName} ಅವರಿಗೆ ಪಾವತಿ ಮಾಡಲಿದ್ದೀರಿ.`;
    }
    return `You are about to pay ${cleanName}.`;
  }

  /**
   * Generates audio for a merchant name announcement clip in the requested Indic language.
   * Transliterates the merchant name to native script for Hindi and Kannada before TTS synthesis.
   * Returns audio buffer (MP3 or WAV), mimeType, and spoken text.
   */
  async generateMerchantNameClip(
    displayName: string,
    lang: VoiceLanguageCode,
    correlationId?: string,
  ): Promise<{ audioBuffer: Buffer; mimeType: string; textSpoken: string }> {
    const cleanName = displayName.trim();
    let transliteratedName = cleanName;
    if (lang !== "en-IN") {
      transliteratedName = await this.transliterateMerchantName(cleanName, lang, correlationId);
    }

    const spokenText = this.formatMerchantNameAnnouncement(transliteratedName || cleanName, lang);

    if (!this.apiKey) {
      const mockWavBase64 = this.createSilentWavBase64();
      return {
        audioBuffer: Buffer.from(mockWavBase64, "base64"),
        mimeType: "audio/wav",
        textSpoken: spokenText,
      };
    }

    const payload = {
      text: spokenText,
      target_language_code: lang,
      speaker: this.speaker,
      model: this.model,
      speech_sample_rate: 24000,
      enable_preprocessing: true,
      output_audio_codec: "mp3",
      merchantDisplayName: cleanName,
    };

    assertSarvamVoiceDataBoundary(payload);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const resp = await fetch(`${this.baseUrl}/text-to-speech`, {
        method: "POST",
        headers: {
          "api-subscription-key": this.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          text: spokenText,
          target_language_code: lang,
          speaker: this.speaker,
          model: this.model,
          speech_sample_rate: 24000,
          enable_preprocessing: true,
          output_audio_codec: "mp3",
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => "");
        throw new Error(`Sarvam TTS error (${resp.status}): ${errorText}`);
      }

      const data = (await resp.json()) as { audios?: string[] };
      const audioBase64 = data.audios?.[0];
      if (!audioBase64) {
        throw new Error("Sarvam TTS returned empty audio payload");
      }

      return {
        audioBuffer: Buffer.from(audioBase64, "base64"),
        mimeType: "audio/mpeg",
        textSpoken: spokenText,
      };
    } catch (err) {
      clearTimeout(timer);
      logger.warn(
        `Failed to synthesize merchant name clip for ${cleanName} in ${lang}`,
        correlationId,
        {
          error: (err as Error).message,
        },
      );
      throw err;
    }
  }

  /**
   * Lazy cache for misses (Step 3).
   * Takes { text, lang, voice }, computes sha256(text + lang + voice),
   * checks Supabase table tts_cache (hash, audio_url, created_at),
   * and returns cached URL on hit.
   * On miss, calls Sarvam with 2-second timeout, uploads audio to Supabase Storage,
   * inserts the row, and returns the public URL.
   */
  async getOrSynthesizeTts(
    text: string,
    lang: string = "en-IN",
    voice?: string,
    correlationId?: string,
  ): Promise<TtsResponse> {
    const cleanText = text.trim();
    const cleanLang = lang.trim() || "en-IN";
    const selectedVoice = (voice || this.speaker || "shubh").trim();

    // 1. Compute sha256(text + lang + voice)
    const hash = crypto
      .createHash("sha256")
      .update(cleanText + cleanLang + selectedVoice)
      .digest("hex");

    // 2. Check Supabase table tts_cache (hash, audio_url, created_at)
    if (isSupabaseConfigured()) {
      try {
        const { data: cached, error: cacheErr } = await supabaseAdmin
          .schema("comparison")
          .from("tts_cache")
          .select("hash, audio_url")
          .eq("hash", hash)
          .maybeSingle();

        if (!cacheErr && cached?.audio_url) {
          return {
            hash,
            audio_url: cached.audio_url,
            url: cached.audio_url,
            cached: true,
          };
        }
      } catch (err) {
        logger.warn("Failed checking Supabase tts_cache", correlationId, {
          error: (err as Error).message,
        });
      }
    }

    // 3. On miss: Call Sarvam once with a strict 2-second timeout
    const payload = {
      text: cleanText,
      target_language_code: cleanLang,
      speaker: selectedVoice,
      model: this.model,
      speech_sample_rate: 24000,
      enable_preprocessing: true,
      output_audio_codec: "mp3",
    };

    assertSarvamVoiceDataBoundary(payload);

    let audioBuffer: Buffer;
    if (!this.apiKey) {
      const mockWavBase64 = this.createSilentWavBase64();
      audioBuffer = Buffer.from(mockWavBase64, "base64");
    } else {
      const controller = new AbortController();
      // Strict 2-second timeout per requirement 3
      const timer = setTimeout(() => controller.abort(), 2000);

      try {
        const resp = await fetch(`${this.baseUrl}/text-to-speech`, {
          method: "POST",
          headers: {
            "api-subscription-key": this.apiKey,
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!resp.ok) {
          const errText = await resp.text().catch(() => "");
          throw new Error(`Sarvam TTS error (${resp.status}): ${errText}`);
        }

        const data = (await resp.json()) as { audios?: string[] };
        const audioBase64 = data.audios?.[0];
        if (!audioBase64) {
          throw new Error("Sarvam TTS returned empty audio payload");
        }

        audioBuffer = Buffer.from(audioBase64, "base64");
      } catch (err) {
        clearTimeout(timer);
        const isAbort = (err as Error).name === "AbortError";
        logger.warn(
          isAbort ? "Sarvam TTS call aborted due to 2s timeout" : "Sarvam TTS call failed",
          correlationId,
          { error: (err as Error).message },
        );
        throw err;
      }
    }

    // 4. Upload audio to Supabase Storage voice-clips bucket
    let audioUrl = "";
    if (isSupabaseConfigured() && supabaseAdmin?.storage) {
      try {
        const objectPath = `cache/${hash}.mp3`;
        const uploadRes = await supabaseAdmin.storage
          .from("voice-clips")
          .upload(objectPath, audioBuffer, {
            contentType: "audio/mpeg",
            upsert: true,
          });

        if (!uploadRes?.error) {
          const urlData = supabaseAdmin.storage.from("voice-clips").getPublicUrl(objectPath);
          audioUrl = urlData?.data?.publicUrl || "";
        }

        if (audioUrl) {
          // 5. Insert row into Supabase table tts_cache (hash, audio_url, created_at)
          await supabaseAdmin.schema("comparison").from("tts_cache").upsert({
            hash,
            audio_url: audioUrl,
            created_at: new Date().toISOString(),
          });
        }
      } catch (storageErr) {
        logger.warn("Failed uploading to voice-clips storage or saving tts_cache", correlationId, {
          error: (storageErr as Error).message,
        });
      }
    }

    if (!audioUrl) {
      audioUrl = `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`;
    }

    return {
      hash,
      audio_url: audioUrl,
      url: audioUrl,
      cached: false,
    };
  }

  /**
   * Synthesizes audio for a verdict, target language, and optional verified merchant name.
   */
  async getVerdictAudio(
    verdict: VoiceVerdictType,
    lang: VoiceLanguageCode,
    merchantDisplayName?: string,
    correlationId?: string,
  ): Promise<VoiceVerdictResponse> {
    const isNamedVerdict =
      (verdict === "VERIFIED" || verdict === "RECENTLY_REGISTERED") &&
      Boolean(merchantDisplayName?.trim());
    const cleanName = isNamedVerdict ? merchantDisplayName!.trim() : undefined;

    // Transliterate merchant name if needed
    let transliteratedName: string | undefined;
    if (cleanName && lang !== "en-IN") {
      transliteratedName = await this.transliterateMerchantName(cleanName, lang, correlationId);
    } else {
      transliteratedName = cleanName;
    }

    const effectiveName = transliteratedName || cleanName;
    const spokenText = formatVoiceScript(verdict, lang, effectiveName);

    // 1. Check dynamic cache
    const cacheKey = `${verdict}:${lang}:${effectiveName || "none"}`;
    const dynamicCached = this.dynamicAudioCache.get(cacheKey);
    if (dynamicCached) {
      return { ...dynamicCached, cached: true };
    }

    // 2. Check static cache if no merchant name was used
    if (!effectiveName) {
      const staticKey = `${verdict}:${lang}`;
      const staticCached = this.staticAudioCache.get(staticKey);
      if (staticCached) {
        return {
          audioBase64: staticCached.audioBase64,
          mimeType: staticCached.mimeType,
          textSpoken: staticCached.textSpoken,
          cached: true,
        };
      }
    }

    // 3. Fallback mock generator when no API key is provided (dev/testing mode)
    if (!this.apiKey) {
      logger.info(
        "No SARVAM_API_KEY configured; generating synthesized mock audio response",
        correlationId,
      );
      // Generate a tiny valid silent 1-second WAV buffer in base64
      const mockWavBase64 = this.createSilentWavBase64();
      const response: VoiceVerdictResponse = {
        audioBase64: mockWavBase64,
        mimeType: "audio/wav",
        textSpoken: spokenText,
        cached: false,
        transliteratedName,
      };

      if (!effectiveName) {
        this.staticAudioCache.set(`${verdict}:${lang}`, {
          audioBase64: mockWavBase64,
          mimeType: "audio/wav",
          textSpoken: spokenText,
        });
      } else {
        this.dynamicAudioCache.set(cacheKey, response);
      }

      return response;
    }

    // 4. Call Sarvam Bulbul TTS API
    const ttsPayload = {
      text: spokenText,
      target_language_code: lang,
      speaker: this.speaker,
      model: this.model,
      speech_sample_rate: 24000,
      enable_preprocessing: true,
      merchantDisplayName: effectiveName, // Whitelisted for privacy assertions
    };

    // Assert privacy boundary: strictly enforces forbidden fields before sending to Sarvam
    assertSarvamVoiceDataBoundary(ttsPayload);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const resp = await fetch(`${this.baseUrl}/text-to-speech`, {
        method: "POST",
        headers: {
          "api-subscription-key": this.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          text: spokenText,
          target_language_code: lang,
          speaker: this.speaker,
          model: this.model,
          speech_sample_rate: 24000,
          enable_preprocessing: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => "");
        logger.error(`Sarvam TTS call failed with HTTP ${resp.status}`, correlationId, {
          status: resp.status,
          errorText,
        });
        throw new Error(`Sarvam TTS error: ${resp.status} ${errorText}`);
      }

      const data = (await resp.json()) as { audios?: string[]; request_id?: string };
      const audioBase64 = data.audios?.[0];

      if (!audioBase64) {
        throw new Error("Sarvam TTS returned empty audio array");
      }

      const response: VoiceVerdictResponse = {
        audioBase64,
        mimeType: "audio/wav",
        textSpoken: spokenText,
        cached: false,
        transliteratedName,
      };

      // Store in caches
      if (!effectiveName) {
        this.staticAudioCache.set(`${verdict}:${lang}`, {
          audioBase64,
          mimeType: "audio/wav",
          textSpoken: spokenText,
        });
      }
      this.dynamicAudioCache.set(cacheKey, response);

      return response;
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = (err as Error).name === "AbortError";
      logger.warn(
        `Sarvam TTS failed ${isTimeout ? "(timeout >2s)" : ""}: ${(err as Error).message}`,
        correlationId,
      );
      throw err;
    }
  }

  /**
   * Pre-generates and caches the 12 static no-name phrases (4 verdicts x 3 languages)
   * so common audit verdicts have near-zero latency.
   */
  async prewarmStaticPhrases(): Promise<void> {
    const verdicts: VoiceVerdictType[] = [
      "VERIFIED",
      "RECENTLY_REGISTERED",
      "UNVERIFIED",
      "WARNING",
    ];
    const languages: VoiceLanguageCode[] = ["en-IN", "hi-IN", "kn-IN"];

    for (const lang of languages) {
      for (const verdict of verdicts) {
        try {
          await this.getVerdictAudio(verdict, lang, undefined, "prewarm-init");
        } catch (_warmErr) {
          // Non-blocking prewarm
        }
      }
    }
  }

  /**
   * Creates a tiny valid 1-second 8kHz silent WAV file as a base64 string
   * used as fallback in development or offline tests.
   */
  private createSilentWavBase64(): string {
    const sampleRate = 8000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const durationSec = 0.5;
    const numSamples = Math.floor(sampleRate * durationSec);
    const dataSize = numSamples * numChannels * (bitsPerSample / 8);
    const headerSize = 44;
    const buffer = Buffer.alloc(headerSize + dataSize);

    // RIFF chunk descriptor
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write("WAVE", 8);

    // fmt sub-chunk
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16); // subchunk1size (16 for PCM)
    buffer.writeUInt16LE(1, 20); // audio format (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // byte rate
    buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // block align
    buffer.writeUInt16LE(bitsPerSample, 34);

    // data sub-chunk
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40);
    // bytes 44.. remain 0 (silent PCM data)

    return buffer.toString("base64");
  }
}

export const voiceService = new VoiceService();
