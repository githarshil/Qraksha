import { NfcVerdict, NfcLanguage, NFC_VOICE_SCRIPTS, NFC_LANGUAGES } from "./nfc-constants";

let activeAudio: HTMLAudioElement | null = null;

/**
 * Public announceVerdict function matching user specification:
 * announceVerdict(verdict, merchantName, lang)
 * 1. Try playing pre-recorded audio /audio/{verdict}_{lang}.mp3
 * 2. Fall back to window.speechSynthesis
 * 3. Fail gracefully and trigger onAudioUnavailable toast
 */
export async function announceVerdict(
  verdict: NfcVerdict,
  lang: NfcLanguage = "en",
  merchantName?: string,
  onAudioUnavailable?: () => void,
): Promise<{ success: boolean; method: "audio" | "speechSynthesis" | "none" }> {
  // Stop existing playback
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudio = null;
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  // 1. Try playing pre-recorded MP3
  const audioFile = `/audio/${verdict.toLowerCase()}_${lang}.mp3`;
  try {
    const audio = new Audio(audioFile);
    activeAudio = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      await playPromise;
    }

    return { success: true, method: "audio" };
  } catch (_audioError) {
    // MP3 play failed (e.g. autoplay block or file error), fall back to SpeechSynthesis
    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window
    ) {
      try {
        const scriptTemplate = NFC_VOICE_SCRIPTS[verdict]?.[lang] || NFC_VOICE_SCRIPTS[verdict]?.en;
        let scriptText = scriptTemplate;
        if (merchantName && merchantName !== "Sharma Tea Stall") {
          scriptText = scriptText.replace("Sharma Tea Stall", merchantName);
        }

        const langMeta = NFC_LANGUAGES.find((l) => l.id === lang);
        const targetLocale = langMeta?.speechLocale || "en-IN";

        const utterance = new SpeechSynthesisUtterance(scriptText);
        utterance.lang = targetLocale;
        utterance.rate = 0.95;

        // Try to match available voice
        const voices = window.speechSynthesis.getVoices();
        const matchedVoice =
          voices.find(
            (v) => v.lang === targetLocale || v.lang.replace("_", "-") === targetLocale,
          ) ||
          voices.find((v) => v.lang.startsWith(lang)) ||
          voices.find((v) => v.lang.includes("en-IN") || v.lang.startsWith("en"));

        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }

        window.speechSynthesis.speak(utterance);
        return { success: true, method: "speechSynthesis" };
      } catch (_speechErr) {
        // Speech synthesis failed
      }
    }

    // 3. If speechSynthesis is unavailable or failed, notify toast
    if (onAudioUnavailable) {
      onAudioUnavailable();
    }
    return { success: false, method: "none" };
  }
}

/**
 * Stop any active voice playback
 */
export function stopVoiceAnnouncement() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}
