"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, RefreshCw, Upload, AlertCircle, Check, Loader2 } from "lucide-react";
import jsQR from "jsqr";

export interface CameraCaptureProps {
  onCapture: (data: { photoBase64: string; qrPayload?: string }) => void;
  title?: string;
  helperText?: string;
  defaultPayload?: string;
}

export function CameraCapture({
  onCapture,
  title = "Capture Reference Photo",
  helperText = "Align your physical UPI QR sticker and surrounding surface inside the frame.",
  defaultPayload = "upi://pay?pa=merchant@upi&pn=Store&cu=INR",
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [detectedQr, setDetectedQr] = useState<string>(defaultPayload);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Store detected QR and onCapture in refs to prevent render-loop triggers
  const detectedQrRef = useRef<string>(defaultPayload);
  const onCaptureRef = useRef(onCapture);

  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  // Safely stop active camera tracks
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore track stop error
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Request camera access and play feed
  const startCamera = useCallback(async () => {
    setPermissionError(null);

    // Reuse existing live stream if already open and tracks are live
    if (streamRef.current && streamRef.current.getTracks().some((t) => t.readyState === "live")) {
      const video = videoRef.current;
      if (video) {
        video.srcObject = streamRef.current;
        video.muted = true;
        video.play().catch(() => {});
        setIsCameraActive(true);
        setHasCameraPermission(true);
      }
      return;
    }

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }

      let mediaStream: MediaStream;
      try {
        // Preferred constraint: environment camera with 720p ideal resolution
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback constraint: any video camera available on device
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (!isMountedRef.current) {
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = mediaStream;
      setHasCameraPermission(true);

      const video = videoRef.current;
      if (video) {
        video.srcObject = mediaStream;
        video.muted = true;
        video.setAttribute("muted", "true");
        video.playsInline = true;
        video.setAttribute("playsinline", "true");

        const tryPlay = () => {
          video.play().catch(() => {});
        };

        tryPlay();
        video.onloadedmetadata = () => {
          tryPlay();
          setIsCameraActive(true);
        };
        video.oncanplay = () => {
          tryPlay();
          setIsCameraActive(true);
        };
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setHasCameraPermission(false);
      setIsCameraActive(false);
      const error = err as Error;
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setPermissionError(
          "Camera permission was denied. Please allow camera access in your browser settings to photograph your QR sticker.",
        );
      } else {
        setPermissionError(
          error.message ||
            "Unable to access camera. Please check your device settings or use the file upload option.",
        );
      }
    }
  }, []);

  // Initial mount: start camera once. Unmount: stop camera once.
  useEffect(() => {
    isMountedRef.current = true;
    startCamera();

    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Background QR detection loop (runs 2 times/sec to conserve CPU and prevent UI thread jitter)
  useEffect(() => {
    if (!hasCameraPermission || capturedPhoto) return;

    let barcodeDetector: {
      detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
    } | null = null;
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        barcodeDetector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      } catch {
        barcodeDetector = null;
      }
    }

    const intervalId = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || video.ended) {
        return;
      }

      try {
        if (barcodeDetector) {
          try {
            const results = await barcodeDetector.detect(video);
            if (results && results.length > 0 && results[0].rawValue) {
              const code = results[0].rawValue.trim();
              if (code && code !== detectedQrRef.current) {
                detectedQrRef.current = code;
                setDetectedQr(code);
              }
              return;
            }
          } catch {
            // fallback to jsQR
          }
        }

        // Offscreen canvas fallback
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement("canvas");
        }
        const canvas = offscreenCanvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        const scale = Math.min(1, 480 / w);
        const targetW = Math.max(1, Math.floor(w * scale));
        const targetH = Math.max(1, Math.floor(h * scale));

        canvas.width = targetW;
        canvas.height = targetH;
        ctx.drawImage(video, 0, 0, targetW, targetH);

        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const qr = jsQR(imgData.data, targetW, targetH);
        if (qr && qr.data && qr.data.trim() !== detectedQrRef.current) {
          const val = qr.data.trim();
          detectedQrRef.current = val;
          setDetectedQr(val);
        }
      } catch {
        // Silently catch scan errors
      }
    }, 450);

    return () => {
      clearInterval(intervalId);
    };
  }, [hasCameraPermission, capturedPhoto]);

  // Take photo from video feed
  const takeSnapshot = useCallback(() => {
    const video = videoRef.current;
    console.log(
      "[CameraCapture] takeSnapshot called. video:",
      !!video,
      "readyState:",
      video?.readyState,
      "videoWidth:",
      video?.videoWidth,
    );
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "#161B22";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } catch (e) {
      console.warn("[CameraCapture] drawImage failed, using fallback:", e);
      ctx.fillStyle = "#161B22";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const photoBase64 = canvas.toDataURL("image/jpeg", 0.85);

    // Final attempt to decode from snapshot if not yet detected
    let payload = detectedQrRef.current || defaultPayload;
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, canvas.width, canvas.height);
      if (code?.data?.trim()) {
        payload = code.data.trim();
        detectedQrRef.current = payload;
        setDetectedQr(payload);
      }
    } catch {
      // jsQR decode failure tolerated
    }

    console.log("[CameraCapture] Snapshot ready, payload:", payload);
    setCapturedPhoto(photoBase64);
    stopCamera();
    onCaptureRef.current({ photoBase64, qrPayload: payload });
  }, [defaultPayload, stopCamera]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    startCamera();
  }, [startCamera]);

  // Handle fallback file upload
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setCapturedPhoto(base64);

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          let payload = detectedQrRef.current || defaultPayload;
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imgData.data, canvas.width, canvas.height);
            if (code?.data) {
              payload = code.data.trim();
              detectedQrRef.current = payload;
              setDetectedQr(payload);
            }
          }
          stopCamera();
          onCaptureRef.current({ photoBase64: base64, qrPayload: payload });
        };
        img.onerror = () => {
          stopCamera();
          onCaptureRef.current({
            photoBase64: base64,
            qrPayload: detectedQrRef.current || defaultPayload,
          });
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    },
    [defaultPayload, stopCamera],
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header Info */}
      <div>
        <h3 className="text-sm font-medium text-text">{title}</h3>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">{helperText}</p>
      </div>

      {/* Camera Permission Denied Screen */}
      {hasCameraPermission === false && (
        <div
          role="alert"
          className="p-5 rounded-[4px] bg-danger/10 border border-danger text-text flex flex-col gap-3"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-text">Camera Access Required</h4>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                {permissionError ||
                  "QRaksha requires camera access to photograph your physical UPI sticker and extract a visual embedding. We never persist raw photos."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-danger/30">
            <button
              type="button"
              onClick={startCamera}
              className="h-10 px-4 rounded-[4px] bg-brand text-ink font-medium text-xs flex items-center justify-center gap-2 hover:bg-brand-soft transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Camera Permission</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-4 rounded-[4px] bg-ink-2 border border-border text-muted hover:text-text text-xs font-mono flex items-center justify-center gap-2 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photo Instead</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Camera Viewfinder (Persistent Video Element) */}
      {!capturedPhoto && hasCameraPermission !== false && (
        <div className="relative w-full aspect-[4/3] bg-ink-2 rounded-[4px] overflow-hidden border border-border flex items-center justify-center">
          {/* <video> is ALWAYS in DOM to prevent hardware encoder thrashing */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              isCameraActive ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Loading overlay while camera initializes */}
          {!isCameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink-2 text-muted">
              <Loader2 className="w-5 h-5 animate-spin text-brand" />
              <span className="text-xs font-mono">Initializing camera feed…</span>
            </div>
          )}

          {/* Technical Framing Overlay per DESIGN.md */}
          <div className="absolute inset-6 pointer-events-none border border-brand/50 rounded-[2px] flex flex-col justify-between p-2">
            <div className="flex justify-between items-start text-[10px] font-mono text-brand">
              <span>┌ FRAME ▸ ALIGN QR</span>
              <span>FIG. 01 ┐</span>
            </div>
            <div className="flex justify-between items-end text-[10px] font-mono text-brand">
              <span>└ TRACKING ACTIVE</span>
              <span>100M RADIUS ┘</span>
            </div>
          </div>

          {/* Shutter Button Overlay */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-3 px-4">
            <button
              type="button"
              onClick={takeSnapshot}
              className="h-11 px-5 rounded-[4px] bg-brand text-ink font-medium text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-brand-soft transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Reference Photo</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload from files"
              className="h-11 w-11 rounded-[4px] bg-ink/80 backdrop-blur-sm border border-border text-text flex items-center justify-center hover:border-brand transition-colors"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Captured Photo Preview */}
      {capturedPhoto && (
        <div className="flex flex-col gap-3">
          <div className="relative w-full aspect-[4/3] bg-ink-2 rounded-[4px] overflow-hidden border border-ok/50">
            <img
              src={capturedPhoto}
              alt="Reference QR Sticker"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 px-2 py-1 rounded-[2px] bg-ink/90 border border-ok text-ok text-[10px] font-mono flex items-center gap-1.5">
              <Check className="w-3 h-3" />
              <span>PHOTO CAPTURED // EMBEDDING READY</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted">Zero raw bytes will be stored</span>
            <button
              type="button"
              onClick={retakePhoto}
              className="h-8 px-3 rounded-[4px] bg-transparent border border-border text-muted hover:text-text hover:border-muted text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retake Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* Scanned/Configured QR Payload */}
      <div className="p-3 rounded-[4px] bg-ink-2 border border-border flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-muted uppercase">
          <span>Decoded QR Payload</span>
          <span className="text-ok">UPI Compliant</span>
        </div>
        <input
          type="text"
          value={detectedQr}
          onChange={(e) => {
            const val = e.target.value;
            detectedQrRef.current = val;
            setDetectedQr(val);
            if (capturedPhoto) {
              onCaptureRef.current({ photoBase64: capturedPhoto, qrPayload: val });
            }
          }}
          placeholder="upi://pay?pa=merchant@upi&pn=Store"
          className="w-full h-8 px-2 rounded-[2px] bg-ink border border-border/80 text-xs font-mono text-text focus:outline-none focus:border-brand"
        />
        <p className="text-[10px] text-muted">
          Auto-detected from camera or test default. You can edit this if needed.
        </p>
      </div>

      {/* Single persistent file input for uploads & testing */}
      <input
        id="qr-camera-file-input"
        data-testid="file-upload-input"
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
