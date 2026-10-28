'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface CameraQrScannerProps {
  eventId: string;
  initialToken?: string;
  idempotencyKey: string;
}

export function CameraQrScanner({
  eventId,
  initialToken = '',
  idempotencyKey,
}: CameraQrScannerProps) {
  const [qrToken, setQrToken] = useState(initialToken);
  const [deltaAttendees, setDeltaAttendees] = useState(1);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [autoSubmitOnScan, setAutoSubmitOnScan] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanDetectedMessage, setScanDetectedMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  function playBeep() {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Abaikan jika browser memblokir audio otomatis
    }
  }

  function stopCamera() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  async function startCamera(mode: 'environment' | 'user' = facingMode) {
    stopCamera();
    setCameraError(null);
    setScanDetectedMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Browser ini tidak mendukung akses kamera langsung. Gunakan fitur Upload Gambar QR atau ketik kode di bawah.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          void videoRef.current.play();
          requestAnimationFrame(tickScanFrame);
        }
      }, 100);
    } catch {
      setCameraError(
        'Izin kamera ditolak atau perangkat tidak memiliki kamera. Pastikan Anda mengizinkan akses kamera (Allow Camera) di browser.'
      );
      setCameraActive(false);
    }
  }

  function tickScanFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data && code.data.trim().length > 0) {
          const detected = code.data.trim();
          playBeep();
          setQrToken(detected);
          setScanDetectedMessage(`✓ QR Terdeteksi: ${detected}`);
          stopCamera();

          if (autoSubmitOnScan && formRef.current) {
            setTimeout(() => {
              formRef.current?.requestSubmit();
            }, 250);
          }
          return;
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(tickScanFrame);
  }

  function handleImageFileScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError(null);

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          playBeep();
          setQrToken(code.data.trim());
          setScanDetectedMessage(`✓ QR dari Gambar Terbaca: ${code.data.trim()}`);
        } else {
          setCameraError('Tidak ditemukan matriks QR Code yang valid pada gambar tersebut.');
        }
      }
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Bar Tombol Kamera Live & Scan dari File Gambar QR */}
      <div className="rounded-button border-2 border-gold/50 bg-navy-dark text-ivory p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gold-light">
              📷 Pemindai Kamera QR Code Live (HP / Tablet / Webcam)
            </p>
            <p className="text-[11px] text-ivory/75">
              Buka kamera untuk memindai QR tamu secara langsung, atau pilih file gambar QR.
            </p>
          </div>

          {!cameraActive ? (
            <button
              type="button"
              onClick={() => void startCamera(facingMode)}
              className="min-h-[42px] rounded-button bg-gold px-4 py-2 text-xs font-bold uppercase tracking-wider text-navy-dark shadow hover:bg-gold-light transition"
            >
              📷 Buka Kamera Scanner Sekarang
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = facingMode === 'environment' ? 'user' : 'environment';
                  setFacingMode(next);
                  void startCamera(next);
                }}
                className="min-h-[38px] rounded-button border border-gold/40 bg-navy px-3 py-1.5 text-xs font-semibold text-gold-light"
              >
                🔄 Balik Kamera (Depan/Belakang)
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="min-h-[38px] rounded-button bg-danger px-3 py-1.5 text-xs font-bold text-white"
              >
                ✕ Tutup Kamera
              </button>
            </div>
          )}
        </div>

        {/* Viewfinder Video Live */}
        {cameraActive && (
          <div className="relative rounded-button overflow-hidden border-2 border-gold bg-black aspect-video max-h-[300px] mx-auto flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-gold-light rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold-light bg-navy-dark/80 px-2 py-0.5 rounded">
                  Arahkan QR ke Kotak Ini
                </span>
              </div>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* Opsi Scan dari File Gambar PNG QR (Sangat berguna saat testing di Laptop/PC) */}
        <div className="pt-2 border-t border-gold/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-ivory/90">
            <input
              type="checkbox"
              checked={autoSubmitOnScan}
              onChange={(e) => setAutoSubmitOnScan(e.target.checked)}
              className="h-4 w-4 rounded border-gold text-gold"
            />
            <span>Otomatis Check-in begitu QR terbaca kamera</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-button bg-ivory/10 hover:bg-ivory/20 border border-gold/30 px-3 py-1.5 text-[11px] font-semibold text-gold-light transition">
            <span>🖼️ Scan dari File Gambar/Foto QR</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageFileScan}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {cameraError && (
        <div className="rounded-button border border-danger/40 bg-danger/10 p-3 text-xs font-semibold text-danger">
          ⚠ {cameraError}
        </div>
      )}

      {scanDetectedMessage && (
        <div className="rounded-button border border-success/40 bg-success/15 p-3 text-xs font-bold text-success">
          {scanDetectedMessage}
        </div>
      )}

      {/* Form Konfirmasi Check-in */}
      <form
        ref={formRef}
        action={`/api/events/${eventId}/checkins`}
        method="POST"
        className="space-y-4 rounded-button border border-border bg-ivory/60 p-4"
      >
        <input type="hidden" name="method" value="qr" />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

        <div>
          <label className="block text-xs font-bold text-navy mb-1">
            Kode Token QR Tamu (Terisi Otomatis Saat Kamera Membaca QR / Ketik Manual)
          </label>
          <input
            name="groupIdOrQrToken"
            type="text"
            required
            value={qrToken}
            onChange={(e) => setQrToken(e.target.value)}
            placeholder="Arahkan kamera ke QR atau ketik kode QR..."
            className="w-full min-h-[44px] rounded-button border border-border bg-surface px-3.5 py-2 font-mono text-sm font-bold text-navy"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-navy mb-1">
            Jumlah Orang yang Hadir Saat Ini (Mendukung Kedatangan Parsial Keluarga)
          </label>
          <input
            name="deltaAttendees"
            type="number"
            min={1}
            max={20}
            required
            value={deltaAttendees}
            onChange={(e) => setDeltaAttendees(Number(e.target.value) || 1)}
            className="w-full min-h-[44px] rounded-button border border-border bg-surface px-3.5 py-2 text-sm font-bold text-navy tabular-nums"
          />
        </div>

        <button
          type="submit"
          className="w-full min-h-[48px] rounded-button bg-navy border border-gold/50 px-5 py-3 text-xs font-bold uppercase tracking-widest text-gold-light hover:bg-navy-light transition shadow"
        >
          ✓ Konfirmasi Kehadiran QR Sekarang
        </button>
      </form>
    </div>
  );
}

