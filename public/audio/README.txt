QRaksha NFC Tap-Verification Audio Assets
=============================================

This directory serves pre-recorded voice announcements for the NFC tap-verification flow (/t/:tagId).
Files are served statically from /audio/{verdict}_{lang}.mp3.

Expected 9 Audio Files & Voice Scripts
--------------------------------------

1. VERIFIED (Merchant found & location matches registered location)
- verified_en.mp3
  Script (English): "You are about to pay Sharma Tea Stall. This merchant is verified."
- verified_hi.mp3
  Script (Hindi):   "आप शर्मा टी स्टॉल को भुगतान करने वाले हैं। यह व्यापारी सत्यापित है।"
- verified_kn.mp3
  Script (Kannada): "ನೀವು ಶರ್ಮಾ ಟೀ ಸ್ಟಾಲ್‌ಗೆ ಹಣ ಪಾವತಿಸಲಿದ್ದೀರಿ. ಈ ವ್ಯಾಪಾರಿ ಪರಿಶೀಲಿಸಲ್ಪಟ್ಟಿದ್ದಾರೆ."

2. UNVERIFIED (Tag is not registered in the system)
- unverified_en.mp3
  Script (English): "This tag is not registered. Pay only if you trust this shop."
- unverified_hi.mp3
  Script (Hindi):   "यह टैग पंजीकृत नहीं है। केवल तभी भुगतान करें जब आप इस दुकान पर भरोसा करते हों।"
- unverified_kn.mp3
  Script (Kannada): "ಈ ಟ್ಯಾಗ್ ನೋಂದಾಯಿಸಲಾಗಿಲ್ಲ. ನೀವು ಈ ಅಂಗಡಿಯನ್ನು ನಂಬಿದರೆ ಮಾತ್ರ ಪಾವತಿಸಿ."

3. WARNING (Tag registered to another location / relocated / clone attempt)
- warning_en.mp3
  Script (English): "Warning. This tag does not match its registered location. Do not pay."
- warning_hi.mp3
  Script (Hindi):   "चेतावनी। यह टैग इसके पंजीकृत स्थान से मेल नहीं खाता है। भुगतान न करें।"
- warning_kn.mp3
  Script (Kannada): "ಎಚ್ಚರಿಕೆ. ಈ ಟ್ಯಾಗ್ ಅದರ ನೋಂದಾಯಿತ ಸ್ಥಳಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ. ಪಾವತಿಸಬೇಡಿ."

Audio Playback Pipeline
-----------------------
1. Attempt HTMLAudioElement playback of /audio/{verdict}_{lang}.mp3.
2. If file is missing or playback fails, fallback to browser window.speechSynthesis with matching Indic locale (en-IN, hi-IN, kn-IN).
3. If speech synthesis is unavailable, fail gracefully and display an "Audio unavailable" toast notification.
