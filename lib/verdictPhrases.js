/**
 * Shared verdict phrases for QRaksha audio announcements.
 * Single source of truth for pre-generated audio, fallback clips, and TTS caching.
 * Matches existing hardcoded messages from packages/shared/src/voice/messages.ts.
 */

const VERDICT_PHRASES = {
  VERIFIED: {
    en: "This merchant is verified. You can pay safely.",
    hi: "यह व्यापारी सत्यापित है। आप सुरक्षित रूप से भुगतान कर सकते हैं।",
    kn: "ಈ ವ್ಯಾಪಾರಿ ಪರಿಶೀಲಿತರಾಗಿದ್ದಾರೆ. ನೀವು ಸುರಕ್ಷಿತವಾಗಿ ಪಾವತಿಸಬಹುದು.",
  },
  RECENTLY_REGISTERED: {
    en: "This merchant is recently registered and trust is still building. Please confirm with the shopkeeper before paying.",
    hi: "यह व्यापारी हाल ही में पंजीकृत हुआ है और भरोसा अभी बन रहा है। भुगतान से पहले दुकानदार से पुष्टि करें।",
    kn: "ಈ ವ್ಯಾಪಾರಿ ಇತ್ತೀಚೆಗೆ ನೋಂದಾಯಿಸಿದ್ದಾರೆ, ವಿಶ್ವಾಸ ಇನ್ನೂ ಬೆಳೆಯುತ್ತಿದೆ. ಪಾವತಿಸುವ ಮೊದಲು ಅಂಗಡಿಯವರೊಂದಿಗೆ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
  },
  UNVERIFIED: {
    en: "This QR code is not verified. We cannot confirm who it belongs to. Please confirm with the shopkeeper before paying.",
    hi: "यह क्यूआर कोड सत्यापित नहीं है। हम पुष्टि नहीं कर सकते कि यह किसका है। भुगतान से पहले दुकानदार से पूछ लें।",
    kn: "ಈ ಕ್ಯೂಆರ್ ಕೋಡ್ ಪರಿಶೀಲಿತವಾಗಿಲ್ಲ. ಇದು ಯಾರದು ಎಂದು ನಾವು ಖಚಿತಪಡಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ಪಾವತಿಸುವ ಮೊದಲು ಅಂಗಡಿಯವರನ್ನು ಕೇಳಿ.",
  },
  WARNING: {
    en: "Warning! Something is wrong with this QR code. Do not pay.",
    hi: "चेतावनी! इस क्यूआर कोड में गड़बड़ी पाई गई है। भुगतान न करें।",
    kn: "ಎಚ್ಚರಿಕೆ! ಈ ಕ್ಯೂಆರ್ ಕೋಡ್ನಲ್ಲಿ समस्या ಕಂಡುಬಂದಿದೆ. ಪಾವತಿ ಮಾಡಬೇಡಿ.",
  },
};

const MERCHANT_NAME_TEMPLATES = {
  en: "You are about to pay {merchant}.",
  hi: "आप {merchant} को भुगतान करने जा रहे हैं।",
  kn: "ನೀವು {merchant} ಅವರಿಗೆ ಪಾವತಿ ಮಾಡಲಿದ್ದೀರಿ.",
};

const VERDICTS = ["VERIFIED", "RECENTLY_REGISTERED", "UNVERIFIED", "WARNING"];
const LANGUAGES = ["en", "hi", "kn"];

const LANGUAGE_CODE_MAP = {
  en: "en-IN",
  hi: "hi-IN",
  kn: "kn-IN",
  "en-IN": "en-IN",
  "hi-IN": "hi-IN",
  "kn-IN": "kn-IN",
};

module.exports = {
  VERDICT_PHRASES,
  MERCHANT_NAME_TEMPLATES,
  VERDICTS,
  LANGUAGES,
  LANGUAGE_CODE_MAP,
};
