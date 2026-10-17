#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * scripts/generate-verdict-audio.js
 *
 * One-time idempotent script to pre-generate static audio clips for all
 * 4 verdicts x 3 languages (en, hi, kn) via Sarvam Bulbul:v3 TTS.
 *
 * Saves MP3 files directly to apps/web/public/audio/verdicts/{verdict}_{lang}.mp3
 * Skip existing files unless --force is specified.
 */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from potential locations
const envPaths = [
  path.resolve(__dirname, "../apps/api/.env"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../.env.local"),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

const {
  VERDICT_PHRASES,
  VERDICTS,
  LANGUAGES,
  LANGUAGE_CODE_MAP,
} = require("../lib/verdictPhrases.js");

const force = process.argv.includes("--force");

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const SARVAM_BASE_URL = process.env.SARVAM_BASE_URL || "https://api.sarvam.ai";
const SARVAM_MODEL = process.env.SARVAM_TTS_MODEL || "bulbul:v3";
const SARVAM_SPEAKER = process.env.SARVAM_SPEAKER || "shubh";

if (!SARVAM_API_KEY) {
  console.error("[generate-verdict-audio] ERROR: SARVAM_API_KEY environment variable is missing.");
  process.exit(1);
}

// Target output directories
const outputDirs = [
  path.resolve(__dirname, "../apps/web/public/audio/verdicts"),
  path.resolve(__dirname, "../public/audio/verdicts"),
];

// Ensure output directories exist
for (const dir of outputDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function synthesizeText(text, targetLangCode) {
  const resp = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
    method: "POST",
    headers: {
      "api-subscription-key": SARVAM_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text,
      target_language_code: targetLangCode,
      speaker: SARVAM_SPEAKER,
      model: SARVAM_MODEL,
      speech_sample_rate: 24000,
      output_audio_codec: "mp3",
      enable_preprocessing: true,
    }),
  });

  if (!resp.ok) {
    const errorBody = await resp.text().catch(() => "");
    throw new Error(`Sarvam TTS error (${resp.status}): ${errorBody}`);
  }

  const data = await resp.json();
  const audioBase64 = data.audios?.[0];
  if (!audioBase64) {
    throw new Error("Sarvam TTS returned empty audio payload");
  }

  return Buffer.from(audioBase64, "base64");
}

async function run() {
  console.log(
    `[generate-verdict-audio] Starting static verdict audio generation (force=${force})...`,
  );
  console.log(`[generate-verdict-audio] Model: ${SARVAM_MODEL}, Speaker: ${SARVAM_SPEAKER}`);

  let generatedCount = 0;
  let skippedCount = 0;

  for (const verdict of VERDICTS) {
    for (const lang of LANGUAGES) {
      const phrase = VERDICT_PHRASES[verdict]?.[lang];
      if (!phrase) {
        console.warn(`[generate-verdict-audio] Missing phrase for ${verdict} in ${lang}`);
        continue;
      }

      const verdictSlug = verdict.toLowerCase();
      const fullLangCode = LANGUAGE_CODE_MAP[lang];

      // Primary file: {verdict}_{lang}.mp3 (e.g. verified_en.mp3)
      const primaryFileName = `${verdictSlug}_${lang}.mp3`;
      // Alias file: {verdict}_{fullLangCode}.mp3 (e.g. verified_en-IN.mp3)
      const aliasFileName = `${verdictSlug}_${fullLangCode}.mp3`;

      const primaryDestPath = path.join(outputDirs[0], primaryFileName);

      if (fs.existsSync(primaryDestPath) && !force) {
        console.log(`⏭️  Skipping existing: ${primaryFileName}`);
        skippedCount++;
        continue;
      }

      console.log(`🎙️  Synthesizing [${verdict}][${lang}]: "${phrase}"...`);
      try {
        const audioBuffer = await synthesizeText(phrase, fullLangCode);

        // Save to all target directories (apps/web/public and public)
        for (const dir of outputDirs) {
          fs.writeFileSync(path.join(dir, primaryFileName), audioBuffer);
          fs.writeFileSync(path.join(dir, aliasFileName), audioBuffer);
        }

        console.log(`✅ Saved ${primaryFileName} (${audioBuffer.length} bytes)`);
        generatedCount++;

        // Polite delay between API calls to avoid rate limits
        await new Promise((r) => setTimeout(r, 600));
      } catch (err) {
        console.error(`❌ Failed to generate audio for ${verdict}_${lang}:`, err.message);
      }
    }
  }

  console.log(
    `\n[generate-verdict-audio] Completed! Generated: ${generatedCount}, Skipped: ${skippedCount}, Total combos: ${
      VERDICTS.length * LANGUAGES.length
    }`,
  );
}

run().catch((err) => {
  console.error("[generate-verdict-audio] Fatal error:", err);
  process.exit(1);
});
