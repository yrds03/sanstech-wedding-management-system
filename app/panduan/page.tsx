import Link from 'next/link';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/types';
import { getPlansCatalog, getPostEventRetentionConfig } from '@/lib/plans';
import { PrintManualButton } from '@/components/app/print-button';

export const dynamic = 'force-dynamic';

export default function PrintableManualPage() {
  const catalog = getPlansCatalog();
  const retention = getPostEventRetentionConfig();

  return (
    <div className="min-h-screen bg-ivory py-10 px-4 sm:px-8">
      {/* Toolbar Non-Print */}
      <div className="no-print max-w-4xl mx-auto mb-8 rounded-card border border-gold/40 bg-navy text-ivory p-5 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gold-light">
            Dokumen Resmi Operasional WO &amp; Klien
          </p>
          <p className="text-sm text-ivory/85 mt-0.5">
            Halaman ini telah diformat khusus untuk kertas <strong>A4</strong>. Klik tombol di
            kanan untuk langsung mencetak ke printer atau memilih <strong>Save as PDF</strong>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/app/workspaces"
            className="min-h-[44px] inline-flex items-center rounded-button border border-gold/40 px-4 py-2 text-xs font-semibold text-gold-light hover:bg-navy-light transition"
          >
            &larr; Kembali ke Dashboard
          </Link>
          <PrintManualButton />
        </div>
      </div>

      {/* Lembar Buku Pedoman A4 */}
      <article className="max-w-4xl mx-auto rounded-card border border-gold/30 bg-white text-ink p-8 sm:p-12 shadow-sm print-card space-y-8">
        {/* Sampul / Header Buku Pedoman */}
        <header className="border-b-2 border-navy pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-dark">
              BUKU PEDOMAN PENGGUNAAN &amp; SOP HARI-H
            </p>
            <h1 className="mt-1 font-serif text-3xl sm:text-4xl font-bold text-navy">
              {BRAND_NAME}
            </h1>
            <p className="mt-1 text-xs italic text-ink/70">&ldquo;{BRAND_TAGLINE}&rdquo;</p>
          </div>
          <div className="text-left sm:text-right text-xs text-ink/70">
            <p className="font-bold text-navy">Edisi Operasional Tim WO &amp; Pengantin</p>
            <p>Klasifikasi: Panduan Resmi Lapangan</p>
            <p>Kepatuhan: UU PDP No. 27 Tahun 2022</p>
          </div>
        </header>

        {/* BAB 1: Pembagian Peran (Role) */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-navy border-l-4 border-gold pl-3">
            BAB 1 — Pembagian Akun &amp; Hak Akses Tim (Multi-Role)
          </h2>
          <p className="text-xs sm:text-sm text-ink/80 leading-relaxed">
            Setiap personel dalam acara pernikahan memiliki akun dengan batasan akses ketat agar
            data tamu tetap aman dan tidak tercampur antar-klien:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs border border-border">
              <thead>
                <tr className="bg-ivory text-navy font-bold">
                  <th className="p-2.5 border border-border">Nama Peran (Role)</th>
                  <th className="p-2.5 border border-border">Siapa yang Menggunakan</th>
                  <th className="p-2.5 border border-border">Tugas &amp; Wewenang Utama</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2.5 border border-border font-bold">1. Super Admin</td>
                  <td className="p-2.5 border border-border">Pemilik Bisnis SANSTECH</td>
                  <td className="p-2.5 border border-border">
                    Mengatur harga paket (<code>/admin</code>), masa aktif akun pasca-acara, dan
                    aktivasi lisensi acara klien.
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 border border-border font-bold">
                    2. Owner / Manajer WO
                  </td>
                  <td className="p-2.5 border border-border">Pimpinan / Project Manager WO</td>
                  <td className="p-2.5 border border-border">
                    Membuat acara baru, import daftar tamu Excel/CSV, mengundang pengantin &amp;
                    staf, serta mereset data simulasi/testing.
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 border border-border font-bold">
                    3. Calon Pengantin (Couple)
                  </td>
                  <td className="p-2.5 border border-border">Pasangan Mempelai &amp; Keluarga Inti</td>
                  <td className="p-2.5 border border-border">
                    Menambah/mengelola daftar tamu miliknya, membagikan tautan undangan WhatsApp,
                    dan memantau laporan kehadiran acara miliknya saja.
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 border border-border font-bold">
                    4. Supervisor Hari-H
                  </td>
                  <td className="p-2.5 border border-border">Koordinator Meja Registrasi</td>
                  <td className="p-2.5 border border-border">
                    Memantau antrean masuk, melakukan koreksi jumlah hadir (wajib disertai alasan
                    audit), dan mengatur layar sambutan TV.
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 border border-border font-bold">
                    5. Petugas Scanner (Receptionist)
                  </td>
                  <td className="p-2.5 border border-border">Penerima Tamu di Pintu Masuk</td>
                  <td className="p-2.5 border border-border">
                    Memindai QR Code tamu dari HP/tablet atau mencari nama manual, lalu
                    mengonfirmasi jumlah orang yang hadir.
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 border border-border font-bold">6. Tim Usher VIP</td>
                  <td className="p-2.5 border border-border">Pendamping Tamu VVIP/VIP</td>
                  <td className="p-2.5 border border-border">
                    Menerima daftar tamu VIP/VVIP yang baru tiba beserta nomor meja untuk
                    penjemputan di pintu utama.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* BAB 2: Langkah Persiapan Sebelum Acara (H-30 s/d H-1) */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-navy border-l-4 border-gold pl-3">
            BAB 2 — Alur Persiapan Sebelum Hari-H (H-30 s/d H-1)
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-ink/85 leading-relaxed">
            <li>
              <strong>Buat Workspace &amp; Acara:</strong> Masuk ke menu{' '}
              <code>Semua Acara &rarr; Buat Acara Pernikahan Baru</code>. Isi nama mempelai,
              tanggal, jam, dan gedung.
            </li>
            <li>
              <strong>Latihan / Simulasi Tim WO (Testing):</strong> Gunakan fitur tambah tamu, scan
              QR, dan layar sambutan untuk melatih tim penerima tamu.
            </li>
            <li>
              <strong>PENTING — Hapus / Reset Data Testing Sebelum Acara Asli:</strong> Setelah
              selesai latihan, buka menu <code>Ringkasan Acara</code> lalu klik tombol{' '}
              <strong>&ldquo;Reset Angka Check-in ke 0&rdquo;</strong> (jika ingin mempertahankan
              daftar tamu) atau <strong>&ldquo;Hapus Semua Tamu Testing&rdquo;</strong> (jika ingin
              mengosongkan acara menjadi 0 tamu).
            </li>
            <li>
              <strong>Input / Import Daftar Tamu Asli:</strong> Buka menu{' '}
              <code>Daftar Tamu &amp; Import</code>. Masukkan nama grup undangan (Individu,
              Pasangan, atau Keluarga), kuota jumlah orang (misal 1 keluarga = 4 orang), kategori (
              <code>Reguler / VIP / VVIP</code>), dan nomor meja.
            </li>
            <li>
              <strong>Atur Privasi Layar Sambutan VIP:</strong> Secara bawaan (default), nama tamu{' '}
              <strong>tidak ditampilkan</strong> di layar publik kecuali kotak{' '}
              <em>&ldquo;Izinkan nama tampil di layar sambutan publik&rdquo;</em> dicentang.
            </li>
            <li>
              <strong>Bagikan Tautan Undangan Digital:</strong> Buka menu{' '}
              <code>Undangan Digital &amp; QR</code>, lalu klik tombol{' '}
              <strong>Kirim via WhatsApp</strong> atau salin tautan unik masing-masing tamu.
            </li>
          </ol>
        </section>

        {/* BAB 3: SOP Operasional Hari-H di Gedung */}
        <section className="space-y-3 print-page-break">
          <h2 className="font-serif text-xl font-bold text-navy border-l-4 border-gold pl-3">
            BAB 3 — SOP Penerimaan Tamu Saat Hari-H (Meja Registrasi &amp; Usher)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="rounded-button border border-border p-4 bg-ivory/40">
              <h3 className="font-bold text-navy">A. Prosedur Scan QR Normal &amp; Keluarga</h3>
              <ul className="mt-2 list-disc list-inside space-y-1.5 text-ink/80">
                <li>
                  Petugas membuka menu <code>Scanner &amp; Check-in Hari-H</code> di HP/Tablet.
                </li>
                <li>
                  Pindai kode QR tamu. Layar akan menampilkan Nama Tamu, Kategori, Nomor Meja, dan{' '}
                  <strong>Sisa Kuota Orang</strong>.
                </li>
                <li>
                  <strong>Kedatangan Parsial (Bertahap):</strong> Jika undangan berlaku untuk 4
                  orang namun baru hadir 2 orang di pagi hari, pilih angka <code>2</code> lalu klik{' '}
                  <strong>Konfirmasi Hadir</strong>. Sisa 2 kuota masih bisa dipakai menyusul.
                </li>
                <li>
                  Jika kuota sudah penuh (misal 4/4 hadir), sistem otomatis menolak scan ke-5 agar
                  tidak terjadi penyalahgunaan QR.
                </li>
              </ul>
            </div>

            <div className="rounded-button border border-border p-4 bg-ivory/40">
              <h3 className="font-bold text-navy">
                B. Tamu Lupa Membawa QR &amp; Koreksi Salah Input
              </h3>
              <ul className="mt-2 list-disc list-inside space-y-1.5 text-ink/80">
                <li>
                  <strong>Tamu Lupa Membawa HP/QR:</strong> Gunakan kolom{' '}
                  <strong>Cari Nama Manual</strong> pada halaman Scanner, pilih nama tamu dari
                  daftar acara, lalu konfirmasi jumlah hadir.
                </li>
                <li>
                  <strong>Salah Input Jumlah Tamu:</strong> Petugas biasa tidak dapat menghapus
                  riwayat. Panggil <strong>Supervisor Hari-H</strong> untuk memasukkan{' '}
                  <strong>Koreksi Kehadiran</strong> (misal <code>-1</code>) disertai alasan wajib
                  minimal 5 karakter.
                </li>
                <li>
                  <strong>SOP Darurat Jika Internet Gedung Mati:</strong> Unduh file{' '}
                  <strong>CSV Daftar Cadangan</strong> di menu Laporan sebelum acara dimulai.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* BAB 4: Siklus Masa Aktif Akun & Paket */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-navy border-l-4 border-gold pl-3">
            BAB 4 — Masa Aktif Akun Setelah Acara Selesai &amp; Tabel Paket
          </h2>
          <p className="text-xs sm:text-sm text-ink/80 leading-relaxed">
            Untuk menjaga keamanan dan kerahasiaan data pribadi tamu setelah pernikahan selesai,
            sistem menerapkan aturan siklus hidup akun otomatis sebagai berikut:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-ink/85">
            <li>
              <strong>Masa Persiapan s/d Hari-H:</strong> Seluruh fitur pengelolaan tamu, undangan,
              RSVP, dan scanner check-in aktif penuh.
            </li>
            <li>
              <strong>
                Masa Tenggang Unduh Laporan (H+1 s/d H+{retention.gracePeriodDaysAfterEvent} Hari
                Setelah Acara):
              </strong>{' '}
              Fitur scanner check-in dikunci agar data hari-H tidak berubah lagi. Akun Pengantin
              dan WO tetap dapat masuk untuk melihat rekap akhir dan mengunduh laporan CSV/Excel.
            </li>
            <li>
              <strong>
                Penonaktifan Otomatis (Setelah H+{retention.gracePeriodDaysAfterEvent} Hari):
              </strong>{' '}
              Akses acara untuk akun pengantin dan petugas lapangan otomatis dinonaktifkan
              (diarsipkan). Apabila klien membutuhkan perpanjangan waktu akses, Super Admin dapat
              mengaktifkannya kembali dari menu <code>/admin</code>.
            </li>
          </ul>

          <div className="mt-4 grid grid-cols-3 gap-4 text-xs border-t border-border pt-4">
            <div>
              <p className="font-bold text-navy">{catalog.free.displayName}</p>
              <p className="text-gold-dark font-bold">{catalog.free.priceLabel} / acara</p>
              <p className="text-ink/70">
                Maks. {catalog.free.limits.maxInvitationGroups} grup undangan · 1 Scanner · Aktif H+
                {catalog.free.postEventGraceDays} hari pasca-acara.
              </p>
            </div>
            <div>
              <p className="font-bold text-navy">{catalog.pro.displayName}</p>
              <p className="text-gold-dark font-bold">{catalog.pro.priceLabel} / acara</p>
              <p className="text-ink/70">
                Maks. {catalog.pro.limits.maxInvitationGroups} grup undangan · 3 Scanner · Aktif H+
                {catalog.pro.postEventGraceDays} hari pasca-acara.
              </p>
            </div>
            <div>
              <p className="font-bold text-navy">{catalog.pro_plus.displayName}</p>
              <p className="text-gold-dark font-bold">{catalog.pro_plus.priceLabel} / acara</p>
              <p className="text-ink/70">
                Maks. {catalog.pro_plus.limits.maxInvitationGroups} grup undangan · 10 Scanner ·
                Aktif H+{catalog.pro_plus.postEventGraceDays} hari pasca-acara.
              </p>
            </div>
          </div>
        </section>

        {/* Footer Lembar Pedoman */}
        <footer className="border-t border-border pt-4 flex items-center justify-between text-[11px] text-ink/60">
          <span>Dicetak dari sistem resmi {BRAND_NAME}</span>
          <span>Dokumen Operasional Wedding Organizer &amp; Klien</span>
        </footer>
      </article>
    </div>
  );
}

