import Link from 'next/link';
import { BRAND_NAME, BRAND_SHORT_NAME, BRAND_TAGLINE } from '@/lib/types';
import { getAddOnsCatalog, getPlansCatalog, getPostEventRetentionConfig } from '@/lib/plans';
import { Badge } from '@/components/ui/primitives';
import { getCurrentUserServer } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const currentUser = await getCurrentUserServer();
  const catalog = getPlansCatalog();
  const addOns = getAddOnsCatalog();
  const retention = getPostEventRetentionConfig();
  const plans = [catalog.free, catalog.pro, catalog.pro_plus];

  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      {/* Luxury Top Bar (Tanpa menampilkan link Pengaturan Harga Super Admin ke Klien/Publik) */}
      <div className="bg-navy-dark text-gold-light px-4 py-2 text-[11px] tracking-widest uppercase border-b border-gold/25">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>
            ✦ SANSTECH HOSPITALITY &amp; ROYAL WEDDING SUITE · ENTERPRISE MULTI-TENANT SECURITY
          </span>
          <div className="flex items-center gap-4">
            <Link href="/panduan" className="hover:text-white underline underline-offset-4">
              Buku Pedoman Operasional Lengkap (Cetak PDF)
            </Link>
            {currentUser?.isPlatformAdmin && (
              <Link href="/admin" className="hover:text-white underline underline-offset-4">
                Panel Super Admin (Khusus Pemilik Sistem)
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-gold/25 bg-surface/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-button bg-gradient-to-br from-navy via-navy-light to-navy-dark text-gold-light border border-gold/50 font-serif text-2xl font-bold shadow-sm">
              S
            </span>
            <div>
              <p className="font-serif font-bold text-navy text-lg sm:text-xl tracking-wide leading-tight">
                {BRAND_NAME}
              </p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-semibold">
                Luxury Wedding Guest Management System
              </p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-ink/75">
            <a href="#ekosistem" className="hover:text-navy transition">
              Ekosistem
            </a>
            <a href="#simulasi-vip" className="hover:text-navy transition">
              Protokol VVIP
            </a>
            <a href="#paket" className="hover:text-navy transition">
              Investasi Paket
            </a>
            <Link href="/panduan" className="text-gold-dark hover:text-navy transition">
              Buku Pedoman WO
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <Link
                href="/app/workspaces"
                className="min-h-[44px] inline-flex items-center rounded-button bg-navy border border-gold/40 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-light hover:bg-navy-light transition shadow-sm"
              >
                Buka Suite Dashboard &rarr;
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="min-h-[44px] inline-flex items-center rounded-button border border-gold/40 bg-surface px-4 py-2 text-xs font-bold uppercase tracking-wider text-navy hover:bg-ivory transition"
                >
                  Masuk / Simulasi
                </Link>
                <Link
                  href="/auth/register"
                  className="min-h-[44px] inline-flex items-center rounded-button bg-navy border border-gold/40 px-5 py-2 text-xs font-bold uppercase tracking-wider text-gold-light hover:bg-navy-light transition shadow-sm"
                >
                  Daftar Akun
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Luxury Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-dark via-navy to-navy-light text-ivory py-20 sm:py-28 border-b-2 border-gold/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-light mb-6">
            ✦ DIRANCANG UNTUK WEDDING ORGANIZER PROFESIONAL &amp; PASANGAN EKSKLUSIF
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl font-bold text-white tracking-wide leading-tight">
            {BRAND_NAME}
          </h1>

          <p className="mt-5 font-serif italic text-xl sm:text-2xl text-gold-light max-w-3xl mx-auto">
            &ldquo;{BRAND_TAGLINE}&rdquo;
          </p>

          <p className="mt-5 text-sm sm:text-base text-ivory/80 max-w-2xl mx-auto leading-relaxed">
            Standar baru penerimaan tamu ballroom kelas atas: undangan digital ber-token
            kriptografis, konfirmasi RSVP kuota keluarga, pemindaian QR anti-bentrok di Hari-H,
            layar sambutan VVIP dengan proteksi privasi, hingga audit rekonsiliasi pasca-acara.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth/login"
              className="min-h-[50px] inline-flex items-center justify-center rounded-button bg-gold px-7 py-3 text-xs font-bold uppercase tracking-widest text-navy-dark shadow-lg hover:bg-gold-light transition"
            >
              Uji Coba Langsung (Dashboard WO &amp; Pengantin)
            </Link>
            <Link
              href="/panduan"
              className="min-h-[50px] inline-flex items-center justify-center rounded-button border border-gold/50 bg-navy-dark/60 px-7 py-3 text-xs font-bold uppercase tracking-widest text-gold-light hover:bg-navy-dark transition"
            >
              🖨️ Buka &amp; Cetak Buku Pedoman Penggunaan
            </Link>
          </div>
        </div>
      </section>

      {/* 1. Enam Pilar Ekosistem */}
      <section id="ekosistem" className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-dark">
            Arsitektur Terpadu
          </p>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-bold text-navy">
            Enam Modul Presisi Dalam Satu Ekosistem
          </h2>
          <p className="mt-3 text-sm text-ink/70">
            Seluruh aliran data dari meja persiapan Wedding Organizer, konfirmasi pengantin, hingga
            gerbang registrasi ballroom terhubung secara real-time tanpa input ulang.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {[
            {
              step: 'I',
              title: 'Multi-Workspace WO & Pengantin',
              desc: 'Satu akun WO mengelola puluhan pernikahan klien sekaligus; pasangan pengantin memperoleh akses eksklusif hanya ke acara miliknya.',
            },
            {
              step: 'II',
              title: 'Undangan Digital & Kuota Keluarga',
              desc: 'Setiap undangan mewakili 1 grup/keluarga dengan batas kuota orang yang tegas serta token QR check-in yang terpisah dari tautan publik.',
            },
            {
              step: 'III',
              title: 'Smart Check-in & Kedatangan Parsial',
              desc: 'Mendukung keluarga yang datang bertahap (mis. 2 hadir pagi, 2 hadir malam) dengan penguncian transaksi database atomik anti scan ganda.',
            },
            {
              step: 'IV',
              title: 'Protokol VVIP & Layar Sambutan',
              desc: 'Pisahkan sambutan layar TV publik (opt-in) dari peringatan penjemputan privat untuk tim Usher VIP di lapangan.',
            },
            {
              step: 'V',
              title: 'Koreksi Supervisor & Reset Testing',
              desc: 'Dilengkapi tombol Hapus/Reset Data Simulasi 1-Klik sebelum acara dimulai, serta koreksi kehadiran oleh Supervisor yang tercatat di Audit Log.',
            },
            {
              step: 'VI',
              title: 'Laporan Eksekutif & Masa Aktif Terkendali',
              desc: `Setelah acara selesai, akun pengantin tetap dapat mengunduh laporan selama ${retention.gracePeriodDaysAfterEvent} hari sebelum dikunci otomatis demi keamanan data.`,
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-card border border-gold/30 bg-surface p-7 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-serif text-lg font-bold text-gold-dark bg-gold/10 border border-gold/30 px-3 py-0.5 rounded">
                    PILAR {item.step}
                  </span>
                  <span className="text-[11px] uppercase tracking-widest text-ink/40 font-semibold">
                    SANSTECH SUITE
                  </span>
                </div>
                <h3 className="mt-4 font-serif text-xl font-bold text-navy">{item.title}</h3>
                <p className="mt-2.5 text-sm text-ink/75 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Simulasi VIP */}
      <section id="simulasi-vip" className="py-20 bg-navy-dark text-ivory border-y border-gold/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-12 max-w-3xl">
            <Badge variant="gold" className="mb-3">
              SIMULASI PROTOKOL TAMU KEHORMATAN (VVIP)
            </Badge>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
              Koordinasi Penjemputan Tanpa Mengorbankan Privasi Tamu Penting
            </h2>
            <p className="mt-3 text-sm text-ivory/80 leading-relaxed">
              Pejabat atau tokoh penting sering kali membutuhkan penjemputan khusus oleh Usher namun
              tidak berkenan namanya terpampang di layar publik gedung. {BRAND_SHORT_NAME}{' '}
              memberikan kendali penuh per tamu.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-card bg-surface text-ink p-6 border border-gold/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
                  1. Layar Petugas Scanner
                </span>
                <Badge variant="success">QR TERVERIFIKASI</Badge>
              </div>
              <div className="mt-4 p-5 rounded-button bg-ivory border border-gold/30">
                <p className="font-serif text-xl font-bold text-navy">Bapak Budi Santoso &amp; Ibu</p>
                <p className="text-xs font-semibold text-gold-dark mt-1">
                  KATEGORI VVIP · KUOTA 2 ORANG · MEJA VVIP 01
                </p>
                <div className="mt-4 flex items-center justify-between text-xs border-t border-border pt-3">
                  <span>Status Buku Besar:</span>
                  <span className="font-bold text-success">+2 Hadir Tercatat</span>
                </div>
              </div>
            </div>

            <div className="rounded-card bg-gradient-to-b from-navy to-navy-dark text-ivory p-6 border-2 border-gold/50 flex flex-col justify-between text-center shadow-lg">
              <p className="text-[11px] uppercase tracking-[0.2em] text-gold-light">
                2. Layar Sambutan Ballroom (16:9)
              </p>
              <div className="my-6">
                <p className="text-[11px] tracking-[0.3em] uppercase text-ivory/70">
                  THE ROYAL WEDDING OF
                </p>
                <p className="font-serif text-3xl font-bold text-gold-light mt-1">
                  Andi &amp; Putri
                </p>
                <div className="my-3 h-px w-24 bg-gold/40 mx-auto" />
                <p className="text-xs text-ivory/80">Selamat Datang Kehormatan</p>
                <p className="font-serif text-2xl font-bold text-white mt-1">
                  Bapak Budi Santoso
                </p>
                <p className="text-xs text-gold-light mt-1">
                  Silakan Menuju Meja VVIP 01
                </p>
              </div>
              <p className="text-[11px] text-ivory/60">
                *Otomatis disembunyikan bila tamu berstatus <em>Private VIP</em>.
              </p>
            </div>

            <div className="rounded-card bg-surface text-ink p-6 border border-gold/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
                    3. Notifikasi Privat Usher WO
                  </span>
                  <Badge variant="gold">Royal Grand</Badge>
                </div>
                <div className="mt-4 rounded-button bg-gold/10 border border-gold/40 p-4">
                  <p className="text-xs font-bold text-navy uppercase tracking-wider">
                    🔔 Instruksi Penjemputan Pintu Utama
                  </p>
                  <p className="mt-2 text-sm text-ink leading-relaxed">
                    &ldquo;Tamu VVIP (<strong>Bapak Budi Santoso</strong> — Meja VVIP 01) baru saja
                    check-in. Tim Usher harap mendampingi menuju area VVIP.&rdquo;
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-ink/60">
                Hanya muncul pada perangkat staf Usher &amp; Supervisor yang bertugas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Paket Investasi Per Acara */}
      <section id="paket" className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-dark">
            Investasi Per Acara · Tanpa Langganan Bulanan Wajib
          </p>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-bold text-navy">
            Pilihan Paket Layanan {BRAND_SHORT_NAME}
          </h2>
          <p className="mt-2 text-sm text-ink/70">
            Setiap acara berbayar mencakup kapasitas undangan digital, sistem QR Check-in anti
            ganda, serta masa aktif unduh laporan hingga{' '}
            <strong>H+{retention.gracePeriodDaysAfterEvent} hari</strong> setelah resepsi selesai.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {plans.map((plan) => {
            const isHighlighted = plan.code === 'pro_plus';
            return (
              <div
                key={plan.code}
                className={`rounded-card p-7 flex flex-col justify-between border ${
                  isHighlighted
                    ? 'border-2 border-gold bg-surface shadow-xl ring-1 ring-gold/30'
                    : 'border-gold/30 bg-surface shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-2xl font-bold text-navy">{plan.displayName}</h3>
                    {isHighlighted && <Badge variant="gold">Rekomendasi WO</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-ink/65">{plan.subtitle}</p>
                  <p className="mt-5 font-serif text-3xl sm:text-4xl font-bold text-navy tabular-nums">
                    {plan.priceLabel}
                    <span className="font-sans text-xs font-normal text-ink/60"> / acara</span>
                  </p>

                  <ul className="mt-6 space-y-2.5 text-xs sm:text-sm text-ink/85 border-t border-border pt-5">
                    <li className="flex justify-between">
                      <span>Kapasitas Grup Undangan</span>
                      <strong className="tabular-nums text-navy">
                        {plan.limits.maxInvitationGroups.toLocaleString('id-ID')} grup
                      </strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Perangkat Scanner Aktif</span>
                      <strong className="tabular-nums text-navy">
                        {plan.limits.maxActiveScanners} perangkat
                      </strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Masa Aktif Akun Pasca-Acara</span>
                      <strong className="text-navy">H+{plan.postEventGraceDays} Hari</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Import Massal CSV / Excel</span>
                      <strong>{plan.features.importExcel ? 'Termasuk' : '—'}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Kelas Undangan Digital</span>
                      <strong>{plan.features.digitalInvitationLevel}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Layar Sambutan Ballroom TV</span>
                      <strong>{plan.features.welcomeDisplay ? 'Termasuk' : '—'}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Protokol Usher VVIP</span>
                      <strong>{plan.features.vipNotification ? 'Termasuk' : '—'}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Branding Organisasi</span>
                      <strong>{plan.features.brandingLabel}</strong>
                    </li>
                  </ul>
                </div>

                <div className="mt-8">
                  <Link
                    href="/auth/login"
                    className={`w-full min-h-[46px] inline-flex items-center justify-center rounded-button px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                      isHighlighted
                        ? 'bg-navy text-gold-light border border-gold/50 hover:bg-navy-light'
                        : 'border border-navy text-navy hover:bg-ivory'
                    }`}
                  >
                    Pilih &amp; Uji Paket Ini
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Katalog Layanan Tambahan (Add-Ons) */}
        <div id="addons" className="mt-20 pt-16 border-t border-gold/30">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge variant="gold" className="mb-3">
              LAYANAN TAMBAHAN &amp; DUKUNGAN OPERASIONAL HARI-H (ADD-ONS)
            </Badge>
            <h3 className="font-serif text-3xl sm:text-4xl font-bold text-navy">
              Katalog Add-On Fleksibel Sesuai Kebutuhan Acara
            </h3>
            <p className="mt-2 text-sm text-ink/70">
              Pisahkan biaya lisensi software dari layanan perangkat keras, kru lapangan, maupun
              tambahan kuota agar klien hanya membayar yang benar-benar dibutuhkan:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {addOns.map((addon) => (
              <div
                key={addon.code}
                className="rounded-card border border-gold/35 bg-surface p-6 shadow-sm flex flex-col justify-between hover:border-gold transition"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline" className="border-gold/40 text-gold-dark">
                      {addon.category}
                    </Badge>
                    <span className="font-serif text-2xl font-bold text-navy tabular-nums">
                      {addon.priceFormatted}{' '}
                      <span className="font-sans text-[11px] font-normal text-ink/55">
                        ({addon.unitLabel})
                      </span>
                    </span>
                  </div>
                  <h4 className="mt-3 font-serif text-xl font-bold text-navy">{addon.name}</h4>
                  <p className="mt-1.5 text-xs sm:text-sm text-ink/75 leading-relaxed">
                    {addon.description}
                  </p>
                </div>
                <p className="mt-4 pt-3 border-t border-border text-[11px] text-ink/60">
                  <strong>Ketentuan Layanan:</strong> {addon.deliverableNote}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-gold/30 bg-navy-dark text-ivory/75 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            <strong className="font-serif text-base text-gold-light">{BRAND_NAME}</strong>
            <p className="mt-0.5 text-ivory/60">{BRAND_TAGLINE}</p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/panduan" className="text-gold-light hover:underline">
              Buku Pedoman Lengkap (Cetak PDF)
            </Link>
            <span>UU Pelindungan Data Pribadi No. 27/2022</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
