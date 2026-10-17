#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * scripts/pregenerate-demo-audio.js
 *
 * Pre-generates and caches merchant name announcement clips in all 3 languages
 * (English, Hindi, Kannada) for demo merchants into Supabase Storage & tts_cache.
 * Also saves local fallback MP3 copies so offline or low-connectivity demos
 * run with zero live network calls to Sarvam.
 *
 * Usage:
 *   node scripts/pregenerate-demo-audio.js
 *   node scripts/pregenerate-demo-audio.js --force
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

// 1. Load environment variables
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

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const SARVAM_BASE_URL = process.env.SARVAM_BASE_URL || "https://api.sarvam.ai";
const SARVAM_MODEL = process.env.SARVAM_TTS_MODEL || "bulbul:v3";
const SARVAM_SPEAKER = process.env.SARVAM_SPEAKER || "shubh";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const force = process.argv.includes("--force");

if (!SARVAM_API_KEY) {
  console.error("❌ [pregenerate-demo-audio] ERROR: SARVAM_API_KEY is not set.");
  process.exit(1);
}

// 2. Initialize Supabase Admin Client
let supabaseAdmin = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// 3. Demo Merchants to Pre-generate
const DEMO_MERCHANTS = [
  "Sharma Canteen",
  "ABC Petrol Pump",
  "Fresh Bites Quick Snacks",
  "Campus Cafe & Bakery",
  "City Parking Stand",
  "Metro Chai Point",
  "Quick Xerox & Stationery",
  "Sharma General Store",
  "Chai Point",
  "Sharma Kirana",
  "Sharma Sweets",
];

const LANGUAGES = [
  { code: "en-IN", short: "en", name: "English" },
  { code: "hi-IN", short: "hi", name: "Hindi" },
  { code: "kn-IN", short: "kn", name: "Kannada" },
];

// Target directories for local fallback MP3 copies
const localAudioDirs = [
  path.resolve(__dirname, "../apps/web/public/audio/demo"),
  path.resolve(__dirname, "../public/audio/demo"),
];

for (const dir of localAudioDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Helper: slugify merchant name
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Transliterate English names into native Indic scripts via Sarvam API
async function transliterateName(name, targetLangCode) {
  if (targetLangCode === "en-IN" || !/[a-zA-Z]/.test(name)) {
    return name;
  }

  try {
    const resp = await fetch(`${SARVAM_BASE_URL}/transliterate`, {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        input: name,
        source_language_code: "en-IN",
        target_language_code: targetLangCode,
        numerals_format: "international",
        spoken_form: false,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.transliterated_text && data.transliterated_text.trim()) {
        return data.transliterated_text.trim();
      }
    }
  } catch (_err) {
    // Non-fatal, fallback to raw name
  }

  return name;
}

// Formats announcement sentence per language
function formatScript(name, langCode) {
  if (langCode === "hi-IN") {
    return `आप ${name} को भुगतान करने जा रहे हैं।`;
  }
  if (langCode === "kn-IN") {
    return `ನೀವು ${name} ಅವರಿಗೆ ಪಾವತಿ ಮಾಡಲಿದ್ದೀರಿ.`;
  }
  return `You are about to pay ${name}.`;
}

// Synthesize audio via Sarvam bulbul:v3 with mp3 output
async function synthesize(text, targetLangCode) {
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
  console.log("🛡️  [pregenerate-demo-audio] Pre-generating Demo Audio Clips...");
  console.log(`📡 Sarvam: ${SARVAM_BASE_URL} (${SARVAM_MODEL}, speaker: ${SARVAM_SPEAKER})`);
  console.log(`📦 Supabase: ${SUPABASE_URL || "Not configured"}`);
  console.log(`⚡ Force regeneration: ${force}\n`);

  // Query existing credentials from Supabase if connected
  const existingCredentials = new Map();
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .schema("comparison")
        .from("merchant_credential")
        .select("id, display_name, voice_clips");

      if (!error && Array.isArray(data)) {
        for (const cred of data) {
          if (cred.display_name) {
            existingCredentials.set(cred.display_name.trim().toLowerCase(), cred);
          }
        }
        console.log(`🔍 Found ${existingCredentials.size} existing credentials in Supabase.`);
      }
    } catch (err) {
      console.warn("⚠️  Could not fetch existing credentials:", err.message);
    }
  }

  const results = [];

  for (const merchantName of DEMO_MERCHANTS) {
    console.log(`\n🏪 Merchant: "${merchantName}"`);
    const cred = existingCredentials.get(merchantName.toLowerCase());
    const voiceClipsMap = cred?.voice_clips || {};

    for (const lang of LANGUAGES) {
      const slug = slugify(merchantName);
      const filename = `${slug}_${lang.short}.mp3`;
      const localFilePaths = localAudioDirs.map((d) => path.join(d, filename));
      const localExists = localFilePaths.every((p) => fs.existsSync(p));

      // 1. Transliterate name if needed
      const spokenName = await transliterateName(merchantName, lang.code);
      const text = formatScript(spokenName, lang.code);

      // 2. Compute hash
      const hash = crypto
        .createHash("sha256")
        .update(text.trim() + lang.code + SARVAM_SPEAKER)
        .digest("hex");

      // Check cache in Supabase
      let publicUrl = "";
      let isCached = false;

      if (!force && supabaseAdmin) {
        try {
          const { data: cached } = await supabaseAdmin
            .schema("comparison")
            .from("tts_cache")
            .select("audio_url")
            .eq("hash", hash)
            .maybeSingle();

          if (cached?.audio_url) {
            publicUrl = cached.audio_url;
            isCached = true;
          }
        } catch {
          // ignore cache read error
        }
      }

      // Check if already in voice_clips
      if (!force && !publicUrl && voiceClipsMap[lang.short]) {
        publicUrl = voiceClipsMap[lang.short];
        isCached = true;
      }

      let audioBuffer = null;

      if (isCached && localExists && !force) {
        console.log(`   ✅ [${lang.name}] Already cached: ${publicUrl || filename}`);
        results.push({
          merchant: merchantName,
          lang: lang.name,
          status: "CACHED",
          url: publicUrl || `/audio/demo/${filename}`,
        });
        continue;
      }

      // 3. Synthesize audio
      console.log(`   🎙️  [${lang.name}] Synthesizing "${text}"...`);
      try {
        audioBuffer = await synthesize(text, lang.code);
      } catch (err) {
        console.error(`   ❌ Failed synthesizing [${lang.name}]:`, err.message);
        continue;
      }

      // 4. Save local files
      for (const p of localFilePaths) {
        fs.writeFileSync(p, audioBuffer);
      }

      // 5. Upload to Supabase Storage if configured
      if (supabaseAdmin) {
        try {
          const cachePath = `cache/${hash}.mp3`;
          await supabaseAdmin.storage.from("voice-clips").upload(cachePath, audioBuffer, {
            contentType: "audio/mpeg",
            upsert: true,
          });

          const { data: urlData } = supabaseAdmin.storage
            .from("voice-clips")
            .getPublicUrl(cachePath);

          if (urlData?.publicUrl) {
            publicUrl = urlData.publicUrl;
          }

          // Also save in merchants/{credentialId}/{lang}.mp3 if credential exists
          if (cred?.id) {
            const credPath = `merchants/${cred.id}/${lang.short}.mp3`;
            await supabaseAdmin.storage.from("voice-clips").upload(credPath, audioBuffer, {
              contentType: "audio/mpeg",
              upsert: true,
            });

            const { data: credUrlData } = supabaseAdmin.storage
              .from("voice-clips")
              .getPublicUrl(credPath);

            if (credUrlData?.publicUrl) {
              publicUrl = credUrlData.publicUrl;
            }
          }

          // Insert or update tts_cache
          if (publicUrl) {
            await supabaseAdmin.schema("comparison").from("tts_cache").upsert({
              hash,
              audio_url: publicUrl,
              created_at: new Date().toISOString(),
            });
          }
        } catch (storageErr) {
          console.warn(`   ⚠️ Supabase storage upload warning: ${storageErr.message}`);
        }
      }

      if (!publicUrl) {
        publicUrl = `/audio/demo/${filename}`;
      }

      // Update voiceClips in merchant_credential if cred exists
      if (cred?.id && supabaseAdmin && publicUrl) {
        voiceClipsMap[lang.short] = publicUrl;
        voiceClipsMap[lang.code] = publicUrl;
        try {
          await supabaseAdmin
            .schema("comparison")
            .from("merchant_credential")
            .update({ voice_clips: voiceClipsMap })
            .eq("id", cred.id);
        } catch (dbErr) {
          console.warn(`   ⚠️ Failed to update merchant_credential.voice_clips: ${dbErr.message}`);
        }
      }

      results.push({
        merchant: merchantName,
        lang: lang.name,
        status: "GENERATED & STORED",
        url: publicUrl,
      });

      console.log(`   ✨ Saved: ${publicUrl}`);
    }
  }

  console.log("\n=======================================================");
  console.log("🎉 All Demo Merchant Audio Pre-generation Complete!");
  console.log("=======================================================");
  console.table(results);
}

run().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
