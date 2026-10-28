'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BRAND_NAME } from '@/lib/types';

export default function TvPairingPortalPage() {
  const [pairingCode, setPairingCode] = useState('');
  const router = useRouter();

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = pairingCode.trim().replace(/[\s-]/g, '');
    if (!cleaned) return;
    router.push(`/display/${encodeURIComponent(cleaned)}`);
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-navy-dark via-navy to-navy-dark text-ivory px-4 py-12">
      <div className="w-full max-w-lg rounded-card border-2 border-gold/50 bg-navy/90 p-8 sm:p-10 shadow-2xl text-center space-y-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 border border-gold text-gold-light text-2xl">
          📺
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-light">
            PORTAL KONEKSI MULTIMEDIA BALLROOM &amp; PANGGUNG
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-white">
            Hubungkan Smart TV / Videotron LED Panggung
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-ivory/75 leading-relaxed">
            Buka halaman ini pada <strong>Browser Smart TV</strong> atau{' '}
            <strong>Laptop Operator Multimedia/LED Panggung</strong> (yang terhubung kabel HDMI ke
            Layar Panggung), lalu masukkan <strong>6-Digit Kode Pairing TV</strong> dari Dashboard
            WO.
          </p>
        </div>

        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label
              htmlFor="pairingCode"
              className="block text-xs font-bold uppercase tracking-widest text-gold-light mb-2"
            >
              Masukkan 6-Digit Kode Pairing TV (Atau ID Acara)
            </label>
            <input
              id="pairingCode"
              type="text"
              required
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value)}
              placeholder="Contoh: 849201"
              className="w-full min-h-[56px] rounded-button border-2 border-gold bg-navy-dark px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.25em] text-gold-light placeholder:text-ivory/30 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[52px] rounded-button bg-gold px-6 py-3 text-xs sm:text-sm font-bold uppercase tracking-widest text-navy-dark shadow-lg hover:bg-gold-light transition"
          >
            📺 Hubungkan Layar TV / LED Panggung Sekarang &rarr;
          </button>
        </form>

        <div className="pt-4 border-t border-gold/25 text-left text-xs text-ivory/70 space-y-1.5">
          <p className="font-bold text-gold-light">
            Cara Kerja Sinkronisasi Lintas Perangkat (Cloud Auto-Sync):
          </p>
          <p>
            1. <strong>HP/Tablet Petugas di Pintu Masuk</strong> men-scan QR Code tamu undangan.
          </p>
          <p>
            2. Data kehadiran dikirim melalui internet ke server pusat <strong>{BRAND_NAME}</strong>.
          </p>
          <p>
            3. <strong>Smart TV / Laptop Operator LED di Panggung</strong> yang membuka halaman ini
            otomatis menangkap sinyal tersebut dalam <strong>2,5 detik</strong> dan menampilkan nama
            tamu di layar panggung!
          </p>
        </div>

        <div className="pt-2">
          <Link href="/" className="text-xs text-gold-light hover:underline">
            &larr; Kembali ke Beranda Utama
          </Link>
        </div>
      </div>
    </div>
  );
}

