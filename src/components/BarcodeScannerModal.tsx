import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Check, Scan, RefreshCw, Volume2, Smartphone, Keyboard, CheckCircle2 } from 'lucide-react';
import { ThemeMode } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
  title: string;
  theme?: ThemeMode;
  targetType?: 'order' | 'returnId' | 'sku' | 'awb';
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onDetected,
  title,
  theme = 'light',
  targetType = 'order'
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [lastScannedFeedback, setLastScannedFeedback] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);

  // Buffer for handheld USB / Bluetooth barcode scanner guns (HID keyboard emulation)
  const keyBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Synthetic warehouse scanner beep
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {}
  };

  const handleSuccessfulScan = (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    playBeep();
    setLastScannedFeedback(`Scanned: ${clean}`);
    setTimeout(() => {
      onDetected(clean);
      onClose();
    }, 250);
  };

  // Handheld barcode scanner gun global listener (captures rapid keystrokes terminating in Enter)
  useEffect(() => {
    if (!isOpen) return;

    // Autofocus input for direct scanner gun target
    setTimeout(() => {
      if (manualInputRef.current) {
        manualInputRef.current.focus();
      }
    }, 150);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter key indicates end of barcode transmission from scanner gun
      if (e.key === 'Enter') {
        const buffered = keyBufferRef.current.trim();
        if (buffered.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          keyBufferRef.current = '';
          handleSuccessfulScan(buffered);
          return;
        }
      }

      // Check for printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const now = Date.now();
        // Handheld scanners send characters in rapid succession (< 80ms)
        if (now - lastKeyTimeRef.current > 300) {
          keyBufferRef.current = e.key;
        } else {
          keyBufferRef.current += e.key;
        }
        lastKeyTimeRef.current = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen]);

  // Camera start/stop on open
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setManualCode('');
      setCameraError(null);
      setLastScannedFeedback(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access requires HTTPS or is not supported on this browser context. You can use your connected handheld USB scanner directly or enter below.');
      return;
    }

    let stream: MediaStream | null = null;
    try {
      // Try preferred constraints (ideal environment camera)
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
    } catch (primaryErr) {
      // Fallback for laptop webcams or devices that reject ideal facingMode/dimensions
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      } catch (fallbackErr: any) {
        const msg = fallbackErr?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera permissions in your browser bar.'
          : fallbackErr?.name === 'NotFoundError'
          ? 'No physical camera detected on this laptop/device. Handheld USB scanner is ready.'
          : `Camera error: ${fallbackErr?.message || 'Unable to open camera'}.`;
        setCameraError(msg);
        setCameraActive(false);
        return;
      }
    }

    if (stream && videoRef.current) {
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
        setCameraActive(true);
        startBarcodeDetection();
      } catch (playErr: any) {
        console.warn('Video play error:', playErr);
        setCameraActive(true);
      }
    }
  };

  const startBarcodeDetection = () => {
    // Check for native BarcodeDetector API (Supported in Chrome Android, Chrome Desktop, Safari 17+)
    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e', 'itf']
        });

        const checkFrame = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animationFrameRef.current = requestAnimationFrame(checkFrame);
            return;
          }

          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              const detectedValue = barcodes[0].rawValue.trim();
              if (detectedValue) {
                handleSuccessfulScan(detectedValue);
                return;
              }
            }
          } catch {}

          animationFrameRef.current = requestAnimationFrame(checkFrame);
        };

        animationFrameRef.current = requestAnimationFrame(checkFrame);
      } catch {}
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const toggleFacingMode = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSuccessfulScan(manualCode.trim());
    }
  };

  const simulateQuickScan = (code: string) => {
    handleSuccessfulScan(code);
  };

  if (!isOpen) return null;

  const isLight = theme === 'light';

  // Specific realistic samples based on field
  const samples =
    targetType === 'order'
      ? [
          { label: 'Meesho Order', code: 'MSH-882319412' },
          { label: 'Amazon Order', code: '408-9921045-8127351' },
          { label: 'Flipkart Order', code: 'OD309921849102' }
        ]
      : targetType === 'returnId'
      ? [
          { label: 'Meesho Ret ID', code: 'RET-MSH-99214' },
          { label: 'Amazon Ret ID', code: 'RET-AMZ-44120' },
          { label: 'Flipkart Ret ID', code: 'FK-RET-81920' }
        ]
      : targetType === 'awb'
      ? [
          { label: 'Delhivery AWB', code: 'DELHIVERY-778902194' },
          { label: 'Amazon ATS AWB', code: 'ATS-IN-39921049' },
          { label: 'Ecom Express AWB', code: 'ECOM-6655443322' }
        ]
      : [
          { label: 'Spice Rack (MSH)', code: 'MSH-KTC-991' },
          { label: 'Flask Bottle (ASIN)', code: 'B08Y123456' },
          { label: 'Storage Box (FSN)', code: 'FSN-STOR-BOX-3P' },
          { label: 'EAN Stand', code: '890432109805' }
        ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-700 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">{title}</h3>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span>Handheld USB Gun &amp; Camera Scanner</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isLight ? 'text-slate-400 hover:bg-slate-200 text-slate-600' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Viewfinder / Camera Screen */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Handheld Scanner Status Banner */}
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-semibold">
                Handheld Scanner Gun: <strong>Ready</strong> (Pull trigger anytime)
              </span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">
              HID Auto-Detect
            </span>
          </div>

          {/* Success scan toast */}
          {lastScannedFeedback && (
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2 animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              <span>{lastScannedFeedback}</span>
            </div>
          )}

          {/* Video Viewport: video element ALWAYS mounted so ref is never null */}
          <div className="relative aspect-[4/3] sm:aspect-video bg-black rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              playsInline
              autoPlay
              muted
            />

            {cameraActive ? (
              <>
                {/* Aim Reticle */}
                <div className="absolute inset-8 sm:inset-10 border-2 border-amber-400/90 rounded-xl pointer-events-none flex flex-col items-center justify-between p-3">
                  <div className="w-full flex justify-between text-[10px] text-amber-300 font-mono bg-black/60 px-2 py-0.5 rounded">
                    <span>AIM AT BARCODE</span>
                    <span>AUTO-DETECT SCANNING</span>
                  </div>
                  <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)] animate-pulse"></div>
                  <div className="text-[10px] text-white/80 bg-black/60 px-2 py-0.5 rounded">
                    Hold steady · 10-15 cm away
                  </div>
                </div>

                {/* Flip camera switch */}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  title="Switch Front/Back Camera"
                  className="absolute bottom-3 right-3 p-2 bg-black/70 hover:bg-black text-white rounded-lg text-xs backdrop-blur flex items-center gap-1.5 border border-white/20 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Flip Cam</span>
                </button>
              </>
            ) : (
              <div className="p-6 text-center space-y-3">
                <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                  {cameraError || 'Camera inactive. Point your handheld barcode gun to scan directly, or click below to launch webcam.'}
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Launch Camera</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Simulation Barcodes */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              1-Tap Quick Scan (Realistic Warehouse Samples):
            </span>
            <div className="flex flex-wrap gap-2">
              {samples.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => simulateQuickScan(s.code)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition border flex items-center gap-1.5 cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 hover:bg-amber-100 border-slate-300 text-slate-800 hover:border-amber-400'
                      : 'bg-slate-800 hover:bg-amber-500/20 border-slate-700 text-slate-200 hover:text-amber-300 hover:border-amber-500/40'
                  }`}
                >
                  <Scan className="w-3 h-3 text-amber-500" />
                  <span>{s.label}: <strong>{s.code}</strong></span>
                </button>
              ))}
            </div>
          </div>

          {/* Handheld Scanner Target & Manual Entry Input */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Handheld Scanner Gun Target / Manual Input:
              </label>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                Autofocused for Scanner Gun
              </span>
            </div>
            <div className="flex gap-2">
              <input
                ref={manualInputRef}
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                autoFocus
                placeholder="Scanner gun will type here & press Enter..."
                className={`flex-1 rounded-xl px-3.5 py-2.5 text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    : 'bg-slate-950 border-slate-700 text-white placeholder-slate-600'
                }`}
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Apply</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
