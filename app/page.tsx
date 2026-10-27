import Link from 'next/link';
import { BRAND_NAME, BRAND_SHORT_NAME, BRAND_TAGLINE } from '@/lib/types';
import { PLANS_CATALOG } from '@/lib/plans';
import { Badge } from '@/components/ui/primitives';
import { getCurrentUserServer } from '@/lib/auth/session';

export default async function LandingPage() {
  const currentUser = await getCurrentUserServer();
  const plans = [PLANS_CATALOG.free, PLANS_CATALOG.pro, PLANS_CATALOG.pro_plus];

  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-button bg-navy text-gold-light font-serif text-lg font-bold">
              S
            </span>
            <div>
              <p className="font-bold text-navy text-sm sm:text-base leading-tight">
                {BRAND_NAME}
              </p>
              <p className="text-[11px] text-ink/60 hidden sm:block">
                Wedding Guest Management System
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-ink/80">
            <a href="#ekosistem" className="hover:text-navy">
              Ekosistem
            </a>
            <a href="#modul" className="hover:text-navy">
              Fitur Utama
            </a>
            <a href="#simulasi-vip" className="hover:text-navy">
              Simulasi VIP
            </a>
            <a href="#paket" className="hover:text-navy">
              Paket Acara
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <Link
                href="/app/workspaces"
                className="min-h-[42px] inline-flex items-center rounded-button bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-light transition"
              >
                Buka Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="min-h-[42px] inline-flex items-center rounded-button border border-border bg-surface px-4 py-2 text-sm font-semibold text-navy hover:bg-ivory transition"
                >
                  Masuk
                </Link>
                <Link
                  href="/auth/register"
                  className="min-h-[42px] inline-flex items-center rounded-button bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-light transition"
                >
                  Mulai Gratis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <Badge variant="gold" className="mb-4 px-3 py-1 text-xs">
            UNTUK WEDDING ORGANIZER &amp; CALON PENGANTIN
          </Badge>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-navy tracking-tight leading-tight">
            {BRAND_NAME}
          </h1>
          <p className="mt-4 text-lg sm:text-xl font-medium text-gold-dark max-w-3xl mx-auto">
            &ldquo;{BRAND_TAGLINE}&rdquo;
          </p>
          <p className="mt-4 text-sm sm:text-base text-ink/75 max-w-2xl mx-auto leading-relaxed">
            Kelola banyak acara pernikahan dari satu akun Wedding Organizer maupun dashboard khusus
            Calon Pengantin. Dari pembuatan undangan digital, RSVP kuota keluarga, scan QR Code
            anti-ganda di hari-H, layar sambutan VIP terproteksi, hingga rekonsiliasi laporan akhir.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth/register"
              className="min-h-[48px] inline-flex items-center justify-center rounded-button bg-navy px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-light transition"
            >
              Mulai Gratis (Kuota 50 Undangan)
            </Link>
            <a
              href="#paket"
              className="min-h-[48px] inline-flex items-center justify-center rounded-button border border-navy/25 bg-surface px-6 py-3 text-sm font-semibold text-navy hover:bg-ivory transition"
            >
              Lihat Paket Per Acara
            </a>
          </div>
        </div>
      </section>

      {/* 1. Ekosistem Aplikasi */}
      <section id="ekosistem" className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-gold-dark">
            Ekosistem Terintegrasi
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-navy">
            Semua Data Saling Terhubung Tanpa Input Ulang
          </h2>
          <p className="mt-2 text-sm text-ink/70">
            Dirancang khusus untuk menjawab kebutuhan lapangan Wedding Organizer sekaligus
            transparansi real-time bagi calon pengantin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              title: 'Dashboard WO & Pengantin',
              desc: 'Kelola banyak klien, acara, daftar tamu, dan pembagian peran petugas dari satu ruang kerja terisolasi.',
            },
            {
              step: '02',
              title: 'Undangan Digital & RSVP Kuota',
              desc: 'Tautan undangan unik per grup/keluarga dengan batas kuota tamu yang akurat serta QR Code kriptografis.',
            },
            {
              step: '03',
              title: 'Penerimaan Tamu & Scan QR Hari-H',
              desc: 'Transaksi check-in atomik (mendukung kedatangan parsial keluarga), pencarian manual, dan pencegahan scan ganda.',
            },
            {
              step: '04',
              title: 'Layar Sambutan & Koordinasi VIP',
              desc: 'Layar TV/LED dengan kontrol privasi ketat (opt-in) terpisah dari notifikasi penjemputan internal tim usher.',
            },
            {
              step: '05',
              title: 'Koreksi Supervisor Ter-audit',
              desc: 'Revisi kesalahan input jumlah tamu oleh supervisor wajib menyertakan alasan pada buku besar (immutable ledger).',
            },
            {
              step: '06',
              title: 'Laporan Rekonsiliasi Klien & WO',
              desc: 'Perbedaan metrik jelas antara jumlah undangan, kuota orang, rencana RSVP, dan kehadiran aktual siap ekspor.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-card border border-border bg-surface p-6 shadow-sm"
            >
              <span className="inline-block text-xs font-bold text-gold-dark bg-gold/15 px-2.5 py-1 rounded-md">
                MODUL {item.step}
              </span>
              <h3 className="mt-3 text-lg font-bold text-navy">{item.title}</h3>
              <p className="mt-2 text-sm text-ink/70 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Simulasi Fitur VIP */}
      <section id="simulasi-vip" className="py-16 bg-navy text-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <Badge variant="gold" className="mb-3">
              SIMULASI HARI-H &amp; PRIVASI TAMU PENTING
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Pemisahan Layar Sambutan Publik &amp; Notifikasi Internal Usher
            </h2>
            <p className="mt-2 text-sm text-ivory/80">
              Tidak semua tamu VVIP ingin namanya ditampilkan secara terbuka di layar gedung.{' '}
              {BRAND_SHORT_NAME} memisahkan izin layar publik (default nonaktif) dari koordinasi
              penjemputan tim internal WO.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Kartu 1: Layar Scanner Petugas */}
            <div className="rounded-card bg-surface text-ink p-6 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-ink/60">
                  1. Petugas Melakukan Scan
                </span>
                <Badge variant="success">QR VALID</Badge>
              </div>
              <div className="mt-4 p-4 rounded-button bg-ivory border border-border">
                <p className="text-lg font-bold text-navy">Bapak Budi Santoso</p>
                <p className="text-xs font-semibold text-gold-dark mt-0.5">
                  VVIP · Kapasitas 2 Orang · Meja VVIP 01
                </p>
                <div className="mt-4 flex items-center justify-between text-xs border-t border-border pt-3">
                  <span>Status Kehadiran:</span>
                  <span className="font-bold text-success">Check-in Berhasil (2 Hadir)</span>
                </div>
              </div>
            </div>

            {/* Kartu 2: Layar Sambutan TV */}
            <div className="rounded-card bg-navy-dark text-ivory p-6 border border-gold/40 flex flex-col justify-between text-center">
              <p className="text-[11px] uppercase tracking-widest text-gold-light">
                2. Contoh Tampilan Layar Sambutan (Jika Diizinkan)
              </p>
              <div className="my-6">
                <p className="text-xs tracking-widest uppercase text-ivory/70">THE WEDDING OF</p>
                <p className="font-serif text-2xl font-bold text-gold-light mt-1">
                  Andi &amp; Putri
                </p>
                <p className="text-xs text-ivory/80 mt-4">Selamat Datang</p>
                <p className="text-xl font-bold text-white mt-1">Bapak Budi Santoso</p>
                <p className="text-xs text-gold-light mt-1">
                  Tamu Kehormatan · Silakan menuju Meja VVIP 01
                </p>
              </div>
              <p className="text-[11px] text-ivory/60">
                *Hanya tampil apabila opsi <code>allowed_public_display</code> diaktifkan.
              </p>
            </div>

            {/* Kartu 3: Notifikasi Internal Usher */}
            <div className="rounded-card bg-surface text-ink p-6 border border-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-ink/60">
                    3. Notifikasi Internal Tim WO
                  </span>
                  <Badge variant="gold">Pro Plus</Badge>
                </div>
                <div className="mt-4 rounded-button bg-gold/10 border border-gold/30 p-4">
                  <p className="text-xs font-bold text-navy uppercase">Peringatan Penjemputan</p>
                  <p className="mt-1.5 text-sm text-ink leading-relaxed">
                    &ldquo;Tamu VVIP (<strong>Bapak Budi Santoso</strong> — Meja VVIP 01) telah
                    hadir di meja registrasi. Tim usher harap melakukan penjemputan di pintu
                    utama.&rdquo;
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-ink/60">
                Tetap berjalan secara privat untuk tim usher meskipun sambutan layar publik
                dinonaktifkan demi privasi tamu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Paket Harga Per Acara */}
      <section id="paket" className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-gold-dark">
            Model Per Acara (Bukan Langganan Bulanan Wajib)
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-navy">
            Pilihan Paket Free, Pro, dan Pro Plus
          </h2>
          <p className="mt-2 text-sm text-ink/70">
            Kuota dihitung per acara. Aktivasi paket berbayar pada tahap ini diverifikasi manual
            oleh Admin Platform (tanpa simulasi pembayaran palsu).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isHighlighted = plan.code === 'pro';
            return (
              <div
                key={plan.code}
                className={`rounded-card p-6 flex flex-col justify-between border ${
                  isHighlighted
                    ? 'border-gold bg-surface shadow-md ring-1 ring-gold/40'
                    : 'border-border bg-surface shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-navy">{plan.displayName}</h3>
                    {isHighlighted && <Badge variant="gold">Populer</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-ink/60">{plan.subtitle}</p>
                  <p className="mt-4 text-3xl font-bold text-navy tabular-nums">
                    {plan.priceLabel}
                    <span className="text-xs font-normal text-ink/60"> / acara</span>
                  </p>

                  <ul className="mt-6 space-y-2.5 text-sm text-ink/85 border-t border-border pt-4">
                    <li className="flex justify-between">
                      <span>Maks. undangan unik</span>
                      <strong className="tabular-nums">
                        {plan.limits.maxInvitationGroups.toLocaleString('id-ID')} grup
                      </strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Petugas scan aktif</span>
                      <strong className="tabular-nums">
                        {plan.limits.maxActiveScanners} perangkat
                      </strong>
                    </li>
                    <li className="flex justify-between">
                      <span>QR unik &amp; cari manual</span>
                      <strong className="text-success">Ya</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Import Excel (CSV/XLSX)</span>
                      <strong>{plan.features.importExcel ? 'Ya' : '—'}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Undangan digital</span>
                      <strong>{plan.features.digitalInvitationLevel}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Layar sambutan TV</span>
                      <strong>{plan.features.welcomeDisplay ? 'Ya' : '—'}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Notifikasi VIP/VVIP</span>
                      <strong>{plan.features.vipNotification ? 'Ya (Segera hadir)' : '—'}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Ekspor laporan</span>
                      <strong>{plan.features.exportLevel}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Branding WO</span>
                      <strong>{plan.features.brandingLabel}</strong>
                    </li>
                  </ul>
                </div>

                <div className="mt-8">
                  <Link
                    href="/auth/register"
                    className={`w-full min-h-[44px] inline-flex items-center justify-center rounded-button px-4 py-2.5 text-sm font-semibold transition ${
                      isHighlighted
                        ? 'bg-navy text-white hover:bg-navy-light'
                        : 'border border-navy text-navy hover:bg-ivory'
                    }`}
                  >
                    {plan.code === 'free' ? 'Mulai Dengan Paket Free' : `Uji Paket ${plan.displayName}`}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-surface py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink/60">
          <div>
            <strong className="text-navy">{BRAND_NAME}</strong> — {BRAND_TAGLINE}
          </div>
          <div>
            Kepatuhan Pelindungan Data Pribadi (UU No. 27 Tahun 2022) · Isolasi Multi-Tenant Aktif
          </div>
        </div>
      </footer>
    </div>
  );
}

