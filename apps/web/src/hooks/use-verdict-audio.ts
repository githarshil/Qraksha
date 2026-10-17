"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  VoiceVerdictType,
  VoiceLanguageCode,
  VERDICT_PHRASES,
  MERCHANT_NAME_TEMPLATES,
} from "@qraksha/shared";
import { VoiceState } from "../lib/voice-player";
import { fetchLiveTts } from "../lib/api";

export interface PlayVerdictParams {
  verdict: VoiceVerdictType;
  merchantDisplayName?: string;
  voiceClips?: Record<string, string>;
  lang?: VoiceLanguageCode;
}

export interface UseVerdictAudioReturn {
  voiceState: VoiceState;
  amplitude: number;
  isPlaying: boolean;
  preloadMerchantClip: (url?: string) => Promise<void>;
  playVerdict: (params: PlayVerdictParams) => Promise<void>;
  stop: () => void;
  primeAudioContext: () => void;
}

const SHORT_LANG_MAP: Record<VoiceLanguageCode, "en" | "hi" | "kn"> = {
  "en-IN": "en",
  "hi-IN": "hi",
  "kn-IN": "kn",
};

/**
 * useVerdictAudio
 *
 * Layered audio playback hook for QRaksha verification announcements:
 * - Visual verdict is never delayed by audio (renders immediately).
 * - Playback order: [merchant name clip] then [verdict clip], played back to back.
 * - Preloads merchant name clip as soon as credential is known.
 * - 4-layer fallback chain:
 *   a) Pre-generated / cached clip (from public/audio/verdicts or Supabase storage)
 *   b) Live call to /api/tts (strictly bounded by 2s timeout)
 *   c) Native browser window.speechSynthesis (matching Indic voice if available)
 *   d) Silent fallback, visual display remains fully intact
 */
export function useVerdictAudio(defaultLang: VoiceLanguageCode = "en-IN"): UseVerdictAudioReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [amplitude, setAmplitude] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const preloadedBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Initialize or resume Web Audio context
  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    try {
      const AudioCtxClass =
        window.AudioContext ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext;

      if (!AudioCtxClass) return null;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtxClass();
      }

      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }

      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  const primeAudioContext = useCallback(() => {
    getAudioContext();
  }, [getAudioContext]);

  // Stop all playback, synthesis, and monitoring immediately
  const stop = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
        currentSourceRef.current.disconnect();
      } catch {
        // Source already terminated
      }
      currentSourceRef.current = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Handled silently
      }
    }

    setVoiceState("idle");
    setAmplitude(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stop]);

  // Decode arrayBuffer to AudioBuffer
  const decodeAudio = useCallback(
    async (arrayBuffer: ArrayBuffer): Promise<AudioBuffer | null> => {
      const ctx = getAudioContext();
      if (!ctx) return null;
      try {
        return await ctx.decodeAudioData(arrayBuffer.slice(0));
      } catch {
        return null;
      }
    },
    [getAudioContext],
  );

  // Preload merchant clip into memory ahead of time
  const preloadMerchantClip = useCallback(
    async (url?: string): Promise<void> => {
      if (!url || typeof window === "undefined") return;
      if (preloadedBuffersRef.current.has(url)) return;

      try {
        const resp = await fetch(url);
        if (!resp.ok) return;
        const arrayBuffer = await resp.arrayBuffer();
        const audioBuffer = await decodeAudio(arrayBuffer);
        if (audioBuffer) {
          preloadedBuffersRef.current.set(url, audioBuffer);
        }
      } catch {
        // Preload failure is non-blocking; lazy fallback will handle it
      }
    },
    [decodeAudio],
  );

  // Play an AudioBuffer through Web Audio with real-time waveform analysis
  const playBuffer = useCallback(
    (buffer: AudioBuffer): Promise<void> => {
      return new Promise((resolve) => {
        const ctx = getAudioContext();
        if (!ctx) {
          return resolve();
        }

        if (currentSourceRef.current) {
          try {
            currentSourceRef.current.stop();
            currentSourceRef.current.disconnect();
          } catch {
            // Source already stopped
          }
          currentSourceRef.current = null;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;

        source.connect(analyser);
        analyser.connect(ctx.destination);

        currentSourceRef.current = source;
        analyserRef.current = analyser;

        setVoiceState("speaking");
        setIsPlaying(true);
        isPlayingRef.current = true;

        // Amplitude loop
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateAmplitude = () => {
          if (!isPlayingRef.current || !analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(1.0, avg / 128);
          setAmplitude(normalized);
          animationFrameRef.current = requestAnimationFrame(updateAmplitude);
        };

        updateAmplitude();

        source.onended = () => {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          currentSourceRef.current = null;
          setAmplitude(0);
          resolve();
        };

        source.start(0);
      });
    },
    [getAudioContext],
  );

  // Fallback Layer C: Native browser SpeechSynthesis
  const playSpeechSynthesis = useCallback(
    (text: string, lang: VoiceLanguageCode): Promise<void> => {
      return new Promise((resolve) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          return resolve();
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.95;

        // Try to pick matching voice
        const voices = window.speechSynthesis.getVoices();
        const short = SHORT_LANG_MAP[lang];
        const matchingVoice =
          voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ||
          voices.find((v) => v.lang.toLowerCase().startsWith(short));
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }

        setVoiceState("speaking");
        setIsPlaying(true);
        isPlayingRef.current = true;

        // Sine wave amplitude simulation for SpeechSynthesis
        const startTime = performance.now();
        const pulseLoop = (time: number) => {
          if (!isPlayingRef.current) return;
          const elapsed = (time - startTime) / 1000;
          const amp = 0.5 + 0.3 * Math.sin(elapsed * 2.5 * Math.PI);
          setAmplitude(amp);
          animationFrameRef.current = requestAnimationFrame(pulseLoop);
        };
        animationFrameRef.current = requestAnimationFrame(pulseLoop);

        utterance.onend = () => {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          setAmplitude(0);
          resolve();
        };

        utterance.onerror = () => {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          setAmplitude(0);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    [],
  );

  /**
   * Plays a single phrase using the strict 4-layer fallback:
   * Layer A: Pre-generated / cached static or storage clip
   * Layer B: Live call to /api/tts (2s timeout)
   * Layer C: Browser SpeechSynthesis
   * Layer D: Silent degradation
   */
  const playAudioWithFallback = useCallback(
    async (
      candidateUrls: (string | undefined)[],
      text: string,
      lang: VoiceLanguageCode,
    ): Promise<void> => {
      // --- Layer A: Pre-generated / cached audio ---
      for (const url of candidateUrls) {
        if (!url) continue;

        // Check in-memory preloaded buffer first
        const preloaded = preloadedBuffersRef.current.get(url);
        if (preloaded) {
          await playBuffer(preloaded);
          return;
        }

        // Fetch clip from URL
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            const decoded = await decodeAudio(buf);
            if (decoded) {
              preloadedBuffersRef.current.set(url, decoded);
              await playBuffer(decoded);
              return;
            }
          }
        } catch {
          // Fall through to next candidate or Layer B
        }
      }

      // --- Layer B: Live call to /api/tts (2s timeout) ---
      try {
        setVoiceState("thinking");
        const liveAudioUrl = await fetchLiveTts({
          text,
          lang,
          timeoutMs: 2000,
        });

        if (liveAudioUrl) {
          const resp = await fetch(liveAudioUrl);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            const decoded = await decodeAudio(buf);
            if (decoded) {
              await playBuffer(decoded);
              return;
            }
          }
        }
      } catch {
        // Layer B failed or timed out > 2s; proceed to Layer C
      }

      // --- Layer C: Browser SpeechSynthesis ---
      try {
        await playSpeechSynthesis(text, lang);
        return;
      } catch {
        // Proceed to Layer D
      }

      // --- Layer D: Silent fallback ---
      setVoiceState("idle");
      setAmplitude(0);
    },
    [decodeAudio, playBuffer, playSpeechSynthesis],
  );

  /**
   * Main entry point: Plays the verdict announcement back to back.
   * Playback order: [merchant name clip] then [verdict clip].
   */
  const playVerdict = useCallback(
    async (params: PlayVerdictParams): Promise<void> => {
      stop();
      primeAudioContext();

      const lang = params.lang || defaultLang;
      const short = SHORT_LANG_MAP[lang] || "en";
      const verdictSlug = params.verdict.toLowerCase();

      // Determine if merchant name clip is permitted (VERIFIED & RECENTLY_REGISTERED only)
      const isNamedAllowed =
        (params.verdict === "VERIFIED" || params.verdict === "RECENTLY_REGISTERED") &&
        Boolean(params.merchantDisplayName?.trim());

      const cleanMerchantName = isNamedAllowed ? params.merchantDisplayName!.trim() : undefined;

      try {
        // 1. Play [merchant name clip] if permitted
        if (cleanMerchantName) {
          const merchantText = MERCHANT_NAME_TEMPLATES[short].replace(
            "{merchant}",
            cleanMerchantName,
          );

          const storedClipUrl = params.voiceClips?.[short] || params.voiceClips?.[lang];

          await playAudioWithFallback([storedClipUrl], merchantText, lang);
        }

        // 2. Play [verdict clip]
        const verdictText = VERDICT_PHRASES[params.verdict][short];
        const staticClipCandidates = [
          `/audio/verdicts/${verdictSlug}_${short}.mp3`,
          `/audio/verdicts/${verdictSlug}_${lang}.mp3`,
        ];

        await playAudioWithFallback(staticClipCandidates, verdictText, lang);
      } finally {
        setVoiceState("idle");
        setIsPlaying(false);
        isPlayingRef.current = false;
        setAmplitude(0);
      }
    },
    [defaultLang, playAudioWithFallback, primeAudioContext, stop],
  );

  return {
    voiceState,
    amplitude,
    isPlaying,
    preloadMerchantClip,
    playVerdict,
    stop,
    primeAudioContext,
  };
}
