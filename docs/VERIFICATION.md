# Catatan verifikasi — 25 November 2026

## Lingkungan

Windows, Node.js 24.22.1, Next.js 16.4.6, React 19.3.1, Vitest 5.1.1, PGlite 0.6.0, PostgreSQL 17.12 dan Playwright 1.65.1/Chromium. Pemeriksaan lanjutan dimulai dari commit `3756507` yang telah berstatus Ready di Vercel.

## Hasil yang dijalankan

- `npm test`: **51 tes lulus**, terdiri dari 30 tes unit dan 21 tes integrasi PostgreSQL sementara. Seluruh migration dimuat ke database terisolasi dengan stub schema `auth`; tidak menyentuh database produksi.
- `npm run test:concurrency`: **5 skenario lulus** pada PostgreSQL 17.12 dengan pool koneksi terpisah: 12 scan serentak tidak melampaui kapasitas, 8 permintaan ulang menghasilkan satu ledger, RSVP tidak melampaui kapasitas saat perubahan bersamaan, kuota scanner tidak berlebih, dan 8 onboarding menghasilkan satu workspace. Tes RSVP memeriksa `pg_stat_activity` untuk memastikan dua transaksi benar-benar menunggu kunci yang sama.
- Tes database meliputi profil, onboarding idempoten, isolasi tenant, aktor palsu, paket Free, token terpisah/rotasi, RSVP, kapasitas, konflik idempotensi, undangan dan pencabutan anggota, koreksi bertanda, impor atomik, kuota undangan/scanner, sesi scanner dicabut, pairing TV sekali pakai, pencabutan layar, antrean FIFO, notifikasi VIP dan larangan eskalasi hak akses tabel.
- `npx playwright test`: **4 skenario lulus**. Alur acara–tamu–undangan di browser lain–RSVP–check-in–ekspor Excel; ukuran layar 390×844 pada dashboard/tamu/undangan/laporan dan halaman publik; penolakan CSRF dan cookie identitas palsu; tujuan undangan dipertahankan saat membuka pendaftaran. Backend browser menggunakan simulasi lokal, bukan Supabase produksi.
- Pengujian tambahan memverifikasi penolakan tabel otorisasi sementara yang mencoba meniru `profiles`, pembatasan isi respons petugas, pembatalan sambutan setelah koreksi menjadi nol, penolakan aktor null, dan tautan peta yang memakai halaman pengalih.
- `npm audit`: **0 kerentanan yang dilaporkan**, setelah pembaruan dependensi. Audit awal melaporkan 18 kerentanan. Ini bukan jaminan bahwa tidak ada kerentanan yang belum diketahui.
- `npm run lint`, `npm run typecheck`, dan `npm run build`: **selesai dengan kode keluar 0** pada sumber final. Build memakai webpack dan menghasilkan seluruh route aplikasi. Tes awal yang mewajibkan kode TV sembarang membuka acara telah diubah agar mengharuskan penolakan.
- Artefak `next start` diperiksa terpisah pada port 3130: tujuh halaman publik HTTP 200, status database tanpa konfigurasi HTTP 503 dengan `setup_required`, dashboard mengarah ke `/status`, endpoint akun simulasi HTTP 404, dan mutasi lintas origin HTTP 403. Header produksi tidak memuat `unsafe-eval` atau `X-Powered-By`.
- Pratinjau ponsel diperiksa secara visual. Header publik yang melebar, token QR panjang, dan batas lebar area konten diperbaiki. Daftar tamu dan generator QR dipaginasi.

## Gangguan pengujian yang diselesaikan

Vitest/esbuild dan Chromium memerlukan izin proses di luar sandbox Windows. Versi lama tes gagal dimulai dengan `spawn EPERM`; pengujian dijalankan ulang dengan izin eksekusi yang sesuai. Pengujian browser awal juga terganggu kompilasi pertama dan restart server saat file konfigurasi diperbarui; batas penantian navigasi disesuaikan dan pengujian diulang setelah sumber stabil. Tidak ada hasil gagal tersebut yang dihitung sebagai lulus.

## Status layanan dan konfigurasi akun

- **Hosting:** proyek Vercel sudah ada dan deployment terkonfirmasi Ready. Tidak perlu membuat hosting baru.
- **Database:** pengguna mengonfirmasi proyek Supabase belum dibuat. `/api/health` pada domain produksi mengembalikan HTTP 503 dengan `database: not_configured`. Langkah akun yang diperlukan adalah mengaktifkan koneksi Supabase agar proyek dapat dibuat, seluruh migration diterapkan, dan URL/anon key diatur di Vercel. Rahasia tidak ditulis ke Git atau diminta melalui chat.
- **Transaksi database:** telah diuji dengan beberapa koneksi pada PostgreSQL 17.12, termasuk penguncian yang benar-benar tumpang tindih. Pengujian ini memakai identitas JWT terisolasi; autentikasi cloud dan pengiriman email baru bisa dihubungkan setelah proyek Supabase tersedia.
- **Perangkat:** antarmuka diuji melalui Chromium desktop/ponsel, QR dibuat dengan pustaka QR sebenarnya, dan alur layar diuji melalui database. Kamera dan TV fisik tidak terhubung ke sesi pengerjaan.
- **Aktivasi layanan:** sesudah koneksi akun tersedia, buat proyek, terapkan migration, atur callback Auth/SMTP, deploy environment, pastikan `/api/health` HTTP 200, lalu jalankan alur lintas akun pada domain produksi. Dashboard tetap menolak akun simulasi selama konfigurasi belum selesai.
- GitHub Actions belum diaktifkan: token Git sesi ini tidak mempunyai scope `workflow`. Template tersedia di `docs/workflows/ci.yml` untuk akun berizin. Pemeriksaan di atas dijalankan lokal secara langsung.
- Pembayaran, pengiriman WhatsApp, pemesanan layanan tambahan, counter souvenir dan tambahan kuota otomatis tidak dihubungkan ke layanan eksternal. UI dan panduan menjelaskan batas tersebut.

Status penyerahan mengikuti hasil tes dan kondisi layanan yang tercatat. Bagian konfigurasi akun diperbarui setelah respons layanan berhasil diverifikasi.
