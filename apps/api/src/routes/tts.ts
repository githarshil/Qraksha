import { Router, Request, Response, NextFunction } from "express";
import { TtsRequestSchema } from "@qraksha/shared";
import { validateBody } from "../middleware/validate.middleware.js";
import { voiceRateLimiter } from "../middleware/rate-limit.middleware.js";
import { voiceService } from "../services/voice.service.js";

export const ttsRouter = Router();

/**
 * POST /api/tts & POST /api/v1/tts
 * Takes { text, lang, voice }, computes sha256(text + lang + voice),
 * checks Supabase table tts_cache (hash, audio_url, created_at), and returns
 * cached URL on hit.
 * On miss, calls Sarvam with 2s timeout, uploads to voice-clips, inserts row, and returns URL.
 */
ttsRouter.post(
  "/",
  voiceRateLimiter,
  validateBody(TtsRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { text, lang, voice } = req.body;
      const result = await voiceService.getOrSynthesizeTts(text, lang, voice, req.correlationId);

      res.status(200).json({
        data: result,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },
);
