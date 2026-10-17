# Verdict Audio Placeholders

> [!NOTE]
> The .wav files in this directory (verified.wav, tampered.wav, unregistered.wav, etc.) are minimal silent/tone **placeholders** intended only to prevent HTTP 404 responses if static paths are probed directly.
>
> **Real Voice Audio Generation:**
> In QRaksha, real multilingual voice verdicts (Hindi, English, Kannada) are synthesized dynamically via the backend's Sarvam Bulbul:v3 TTS integration (POST /api/v1/voice/verdict) or fall back gracefully to the browser's native window.speechSynthesis API. These static placeholder files are not pre-recorded production audio clips.
