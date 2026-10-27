import Link from 'next/link';
import { BRAND_NAME as BRAND_FULL_NAME, BRAND_TAGLINE } from '@/lib/types';
import { getAddOnsCatalog, getPlansCatalog, getPostEventRetentionConfig } from '@/lib/plans';
import { PrintHandbookButton } from '@/components/app/print-handbook-button';

export const dynamic = 'force-dynamic';

export default function PrintableOperationalHandbookPage() {
  const catalog = getPlansCatalog();
  const addOnsCatalog = getAddOnsCatalog();
  const retention = getPostEventRetentionConfig();

  return (
    <div className="min-h-screen bg-ivory text-ink py-8 px-4 sm:px-8">
      {/* Bar Navigasi Layar (Tidak Ikut Tercetak Saat Print/PDF) */}
      <div className="no-print max-w-5xl mx-auto mb-8 rounded-card border border-gold/40 bg-surface p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-gold/15 border border-gold/40 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest text-gold-dark">
            EDISI LENGKAP 12 BAB (15–20 HALAMAN CETAK A4)
          </span>
          <h1 className="mt-1 font-serif text-xl font-bold text-navy">
            Buku Pedoman Operasional Resmi &amp; SOP Lapangan — {BRAND_FULL_NAME}
          </h1>
          <p className="text-xs text-ink/70">
            Dokumen ini dirancang khusus dengan pemisah halaman otomatis (<em>Page Break A4</em>).
            Klik tombol di kanan, pilih <strong>&ldquo;Save as PDF&rdquo;</strong> atau printer
            fisik untuk mencetak buku panduan tim WO, Resepsionis, Usher, dan Pengantin.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/app/workspaces"
            className="min-h-[44px] inline-flex items-center rounded-button border border-border bg-ivory px-4 py-2 text-xs font-semibold text-navy hover:bg-gold/10 transition"
          >
            &larr; Kembali ke Dashboard
          </Link>
          <PrintHandbookButton />
        </div>
      </div>

      {/* =====================================================================
          ISI BUKU PEDOMAN (SIAP CETAK 15-20 HALAMAN A4)
          ===================================================================== */}
      <article className="max-w-5xl mx-auto rounded-card border-2 border-gold/40 bg-surface p-8 sm:p-14 shadow-xl space-y-12 leading-relaxed">
        {/* HALAMAN SAMPUL (COVER PAGE) & DAFTAR ISI */}
        <header className="border-b-2 border-gold pb-10 text-center space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-gold-dark">
            STANDARD OPERATING PROCEDURE (SOP) &amp; BUKU PEDOMAN PENGGUNAAN SISTEM
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-navy leading-tight">
            {BRAND_FULL_NAME}
          </h1>
          <p className="font-serif italic text-xl text-ink/80 max-w-3xl mx-auto">
            &ldquo;{BRAND_TAGLINE}&rdquo;
          </p>
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-ink/70">
            <span className="rounded-button border border-gold/40 bg-ivory px-3 py-1 font-semibold">
              Versi Dokumen: 2.0 Enterprise Royal Edition
            </span>
            <span className="rounded-button border border-gold/40 bg-ivory px-3 py-1 font-semibold">
              Peruntukan: Pemilik WO, Koordinator Lapangan, Resepsionis, Usher VIP &amp; Pengantin
            </span>
          </div>

          {/* Daftar Isi Lengkap 12 Bab */}
          <div className="mt-8 text-left rounded-card border border-gold/30 bg-ivory/70 p-6">
            <h2 className="font-serif text-xl font-bold text-navy border-b border-gold/30 pb-2 mb-4">
              Daftar Isi Buku Pedoman Operasional (12 Bab Lengkap)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-ink/85">
              <div>
                <strong>Bab 1:</strong> Gambaran Ekosistem, Arsitektur &amp; Spesifikasi Perangkat
                Hari-H
              </div>
              <div>
                <strong>Bab 2:</strong> Matriks 10 Peran Pengguna (Role) &amp; Keamanan Multi-Tenant
              </div>
              <div>
                <strong>Bab 3:</strong> Panduan Persiapan Awal (H-30): Workspace WO vs Pengantin
              </div>
              <div>
                <strong>Bab 4:</strong> Manajemen Tamu, Rumus Kuota Keluarga &amp; Format Import
                CSV/Excel
              </div>
              <div>
                <strong>Bab 5:</strong> Undangan Digital, Matriks QR Code Asli &amp; Rotasi Token
                Bocor
              </div>
              <div>
                <strong>Bab 6:</strong> SOP Meja Registrasi Hari-H: Scan QR, Tamu Parsial &amp; Cari
                Manual
              </div>
              <div>
                <strong>Bab 7:</strong> SOP Koreksi Kehadiran oleh Supervisor &amp; Audit Buku Besar
              </div>
              <div>
                <strong>Bab 8:</strong> Panduan Setting Layar TV Ballroom Otomatis (Auto-Sync 2,5
                Detik)
              </div>
              <div>
                <strong>Bab 9:</strong> Protokol Penyambutan Tamu VVIP, Privasi Incognito &amp; Tugas
                Usher
              </div>
              <div>
                <strong>Bab 10:</strong> Reset Data Simulasi Testing, Laporan CSV &amp; Masa Aktif
                H+{retention.gracePeriodDaysAfterEvent} Hari
              </div>
              <div>
                <strong>Bab 11:</strong> Katalog Paket, 10 Layanan Add-On &amp; Arsitektur Server
                Cloud
              </div>
              <div>
                <strong>Bab 12:</strong> Lembar Checklist Fisik Kesiapan Hari-H (Untuk Dicentang
                Kru)
              </div>
            </div>
          </div>
        </header>

        {/* ===================================================================
            BAB 1: GAMBARAN EKOSISTEM & SPESIFIKASI PERANGKAT
            =================================================================== */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-gold/30 pb-2">
            <span className="rounded bg-navy px-2.5 py-1 text-xs font-bold text-gold-light">
              BAB 01
            </span>
            <h2 className="font-serif text-2xl font-bold text-navy">
              Gambaran Ekosistem Aplikasi &amp; Spesifikasi Perangkat Hari-H
            </h2>
          </div>
          <p className="text-sm text-ink/85">
            <strong>{BRAND_FULL_NAME}</strong> bukan sekadar buku tamu digital biasa, melainkan
            ekosistem terpadu yang menghubungkan 6 titik krusial dalam satu basis data waktu nyata
            (<em>Real-Time Single Source of Truth</em>):
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-xs sm:text-sm text-ink/85">
            <li>
              <strong>Dashboard Wedding Organizer (Multi-Acara):</strong> Satu akun WO dapat
              mengelola puluhan klien pernikahan sekaligus tanpa risiko data tamu tercampur.
            </li>
            <li>
              <strong>Workspace Mandiri Pasangan Pengantin:</strong> Pasangan pengantin juga dapat
              mendaftar langsung atau diundang ke dalam acara mereka untuk memantau RSVP dan laporan
              tanpa bisa mengintip acara klien WO lainnya.
            </li>
            <li>
              <strong>Generator Undangan Digital &amp; QR Code Unik:</strong> Setiap grup tamu
              mendapatkan tautan undangan publik (untuk mengisi RSVP) dan matriks QR Code 2D standar
              ISO/IEC 18004 yang berbeda dari token tautan publik.
            </li>
            <li>
              <strong>Meja Penerimaan Tamu (Smart Check-in Scanner):</strong> Mendukung pemindaian
              kamera HP/Tablet, pencarian nama manual jika tamu lupa membawa QR, serta pencatatan
              kedatangan keluarga secara bertahap (parsial).
            </li>
            <li>
              <strong>Layar Sambutan TV / LED Ballroom Otomatis:</strong> Menampilkan sapaan
              kehormatan secara otomatis dalam 2,5 detik setelah QR tamu di-scan di meja depan.
            </li>
            <li>
              <strong>Sistem Peringatan Usher VVIP &amp; Laporan Rekonsiliasi Akhir:</strong>{' '}
              Memisahkan privasi layar publik dari antrean penjemputan internal tim Usher, dilengkapi
              ekspor laporan Excel/CSV pasca-acara.
            </li>
          </ol>

          <div className="mt-4 rounded-button border border-border bg-ivory/70 p-4">
            <h3 className="font-bold text-navy text-sm mb-2">
              Tabel Spesifikasi Perangkat Keras &amp; Jaringan yang Direkomendasikan saat Hari-H:
            </h3>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-surface text-navy">
                  <th className="py-2 px-3">Pos Tugas</th>
                  <th className="py-2 px-3">Perangkat yang Disarankan</th>
                  <th className="py-2 px-3">Kebutuhan Koneksi &amp; Browser</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 px-3 font-semibold">Meja Registrasi (Petugas Scan)</td>
                  <td className="py-2 px-3">
                    Smartphone Android / iPhone atau iPad / Tablet Android dengan kamera belakang
                    minimal 8 MP + Stand Dudukan Tablet.
                  </td>
                  <td className="py-2 px-3">
                    Google Chrome (Android) atau Safari (iOS). Wajib menggunakan Wi-Fi Venue atau
                    Hotspot 4G/5G stabil.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold">Layar Sambutan (Welcome Screen)</td>
                  <td className="py-2 px-3">
                    Smart TV 55&quot;–75&quot; atau Videotron LED Ballroom yang dihubungkan ke 1
                    unit Laptop menggunakan kabel HDMI.
                  </td>
                  <td className="py-2 px-3">
                    Buka halaman <code>/display/[id-acara]</code> di Google Chrome Laptop, tekan{' '}
                    <code>F11</code> untuk mode layar penuh (Full Screen).
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold">Tim Usher Penjemput VVIP</td>
                  <td className="py-2 px-3">
                    Smartphone masing-masing anggota Usher + Earphone/HT untuk koordinasi.
                  </td>
                  <td className="py-2 px-3">
                    Membuka menu <strong>Protokol VIP &amp; Usher</strong> untuk memantau tamu VVIP
                    yang baru saja tiba di meja depan.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold">Koordinator / Supervisor WO</td>
                  <td className="py-2 px-3">Laptop atau Tablet Utama di meja kontrol WO.</td>
                  <td className="py-2 px-3">
                    Memantau <strong>Ringkasan Acara</strong>, melakukan <strong>Koreksi</strong>{' '}
                    jika petugas salah input, dan mengunduh laporan akhir.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ===================================================================
            BAB 2: MATRIKS 10 PERAN (ROLE) & KEAMANAN MULTI-TENANT
            =================================================================== */}
        <section className="space-y-4 print-page-break pt-4">
          <div className="flex items-center gap-3 border-b border-gold/30 pb-2">
            <span className="rounded bg-navy px-2.5 py-1 text-xs font-bold text-gold-light">
              BAB 02
            </span>
            <h2 className="font-serif text-2xl font-bold text-navy">
              Matriks 10 Peran Pengguna (Role) &amp; Keamanan Siber Multi-Tenant
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-ink/85">
            Untuk mencegah kebocoran data pribadi tamu (nomor WhatsApp, jabatan VVIP, catatan meja)
            dan mencegah petugas penerima tamu mengubah data yang bukan wewenangnya, sistem membagi
            hak akses ke dalam 10 peran terpisah yang diverifikasi langsung di sisi server:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs border border-border">
              <thead>
                <tr className="bg-navy text-ivory">
                  <th className="py-2.5 px-3">Nama Peran (Role)</th>
                  <th className="py-2.5 px-3">Siapa yang Menggunakan</th>
                  <th className="py-2.5 px-3">Hak Akses yang Diizinkan</th>
                  <th className="py-2.5 px-3">Batasan Ketat (Dilarang)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-ivory/40">
                <tr>
                  <td className="py-2 px-3 font-bold text-navy">
                    1. Super Admin Platform (<code>platform_admin</code>)
                  </td>
                  <td className="py-2 px-3">Pemilik Bisnis SANSTECH</td>
                  <td className="py-2 px-3">
                    Mengatur harga paket utama, harga 10 Add-On, masa aktif akun pasca-acara, dan
                    mengaktifkan lisensi acara klien di <code>/admin</code>.
                  </td>
                  <td className="py-2 px-3">
                    Menu <code>/admin</code> disembunyikan total dari pengunjung umum, pengantin,
                    maupun WO biasa.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-navy">
                    2. Pemilik WO (<code>wo_owner</code>)
                  </td>
                  <td className="py-2 px-3">Owner / Direktur Wedding Organizer</td>
                  <td className="py-2 px-3">
                    Membuat banyak acara pernikahan, mengelola seluruh tamu, melakukan koreksi,
                    mereset data simulasi, dan mengunduh laporan.
                  </td>
                  <td className="py-2 px-3">
                    Tidak dapat melihat acara milik perusahaan WO lain atau mengubah harga dasar
                    platform.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-navy">
                    3. Manajer Acara WO (<code>wo_manager</code>)
                  </td>
                  <td className="py-2 px-3">Project Manager / Koordinator Lapangan</td>
                  <td className="py-2 px-3">
                    Mengelola daftar tamu, import CSV, scan QR, koreksi buku besar check-in, dan
                    mengatur layar sambutan.
                  </td>
                  <td className="py-2 px-3">
                    Tidak dapat menghapus organisasi WO induk.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-navy">
                    4. Pemilik Akun Pengantin (<code>couple_owner</code>)
                  </td>
                  <td className="py-2 px-3">Mempelai yang mendaftar mandiri</td>
                  <td className="py-2 px-3">
                    Mengelola tamu pernikahan sendiri, membagikan tautan undangan WhatsApp, dan
                    mengunduh laporan akhir.
                  </td>
                  <td className="py-2 px-3">
                    Hanya memiliki akses ke pernikahan miliknya sendiri.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-navy">
                    5. Klien Pengantin Terhubung (<code>client_Collaborator</code>)
                  </td>
                  <td className="py-2 px-3">Mempelai yang diundang oleh WO</td>
                  <td className="py-2 px-3">
                    Menambahkan daftar tamu undangan mereka dan memantau angka RSVP serta kehadiran
                    secara langsung.
                  </td>
                  <td className="py-2 px-3">
                    Terisolasi penuh (<em>Event-Scoped</em>); sama sekali tidak bisa melihat daftar
                    acara klien lain milik WO tersebut.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-navy">
                    6. Supervisor Check-in (<code>checkin_supervisor</code>)
                  </td>
                  <td className="py-2 px-3">Kepala Meja Registrasi</td>
                  <td className="py-2 px-3">
                    Melakukan scan QR, pencarian manual, serta berwenang melakukan{' '}
                    <strong>Koreksi Kehadiran (-1 / +1)</strong> dengan alasan wajib.
                  </td>
                  <td className="py-2 px-3">
                    Setiap koreksi dicatat permanen di Audit Log beserta nama petugasnya.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-navy">
                    7. Petugas Scanner (<code>checkin_staff</code>)
                  </td>
                  <td className="py-2 px-3">Penerima Tamu di Pintu Masuk</td>
                  <td className="py-2 px-3">
                    Hanya dapat memindai QR, mencari nama tamu di mesin pencari, dan mencatat tamu
                    masuk.
                  </td>
                  <td className="py-2 px-3">
                    Dilarang menghapus tamu, dilarang mengunduh database Excel klien, dan dilarang
                    mengurangi angka check-in tanpa Supervisor.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-navy">
                    8. Petugas Usher VIP (<code>vip_usher</code>)
                  </td>
                  <td className="py-2 px-3">Tim Penjemput Tamu Kehormatan</td>
                  <td className="py-2 px-3">
                    Melihat daftar antrean tamu VIP/VVIP yang baru saja check-in beserta nomor meja
                    mereka.
                  </td>
                  <td className="py-2 px-3">
                    Tidak dapat mengubah data undangan atau melakukan koreksi check-in.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ===================================================================
            BAB 3: PERSIAPAN AWAL (H-30) — WORKSPACE & PEMBUATAN ACARA
            =================================================================== */}
        <section className="space-y-4 print-page-break pt-4">
          <div className="flex items-center gap-3 border-b border-gold/30 pb-2">
            <span className="rounded bg-navy px-2.5 py-1 text-xs font-bold text-gold-light">
              BAB 03
            </span>
            <h2 className="font-serif text-2xl font-bold text-navy">
              Panduan Persiapan Awal (H-30): Pembuatan Workspace &amp; Acara Baru
            </h2>
          </div>
          <div className="space-y-3 text-xs sm:text-sm text-ink/85">
            <p>
              <strong>Langkah 1 — Pendaftaran Akun (/auth/register):</strong> Buka halaman{' '}
              <code>/auth/register</code>. Pilih salah satu dari 2 jenis ruang kerja:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                <strong>Wedding Organizer (Multi-Acara &amp; Multi-Klien):</strong> Pilih opsi ini
                apabila Anda adalah vendor WO yang menangani banyak pasangan pengantin.
              </li>
              <li>
                <strong>Pasangan Pengantin (Acara Pernikahan Pribadi):</strong> Pilih opsi ini
                apabila Anda adalah mempelai yang mengelola acara pernikahan sendiri.
              </li>
            </ul>

            <p className="pt-2">
              <strong>Langkah 2 — Membuat Acara Pernikahan Baru:</strong>
            </p>
            <ol className="list-decimal pl-6 space-y-1.5">
              <li>
                Setelah masuk ke dashboard, klik menu <strong>Portofolio Semua Acara</strong> di
                panel kiri.
              </li>
              <li>
                Pada formulir <strong>&ldquo;Buat Acara Pernikahan Baru&rdquo;</strong> di sebelah
                kanan, lengkapi:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>
                    <strong>Judul Acara:</strong> Contoh: <em>The Royal Wedding of Andi &amp; Putri</em>
                  </li>
                  <li>
                    <strong>Nama Mempelai Wanita &amp; Pria:</strong> Akan ditampilkan secara
                    elegan pada Kartu Undangan Digital dan Layar Sambutan TV Ballroom.
                  </li>
                  <li>
                    <strong>Tanggal Acara:</strong> Menentukan kapan masa aktif pasca-acara (H+
                    {retention.gracePeriodDaysAfterEvent} hari) mulai dihitung.
                  </li>
                  <li>
                    <strong>Lokasi / Venue Ballroom:</strong> Contoh:{' '}
                    <em>Grand Ballroom Hotel Mulia Senayan, Jakarta</em>.
                  </li>
                  <li>
                    <strong>Paket Acara:</strong> Pilih <em>Free Trial</em> (maksimal 50 grup
                    undangan), <em>Signature Pro</em> (500 grup undangan), atau{' '}
                    <em>Royal Grand / Pro Plus</em> (2.000 grup undangan).
                  </li>
                </ul>
              </li>
              <li>
                Klik tombol <strong>&ldquo;Simpan &amp; Buka Acara&rdquo;</strong>. Anda akan
                langsung diarahkan ke ruang kendali acara tersebut.
              </li>
            </ol>
          </div>
        </section>

        {/* ===================================================================
            BAB 4: MANAJEMEN DAFTAR TAMU, RUMUS KUOTA KELUARGA & IMPORT CSV
            =================================================================== */}
        <section className="space-y-4 print-page-break pt-4">
          <div className="flex items-center gap-3 border-b border-gold/30 pb-2">
            <span className="rounded bg-navy px-2.5 py-1 text-xs font-bold text-gold-light">
              BAB 04
            </span>
            <h2 className="font-serif text-2xl font-bold text-navy">
              Manajemen Daftar Tamu, Rumus Kuota Keluarga &amp; Panduan Import CSV/Excel
            </h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-ink/85">
            <h3 className="font-bold text-navy text-base">
              4.1 Memahami Konsep &ldquo;Grup Undangan&rdquo; vs &ldquo;Kuota Orang (Capacity)&rdquo;
            </h3>
            <p>
              Dalam acara pernikahan nyata, <strong>1 kartu/tautan undangan</strong> sering kali
              ditujukan untuk <strong>suami-istri (2 orang)</strong> atau{' '}
              <strong>satu keluarga besar (4–5 orang)</strong>. Oleh karena itu, sistem menggunakan
              struktur <strong>Grup Undangan (Invitation Group)</strong>:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                Jika Anda mengundang <em>&ldquo;Keluarga Besar Bapak H. Hendra Wijaya&rdquo;</em>{' '}
                yang terdiri dari 4 orang, Anda cukup membuat <strong>1 Grup Undangan</strong> dan
                mengisi kolom <strong>Kuota = 4</strong>.
              </li>
              <li>
                Keempat anggota keluarga tersebut menggunakan <strong>1 QR Code yang sama</strong>.
              </li>
              <li>
                Sistem menjamin secara matematis bahwa jumlah orang yang masuk tidak akan pernah
                bisa melebihi kuota 4 orang tersebut (<code>0 &lt;= Hadir &lt;= Kuota</code>).
              </li>
            </ul>

            <h3 className="font-bold text-navy text-base pt-3">
              4.2 Cara Menambahkan Tamu Satu per Satu (Manual)
            </h3>
            <ol className="list-decimal pl-6 space-y-1">
              <li>
                Buka menu <strong>Daftar Tamu &amp; Import</strong> di panel kiri acara.
              </li>
              <li>
                Pada kotak kiri <strong>&ldquo;Tambah Grup Undangan Baru&rdquo;</strong>, isi:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>
                    <strong>Nama Lengkap / Keluarga Tamu:</strong> Nama ini yang akan muncul di
                    kartu undangan dan layar sambutan TV.
                  </li>
                  <li>
                    <strong>Kategori (Tier):</strong> Pilih <code>REGULER</code>, <code>VIP</code>,
                    atau <code>VVIP</code>.
                  </li>
                  <li>
                    <strong>Kuota Orang (Capacity):</strong> Masukkan angka bulat minimal 1 (contoh:
                    2 untuk berpasangan).
                  </li>
                  <li>
                    <strong>Label Meja:</strong> Contoh: <code>Meja VVIP 01</code> atau{' '}
                    <code>Meja Melati 04</code>.
                  </li>
                  <li>
                    <strong>Centang &ldquo;Izinkan nama tampil di Layar TV Ballroom&rdquo;:</strong>{' '}
                    Wajib dicentang apabila Anda ingin nama tamu tersebut otomatis tampil di layar
                    TV saat QR-nya di-scan. Jangan dicentang apabila tamu tersebut adalah pejabat
                    atau tamu incognito yang tidak ingin namanya dipublikasikan di layar umum.
                  </li>
                </ul>
              </li>
              <li>
                Klik <strong>&ldquo;+ Simpan Grup Tamu &amp; Buat QR Unik&rdquo;</strong>.
              </li>
            </ol>

            <h3 className="font-bold text-navy text-base pt-3">
              4.3 Panduan Format Import Massal CSV / Excel (Untuk Paket Signature Pro &amp; Royal
              Grand)
            </h3>
            <p>
              Apabila Anda memiliki ratusan tamu di Microsoft Excel atau Google Sheets, Anda dapat
              mengimpornya sekaligus dengan format 5 kolom yang dipisahkan tanda koma (<code>,</code>)
              atau titik koma (<code>;</code>):
            </p>
            <div className="rounded-button bg-navy text-gold-light p-4 font-mono text-xs overflow-x-auto">
              Nama Tamu,Kategori,Kuota,Meja,TampilTV
              <br />
              Bapak Dr. Pratama &amp; Ibu,vvip,2,Meja VVIP 02,ya
              <br />
              Keluarga Besar Bapak Suryo,vip,4,Meja VIP 05,ya
              <br />
              Pejabat Negara Incognito,vvip,2,Meja VVIP 01,tidak
              <br />
              Sdr. Kevin Wijaya,reguler,1,Meja Anggrek 03,tidak
            </div>
            <p className="text-xs text-ink/70">
              <strong>Aturan Validasi Otomatis:</strong> Sistem akan memeriksa kuota paket Anda
              terlebih dahulu sebelum menyimpan baris CSV. Jika sisa kuota paket tidak mencukupi,
              sistem akan memberikan pesan peringatan yang jelas tanpa merusak data yang sudah ada.
            </p>
          </div>
        </section>

        {/* ===================================================================
            BAB 5: UNDANGAN DIGITAL, QR CODE ASLI & ROTASI TOKEN BOCOR
            =================================================================== */}
        <section className="space-y-4 print-page-break pt-4">
          <div className="flex items-center gap-3 border-b border-gold/30 pb-2">
            <span className="rounded bg-navy px-2.5 py-1 text-xs font-bold text-gold-light">
              BAB 05
            </span>
            <h2 className="font-serif text-2xl font-bold text-navy">
              Undangan Digital, Matriks QR Code 2D Asli &amp; Prosedur Rotasi Token Bocor
            </h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-ink/85">
            <p>
              Buka menu <strong>Undangan Digital &amp; QR</strong> pada panel kiri acara. Di halaman
              ini, setiap grup tamu memiliki:
            </p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                <strong>Gambar QR Code 2D Asli (Standar ISO/IEC 18004):</strong> Berupa gambar
                kotak matriks hitam-putih beresolusi tajam yang dapat langsung dipindai oleh kamera
                HP/Tablet petugas maupun scanner barcode optik.
              </li>
              <li>
                <strong>Tombol &ldquo;⬇️ Unduh PNG&rdquo;:</strong> Digunakan apabila WO atau
                pengantin ingin mengunduh file gambar QR Code tamu tersebut untuk dicetak di atas
                kartu undangan fisik atau dikirim manual.
              </li>
              <li>
                <strong>Tombol &ldquo;Buka Undangan&rdquo; (/i/[publicToken]):</strong> Membuka
                halaman undangan digital mewah yang berisi nama mempelai, lokasi acara, formulir
                konfirmasi kehadiran (RSVP: Hadir / Maaf Berhalangan + jumlah rencana hadir + pesan
                doa restu), serta Kartu Akses QR Hari-H.
              </li>
              <li>
                <strong>Tombol &ldquo;Kirim WA&rdquo;:</strong> Membuka aplikasi WhatsApp secara
                manual dengan teks undangan sopan yang sudah terisi otomatis beserta tautan unik
                tamu tersebut. (Sesuai prinsip keamanan, sistem tidak mengirim spam massal otomatis
                agar nomor WhatsApp WO/Pengantin tidak diblokir oleh Meta/WhatsApp).
              </li>
            </ol>

            <div className="rounded-button border border-warning/40 bg-warning/10 p-4 mt-3">
              <h3 className="font-bold text-navy text-sm">
                SOP Keamanan: Apa yang Harus Dilakukan Jika QR Tamu VVIP Bocor di Media Sosial?
              </h3>
              <p className="mt-1 text-xs text-ink/85">
                Terkadang tamu penting tidak sengaja mengunggah tangkapan layar (screenshot)
                undangannya ke Instagram Story. Agar QR tersebut tidak disalahgunakan oleh orang tak
                dikenal saat hari-H:
              </p>
              <ol className="list-decimal pl-5 mt-1.5 space-y-1 text-xs">
                <li>
                  Buka menu <strong>Undangan Digital &amp; QR</strong>.
                </li>
                <li>
                  Cari nama tamu VVIP tersebut, lalu klik tombol merah{' '}
                  <strong>&ldquo;Putar Ulang QR&rdquo;</strong>.
                </li>
                <li>
                  Sistem akan langsung <strong>mencabut (revoke) kode QR lama</strong> dan
                  menerbitkan gambar QR Code baru tanpa menghapus data RSVP tamu tersebut!
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* ===================================================================
            BAB 6: SOP MEJA REGISTRASI HARI-H (SCANNER, PARSIAL, MANUAL)
            =================================================================== */}
        <section className="space-y-4 print-page-break pt-4">
          <div className="flex items-center gap-3 border-b border-gold/30 pb-2">
            <span className="rounded bg-navy px-2.5 py-1 text-xs font-bold text-gold-light">
              BAB 06
            </span>
            <h2 className="font-serif text-2xl font-bold text-navy">
              SOP Meja Registrasi Hari-H: Scan QR, Tamu Keluarga Parsial &amp; Cari Manual
            </h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-ink/85">
            <p>
              Saat hari-H, petugas meja penerima tamu membuka menu{' '}
              <strong>Scanner &amp; Check-in Hari-H</strong> (atau layar fokus penuh di{' '}
              <code>/app/e/[eventId]/scanner</code>). Berikut adalah 4 skenario lapangan yang wajib
              dikuasai oleh setiap petugas:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="rounded-button border border-border bg-ivory/70 p-4">
                <h3 className="font-bold text-navy text-sm">
                  Skenario A: Tamu Membawa QR Code &amp; Datang Lengkap
                </h3>
                <ol className="list-decimal pl-5 mt-1.5 space-y-1 text-xs">
                  <li>Arahkan kamera ke QR Code tamu atau masukkan kode QR pada kolom scanner.</li>
                  <li>
                    Periksa kartu informasi yang muncul: Nama Tamu, Kategori (VVIP/VIP/Reguler),
                    Nomor Meja, dan Sisa Kuota.
                  </li>
                  <li>
                    Masukkan jumlah orang yang masuk bersamaan pada kolom{' '}
                    <strong>Jumlah Masuk Sekarang (Delta)</strong>.
                  </li>
                  <li>
                    Klik tombol <strong>&ldquo;Konfirmasi Check-in&rdquo;</strong>.
                  </li>
                </ol>
              </div>

              <div className="rounded-button border border-border bg-ivory/70 p-4">
                <h3 className="font-bold text-navy text-sm">
                  Skenario B: Keluarga Datang Terpisah / Bertahap (Partial Check-in)
                </h3>
                <p className="mt-1 text-xs">
                  Contoh: Undangan <em>Keluarga Besar Bapak H. Hendra Wijaya</em> memiliki{' '}
                  <strong>Kuota 4 Orang</strong>. Pukul 18.30 Bapak &amp; Ibu tiba duluan (2 orang),
                  sedangkan kedua anaknya masih parkir mobil.
                </p>
                <ol className="list-decimal pl-5 mt-1.5 space-y-1 text-xs">
                  <li>
                    Saat Bapak &amp; Ibu tiba: isi <strong>Jumlah Masuk = 2</strong>. Status berubah
                    menjadi <strong>Hadir Sebagian (2/4)</strong>.
                  </li>
                  <li>
                    Pukul 19.00 saat kedua anaknya tiba dan menunjukkan QR yang sama: sistem
                    menampilkan sisa kuota tinggal <strong>2 orang</strong>. Isi{' '}
                    <strong>Jumlah Masuk = 2</strong>. Status berubah menjadi{' '}
                    <strong>Lengkap (4/4)</strong>.
                  </li>
                </ol>
              </div>

              <div className="rounded-button border border-border bg-ivory/70 p-4">
                <h3 className="font-bold text-navy text-sm">
                  Skenario C: Tamu Lupa Membawa HP / Undangan (Pencarian Manual)
                </h3>
                <ol className="list-decimal pl-5 mt-1.5 space-y-1 text-xs">
                  <li>
                    Jangan panik dan jangan menolak tamu. Gunakan kolom{' '}
                    <strong>Pencarian Nama Manual</strong> di bagian bawah halaman Check-in.
                  </li>
                  <li>Ketik sebagian nama tamu (contoh: &ldquo;Budi&rdquo; atau &ldquo;Hendra&rdquo;).</li>
                  <li>
                    Cocokkan nama dan instansi/keluarga tamu, lalu klik tombol{' '}
                    <strong>Check-in (+1)</strong> pada baris nama tersebut.
                  </li>
                </ol>
              </div>

              <div className="rounded-button border border-border bg-ivory/70 p-4">
                <h3 className="font-bold text-navy text-sm">
                  Skenario D: Peringatan Scan Ganda / Melebihi Kuota (Over-Capacity)
                </h3>
                <p className="mt-1 text-xs">
                  Apabila sebuah undangan berkuota 2 orang sudah pernah check-in 2 orang (2/2), lalu
                  ada orang ke-3 mencoba masuk menggunakan QR yang sama:
                </p>
                <ul className="list-disc pl-5 mt-1.5 space-y-1 text-xs">
                  <li>
                    Sistem otomatis menolak transaksi dengan kode merah{' '}
                    <code>CAPACITY_EXCEEDED</code>.
                  </li>
                  <li>
                    Petugas wajib memanggil <strong>Supervisor / Koordinator WO</strong> untuk
                    memverifikasi apakah tamu tersebut diizinkan menambah kuota atau merupakan salah
                    input sebelumnya.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            BAB 7: SOP KOREKSI SUPERVISOR & AUDIT BUKU BESAR
            =================================================================== */}
        <section className="space-y-4 print-page-break pt-4">
          <div className="flex items-center gap-3 border-b border-gold/30 pb-2">
            <span className="rounded bg-navy px-2.5 py-1 text-xs font-bold text-gold-light">
              BAB 07
            </span>
            <h2 className="font-serif text-2xl font-bold text-navy">
              Prosedur Koreksi Kehadiran oleh Supervisor &amp; Audit Buku Besar (Ledger)
            </h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-ink/85">
            <p>
              Bagaimana jika petugas penerima tamu tidak sengaja menekan tombol check-in 2 orang
              padahal tamu yang datang baru 1 orang? Dalam sistem buku tamu biasa, angka sering
              diubah sembarangan tanpa jejak. Di <strong>{BRAND_FULL_NAME}</strong>, seluruh
              kehadiran dicatat menggunakan <strong>Buku Besar Bertanda (Signed Ledger)</strong>{' '}
              seperti sistem perbankan:
            </p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                Petugas biasa (<code>checkin_staff</code>) tidak dapat mengurangi angka kehadiran.
              </li>
              <li>
                Supervisor (<code>checkin_supervisor</code>), Manajer WO (<code>wo_manager</code>),
                atau Pemilik WO (<code>wo_owner</code>) membuka halaman{' '}
                <strong>Scanner &amp; Check-in Hari-H</strong>.
              </li>
              <li>
                Pada bagian <strong>Formulir Koreksi Supervisor</strong>, pilih grup tamu yang ingin
                dikoreksi, masukkan angka delta negatif (contoh: <code>-1</code>), dan{' '}
                <strong>wajib menuliskan alasan koreksi</strong> (contoh:{' '}
                <em>&ldquo;Salah input petugas meja 2, tamu datang sendiri&rdquo;</em>).
              </li>
              <li>
                Sistem akan menyimpan baris transaksi baru bernilai <code>-1</code> di Buku Besar
                sehingga total hadir kembali akurat, sembari menyimpan jejak siapa yang melakukan
                koreksi dan jam berapa koreksi dilakukan.
              </li>
            </ol>
          </div>
        </section>

        {/* ===================================================================
            BAB 8: LAYAR SAMBUTAN TV BALLROOM OTOMATIS (AUTO-SYNC 2,5 DETIK)
            =================================================================== */}
        <section className="space-y-4 print-page-break pt-4">
          <div className="flex items-center gap-3 border-b border-gold/30 pb-2">
            <span className="rounded bg-navy px-2.5 py-1 text-xs font-bold text-gold-light">
              BAB 08
            </span>
            <h2 className="font-serif text-2xl font-bold text-navy">
              Panduan Setting Layar Sambutan TV Ballroom Otomatis (Auto-Sync 2,5 Detik)
            </h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-ink/85">
            <p>
              Banyak pengguna bertanya:{' '}
              <em>
                &ldquo;Ketika tab Layar TV dibuka, bagaimana caranya agar nama tamu langsung muncul
                otomatis saat petugas men-scan QR di pintu depan?&rdquo;
              </em>
            </p>
            <p>
              Jawabannya: Halaman Layar Penuh TV (<code>/display/[id-acara]</code>) telah dilengkapi
              mesin <strong>Live Auto-Polling Real-Time (Interval 2,5 Detik)</strong>. Anda{' '}
              <strong>tidak perlu</strong> me-refresh browser TV atau menekan tombol apa pun di
              laptop TV!
            </p>

            <div className="rounded-button border border-gold/40 bg-ivory p-5 space-y-2">
              <h3 className="font-bold text-navy text-sm">
                Langkah demi Langkah Pemasangan Layar TV di Venue Resepsi:
              </h3>
              <ol className="list-decimal pl-5 space-y-1.5 text-xs">
                <li>
                  Siapkan 1 unit Laptop di dekat TV/Videotron Ballroom, hubungkan dengan kabel HDMI,
                  dan pastikan Laptop terhubung ke Wi-Fi/Internet.
                </li>
                <li>
                  Masuk ke dashboard acara, klik menu <strong>Layar Sambutan TV/LED</strong> di
                  panel kiri.
                </li>
                <li>
                  Klik tombol emas{' '}
                  <strong>&ldquo;📺 Buka Layar Penuh TV (16:9) di Tab Baru&rdquo;</strong>.
                </li>
                <li>
                  Setelah tab baru terbuka, perhatikan sudut kanan atas layar TV: terdapat indikator
                  hijau berkedip bertuliskan <strong>&ldquo;LIVE AUTO-SYNC (2.5s)&rdquo;</strong>.
                  Tekan tombol <code>F11</code> pada keyboard laptop agar tampilan memenuhi layar TV
                  100% tanpa bar alamat browser.
                </li>
                <li>
                  Saat belum ada tamu yang di-scan, layar TV menampilkan tampilan <em>Idle</em>{' '}
                  elegan bertuliskan nama kedua mempelai.
                </li>
                <li>
                  Begitu petugas di meja depan men-scan QR tamu (yang memiliki izin{' '}
                  <code>Tampil di Layar Publik = Ya</code>), dalam waktu maksimal{' '}
                  <strong>2,5 detik</strong> layar TV akan otomatis berkedip emas dan menampilkan:
                  <br />
                  <strong className="text-navy">
                    &ldquo;SELAMAT DATANG KEHORMATAN — [NAMA LENGKAP TAMU] — SILAKAN MENUJU [NOMOR
                    MEJA]&rdquo;
                  </strong>
                  .
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* ===================================================================
            BAB 9: PROTOKOL VVIP, PRIVASI INCOGNITO & TUGAS USHER
            =================================================================== */}
        <section className="space-y-4 print-page-break pt-4">
          <div className="flex items-center gap-3 border-b border-gold/30 pb-2">
            <span className="rounded bg-navy px-2.5 py-1 text-xs font-bold text-gold-light">
              BAB 09
            </span>
            <h2 className="font-serif text-2xl font-bold text-navy">
              Protokol Penyambutan Tamu VVIP, Privasi Incognito &amp; Koordinasi Tim Usher
            </h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-ink/85">
            <p>
              Salah satu keunggulan utama <strong>{BRAND_FULL_NAME}</strong> dibanding aplikasi buku
              tamu biasa adalah <strong>pemisahan antara Layar Publik dan Notifikasi Internal Usher</strong>.
              Mengapa ini sangat penting?
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                Tidak semua pejabat tinggi, tokoh masyarakat, atau tamu VVIP nyaman apabila namanya
                terpampang besar di layar TV publik.
              </li>
              <li>
                Namun, tim Usher WO tetap wajib mengetahui detik itu juga ketika tamu VVIP tersebut
                tiba di meja penerima tamu agar dapat segera menjemput dan mengantar ke kursi VVIP.
              </li>
            </ul>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left border-collapse text-xs border border-border">
                <thead>
                  <tr className="bg-navy text-ivory">
                    <th className="py-2 px-3">Pengaturan Tamu</th>
                    <th className="py-2 px-3">Muncul di Layar TV Ballroom?</th>
                    <th className="py-2 px-3">Muncul di Antrean HP Usher VIP?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-ivory/50">
                  <tr>
                    <td className="py-2 px-3 font-semibold">
                      VVIP / VIP + <code>Izin Tampil TV = Ya</code>
                    </td>
                    <td className="py-2 px-3 text-success font-bold">
                      ✓ YA (Otomatis Tampil di TV)
                    </td>
                    <td className="py-2 px-3 text-success font-bold">
                      ✓ YA (Masuk Antrean Penjemputan Usher)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">
                      VVIP / VIP Incognito + <code>Izin Tampil TV = Tidak</code>
                    </td>
                    <td className="py-2 px-3 text-danger font-bold">
                      ✕ TIDAK (Disembunyikan demi Privasi)
                    </td>
                    <td className="py-2 px-3 text-success font-bold">
                      ✓ YA (Usher Tetap Mendapat Notifikasi Penjemputan!)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">
                      Tamu Reguler + <code>Izin Tampil TV = Ya</code>
                    </td>
                    <td className="py-2 px-3 text-success font-bold">
                      ✓ YA (Otomatis Tampil di TV)
                    </td>
                    <td className="py-2 px-3 text-ink/60">
                      ✕ Tidak masuk antrean khusus Usher VVIP
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ===================================================================
            BAB 10: RESET DATA TESTING, LAPORAN CSV & MASA AKTIF H+14 HARI
            =================================================================== */}
        <section className="space-y-4 print-page-break pt-4">
          <div className="flex items-center gap-3 border-b border-gold/30 pb-2">
            <span className="rounded bg-navy px-2.5 py-1 text-xs font-bold text-gold-light">
              BAB 10
            </span>
            <h2 className="font-serif text-2xl font-bold text-navy">
              Cara Menghapus/Reset Data Testing, Ekspor Laporan &amp; Masa Aktif Akun Pasca-Acara
            </h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-ink/85">
            <h3 className="font-bold text-navy text-base">
              10.1 Cara Menghapus / Mereset Data Simulasi Testing Sebelum Acara Dimulai
            </h3>
            <p>
              Sebelum hari-H, tim WO tentu akan melakukan gladi bersih (simulasi scan QR dan coba
              isi RSVP). Agar angka statistik kembali bersih <code>0 Hadir</code> sebelum tamu asli
              datang, tersedia 2 tombol khusus di menu <strong>Ringkasan &amp; Reset Data</strong>{' '}
              (<code>/app/e/[eventId]</code>):
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                <strong>Tombol 1 — &ldquo;Reset Semua Check-in &amp; RSVP ke 0&rdquo;:</strong>{' '}
                Menghapus seluruh riwayat latihan scan check-in dan mengembalikan angka kehadiran ke
                0, <strong>tanpa menghapus daftar nama tamu dan tanpa mengubah QR Code</strong> yang
                sudah terlanjur dikirim ke tamu.
              </li>
              <li>
                <strong>Tombol 2 — &ldquo;Kembalikan ke Data Awal Demo&rdquo;:</strong> Menghapus
                seluruh tamu tambahan yang dibuat saat latihan dan mengembalikan acara ke 4 tamu
                contoh awal.
              </li>
            </ul>

            <h3 className="font-bold text-navy text-base pt-3">
              10.2 Cara Mengunduh Laporan Akhir Acara (Format CSV / Microsoft Excel)
            </h3>
            <p>
              Setelah resepsi selesai, buka menu <strong>Laporan &amp; Ekspor CSV</strong>, lalu
              klik tombol <strong>&ldquo;⬇️ Unduh Laporan Lengkap (CSV / Excel)&rdquo;</strong>.
              File yang diunduh sudah dilengkapi pengaman <em>Formula Injection Sanitizer</em> dan
              memuat rincian per grup tamu, kategori, kuota, jumlah hadir aktual, status RSVP, meja,
              dan waktu check-in terakhir.
            </p>

            <h3 className="font-bold text-navy text-base pt-3">
              10.3 Kebijakan Masa Aktif Akun Setelah Acara Selesai (H+
              {retention.gracePeriodDaysAfterEvent} Hari)
            </h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                <strong>Sebelum &amp; Saat Hari-H:</strong> Seluruh fitur edit tamu, undangan, dan
                scanner check-in aktif 100%.
              </li>
              <li>
                <strong>
                  Masa Tenggang Pasca-Acara (H+1 s/d H+{retention.gracePeriodDaysAfterEvent} Hari):
                </strong>{' '}
                Fitur scanner check-in dikunci otomatis agar angka kehadiran final tidak berubah.
                Namun, akun Pengantin dan WO <strong>masih tetap bisa login</strong> untuk melihat
                ringkasan dan mengunduh laporan Excel/CSV.
              </li>
              <li>
                <strong>Setelah H+{retention.gracePeriodDaysAfterEvent} Hari:</strong> Akses acara
                klien otomatis dinonaktifkan (diarsipkan) untuk melindungi privasi data pribadi tamu
                undangan. Apabila klien membutuhkan perpanjangan, tersedia Add-On Perpanjangan Masa
                Aktif +30 Hari.
              </li>
            </ul>
          </div>
        </section>

        {/* ===================================================================
            BAB 11: KATALOG PAKET, 10 ADD-ON & PENJELASAN SERVER VERCEL FREE
            =================================================================== */}
        <section className="space-y-4 print-page-break pt-4">
          <div className="flex items-center gap-3 border-b border-gold/30 pb-2">
            <span className="rounded bg-navy px-2.5 py-1 text-xs font-bold text-gold-light">
              BAB 11
            </span>
            <h2 className="font-serif text-2xl font-bold text-navy">
              Katalog Paket Utama, 10 Layanan Add-On &amp; Spesifikasi Server Cloud
            </h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-ink/85">
            <h3 className="font-bold text-navy text-base">
              11.1 Daftar Paket Utama Saat Ini (Dapat Diubah Pemilik Sistem di /admin)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[catalog.free, catalog.pro, catalog.pro_plus].map((plan) => (
                <div
                  key={plan.code}
                  className="rounded-button border border-gold/40 bg-ivory p-4 space-y-1.5"
                >
                  <p className="font-serif font-bold text-lg text-navy">{plan.displayName}</p>
                  <p className="font-serif font-bold text-2xl text-gold-dark tabular-nums">
                    {plan.priceLabel} <span className="text-xs font-sans text-ink/60">/ acara</span>
                  </p>
                  <p className="text-xs">
                    Maksimal <strong>{plan.limits.maxInvitationGroups}</strong> Grup Undangan ·{' '}
                    <strong>{plan.limits.maxActiveScanners}</strong> Scanner · Masa Aktif H+
                    {plan.postEventGraceDays} Hari
                  </p>
                </div>
              ))}
            </div>

            <h3 className="font-bold text-navy text-base pt-2">
              11.2 Daftar 10 Layanan Tambahan Khusus (Add-Ons) Resmi SANSTECH
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs border border-border">
                <thead>
                  <tr className="bg-navy text-ivory">
                    <th className="py-2 px-3">Kategori</th>
                    <th className="py-2 px-3">Nama Layanan Add-On</th>
                    <th className="py-2 px-3">Harga &amp; Satuan</th>
                    <th className="py-2 px-3">Keterangan Operasional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-ivory/40">
                  {addOnsCatalog.map((addon) => (
                    <tr key={addon.code}>
                      <td className="py-2 px-3 font-semibold text-gold-dark">
                        {addon.category}
                      </td>
                      <td className="py-2 px-3 font-bold text-navy">{addon.name}</td>
                      <td className="py-2 px-3 font-mono font-bold text-navy whitespace-nowrap">
                        {addon.priceFormatted} <span className="font-normal">({addon.unitLabel})</span>
                      </td>
                      <td className="py-2 px-3 text-ink/80">{addon.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-button border border-border bg-ivory/80 p-4 mt-4 space-y-1.5">
              <h3 className="font-bold text-navy text-sm">
                11.3 Catatan Teknis Mengenai Hosting Vercel Hobby (Gratis Rp0) vs Database Cloud
              </h3>
              <p className="text-xs text-ink/80">
                Aplikasi ini di-deploy menggunakan <strong>Vercel Hobby (Free Plan)</strong> yang
                100% gratis tanpa kartu kredit. Perlu diketahui spesifikasi paket gratis Vercel:
              </p>
              <ul className="list-disc pl-5 text-xs space-y-1 text-ink/80">
                <li>
                  <strong>Kuota Bandwidth 100 GB / Bulan:</strong> Sangat melimpah untuk puluhan
                  acara pernikahan dan ribuan scan QR per bulan.
                </li>
                <li>
                  <strong>Sifat Serverless (In-Memory vs Database Permanen):</strong> Selama Anda
                  belum mengisi variabel <code>NEXT_PUBLIC_SUPABASE_URL</code> di pengaturan Vercel,
                  aplikasi berjalan menggunakan <em>Mode Simulasi In-Memory</em> agar tim WO bisa
                  langsung mencoba seluruh fitur dengan cepat. Pada mode simulasi tanpa database,
                  data tambahan baru akan ter-reset otomatis apabila server Vercel beristirahat
                  (idle sekitar 15–30 menit). Ketika Anda siap digunakan untuk acara pernikahan
                  sesungguhnya, cukup hubungkan ke <strong>Supabase Free Tier (Gratis Rp0)</strong>{' '}
                  agar seluruh data tersimpan permanen selamanya di PostgreSQL.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ===================================================================
            BAB 12: LEMBAR CHECKLIST FISIK KESIAPAN HARI-H (SIAP CENTANG)
            =================================================================== */}
        <section className="space-y-4 print-page-break pt-4">
          <div className="flex items-center gap-3 border-b border-gold/30 pb-2">
            <span className="rounded bg-navy px-2.5 py-1 text-xs font-bold text-gold-light">
              BAB 12
            </span>
            <h2 className="font-serif text-2xl font-bold text-navy">
              Lembar Checklist Fisik Kesiapan Lapangan (Dicetak &amp; Dicentang oleh Koordinator WO)
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-ink/80">
            Cetak halaman ini pada kertas A4 dan tempelkan di clipboard Koordinator Meja Registrasi
            pada saat persiapan dan Hari-H:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-button border border-navy/30 bg-ivory/60 p-4 space-y-2">
              <h3 className="font-bold text-navy text-sm border-b border-border pb-1">
                A. Checklist H-14 s/d H-7 (Persiapan Data &amp; Undangan)
              </h3>
              <ul className="space-y-1.5">
                <li>☐ Acara pernikahan sudah dibuat dengan nama mempelai &amp; tanggal yang benar.</li>
                <li>☐ Daftar tamu dari keluarga kedua mempelai sudah diimpor (CSV) / diinput.</li>
                <li>☐ Kuota orang (Capacity) untuk setiap undangan keluarga sudah diverifikasi.</li>
                <li>
                  ☐ Kategori <code>VVIP</code> dan <code>VIP</code> serta nomor meja sudah diisi.
                </li>
                <li>
                  ☐ Opsi <code>Izinkan Tampil di Layar TV</code> sudah diatur sesuai privasi tamu.
                </li>
                <li>☐ Tautan undangan unik sudah dikirimkan ke tamu melalui WhatsApp.</li>
              </ul>
            </div>

            <div className="rounded-button border border-navy/30 bg-ivory/60 p-4 space-y-2">
              <h3 className="font-bold text-navy text-sm border-b border-border pb-1">
                B. Checklist H-1 (Gladi Bersih / Rehearsal di Venue)
              </h3>
              <ul className="space-y-1.5">
                <li>☐ Uji koneksi Wi-Fi Ballroom dan siapkan modem Hotspot 4G/5G cadangan.</li>
                <li>☐ Hubungkan Laptop ke TV/LED Ballroom via HDMI dan buka layar penuh (F11).</li>
                <li>
                  ☐ Lakukan tes scan 1 QR Code VVIP dari HP petugas; pastikan nama muncul otomatis
                  di TV dalam 2,5 detik.
                </li>
                <li>
                  ☐ Lakukan tes scan tamu VVIP Incognito; pastikan muncul di HP Usher namun tidak
                  muncul di TV publik.
                </li>
                <li>
                  ☐ <strong>PENTING:</strong> Setelah gladi bersih selesai, klik tombol{' '}
                  <strong>&ldquo;Reset Semua Check-in &amp; RSVP ke 0&rdquo;</strong> di menu
                  Ringkasan Acara!
                </li>
              </ul>
            </div>

            <div className="rounded-button border border-navy/30 bg-ivory/60 p-4 space-y-2">
              <h3 className="font-bold text-navy text-sm border-b border-border pb-1">
                C. Checklist Hari-H (2 Jam Sebelum Open Gate)
              </h3>
              <ul className="space-y-1.5">
                <li>☐ Baterai seluruh HP/Tablet petugas scanner terisi 100% + Powerbank siap.</li>
                <li>☐ Layar TV Sambutan sudah berstatus <code>LIVE AUTO-SYNC (2.5s)</code>.</li>
                <li>☐ Setiap petugas meja registrasi sudah login di halaman Scanner.</li>
                <li>☐ Tim Usher VVIP sudah membuka halaman Protokol VIP &amp; Usher.</li>
                <li>☐ Supervisor meja registrasi siap menangani tamu datang bertahap (parsial).</li>
              </ul>
            </div>

            <div className="rounded-button border border-navy/30 bg-ivory/60 p-4 space-y-2">
              <h3 className="font-bold text-navy text-sm border-b border-border pb-1">
                D. Checklist Pasca-Acara (Selesai Resepsi)
              </h3>
              <ul className="space-y-1.5">
                <li>☐ Periksa kesesuaian total tamu hadir dan riwayat koreksi di Buku Besar.</li>
                <li>
                  ☐ Unduh file <strong>Laporan Lengkap CSV / Excel</strong> dari menu Laporan.
                </li>
                <li>☐ Serahkan file laporan resmi kepada pasangan pengantin / keluarga.</li>
                <li>
                  ☐ Informasikan kepada pengantin bahwa akun mereka tetap aktif selama H+
                  {retention.gracePeriodDaysAfterEvent} hari untuk mengunduh laporan mandiri.
                </li>
              </ul>
            </div>
          </div>

          {/* Kolom Tanda Tangan Serah Terima Operasional */}
          <div className="mt-8 pt-6 border-t border-border grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <p className="font-bold text-navy">Koordinator Lapangan WO</p>
              <div className="h-16" />
              <p className="border-t border-ink/40 pt-1">( Nama &amp; Tanda Tangan )</p>
            </div>
            <div>
              <p className="font-bold text-navy">Supervisor Meja Registrasi</p>
              <div className="h-16" />
              <p className="border-t border-ink/40 pt-1">( Nama &amp; Tanda Tangan )</p>
            </div>
            <div>
              <p className="font-bold text-navy">Perwakilan Keluarga / Klien</p>
              <div className="h-16" />
              <p className="border-t border-ink/40 pt-1">( Nama &amp; Tanda Tangan )</p>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
