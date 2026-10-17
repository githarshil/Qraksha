import { z } from "zod";

export const VoiceVerdictInputSchema = z.object({
  verdict: z.enum(["VERIFIED", "RECENTLY_REGISTERED", "UNVERIFIED", "WARNING"] as const),
  lang: z.enum(["en-IN", "hi-IN", "kn-IN"] as const),
  merchantDisplayName: z.string().trim().max(100).optional(),
});

export type VoiceVerdictInput = z.infer<typeof VoiceVerdictInputSchema>;

export interface VoiceVerdictResponse {
  audioBase64: string;
  mimeType: string;
  textSpoken: string;
  cached: boolean;
  transliteratedName?: string;
}

export const TtsRequestSchema = z.object({
  text: z.string().trim().min(1).max(2500),
  lang: z.string().trim().default("en-IN"),
  voice: z.string().trim().optional(),
});

export type TtsRequest = z.infer<typeof TtsRequestSchema>;

export interface TtsResponse {
  audio_url: string;
  url: string;
  cached: boolean;
  hash: string;
}
