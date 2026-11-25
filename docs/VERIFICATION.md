# Catatan verifikasi — 25 November 2026

## Lingkungan

Windows, Node.js 24.22.1, Next.js 16.4.6, React 19.3.1, Vitest 5.1.1, PGlite 0.6.0 dan Playwright 1.65.1/Chromium. Repository awal bersih dan sesuai `origin/main` pada commit `7914404`.

## Hasil yang dijalankan

- `npm test`: **46 tes lulus**, terdiri dari 30 tes unit dan 16 tes integrasi PostgreSQL sementara. Kedua migration dimuat ke database terisolasi dengan stub schema `auth`; tidak menyentuh database produksi.
- Tes database meliputi profil, onboarding idempoten, isolasi tenant, aktor palsu, paket Free, token terpisah/rotasi, RSVP, kapasitas, konflik idempotensi, undangan dan pencabutan anggota, koreksi bertanda, impor atomik, kuota undangan/scanner, sesi scanner dicabut, pairing TV sekali pakai, pencabutan layar, antrean FIFO, notifikasi VIP dan larangan eskalasi hak akses tabel.
- `npx playwright test`: **3 skenario lulus**. Alur acara–tamu–undangan di browser lain–RSVP–check-in–ekspor Excel; ukuran layar 390×844 pada dashboard/tamu/undangan/laporan dan halaman publik; penolakan CSRF dan cookie identitas palsu. Backend browser menggunakan simulasi lokal, bukan Supabase produksi.
- `npm audit`: **0 kerentanan yang dilaporkan**, setelah pembaruan dependensi. Audit awal melaporkan 18 kerentanan. Ini bukan jaminan bahwa tidak ada kerentanan yang belum diketahui.
- `npm run lint`, `npm run typecheck`, dan `npm run build`: **selesai dengan kode keluar 0** pada sumber final. Build memakai webpack dan menghasilkan seluruh route aplikasi. Tes awal yang mewajibkan kode TV sembarang membuka acara telah diubah agar mengharuskan penolakan.
- Artefak `next start` diperiksa terpisah pada port 3130: tujuh halaman publik HTTP 200, status database tanpa konfigurasi HTTP 503 dengan `setup_required`, dashboard mengarah ke `/status`, endpoint akun simulasi HTTP 404, dan mutasi lintas origin HTTP 403. Header produksi tidak memuat `unsafe-eval` atau `X-Powered-By`.
- Pratinjau ponsel diperiksa secara visual. Header publik yang melebar, token QR panjang, dan batas lebar area konten diperbaiki. Daftar tamu dan generator QR dipaginasi.

## Gangguan pengujian yang diselesaikan

Vitest/esbuild dan Chromium memerlukan izin proses di luar sandbox Windows. Versi lama tes gagal dimulai dengan `spawn EPERM`; pengujian dijalankan ulang dengan izin eksekusi yang sesuai. Pengujian browser awal juga terganggu kompilasi pertama dan restart server saat file konfigurasi diperbarui; batas penantian navigasi disesuaikan dan pengujian diulang setelah sumber stabil. Tidak ada hasil gagal tersebut yang dihitung sebagai lulus.

## Batas verifikasi produksi

- GitHub `yrds03/sanstech-wedding-management-system` dan integrasi deployment Vercel sebelumnya terkonfirmasi. Sesi ini tidak mempunyai koneksi langsung proyek Supabase atau akun Vercel.
- Migration baru belum diterapkan ke proyek Supabase produksi. Tidak ada environment/rahasia produksi yang dibuat, ditebak atau dicatat di Git.
- Supabase Auth/SMTP sebenarnya, email verifikasi dan pemulihan yang diterima pengguna, sesi lintas perangkat pada Supabase, kamera fisik, TV fisik, serta uji beban dan balapan transaksi dari beberapa koneksi PostgreSQL belum diverifikasi.
- Runtime tanpa konfigurasi memberi status penyiapan dan menolak akses data. `/api/health` menunjukkan `setup_required` sampai konfigurasi dan migration tersedia. Ini perilaku penolakan yang disengaja, bukan bukti integrasi produksi sudah selesai.
- GitHub Actions belum diaktifkan: token Git sesi ini tidak mempunyai scope `workflow`. Template tersedia di `docs/workflows/ci.yml` untuk akun berizin. Pemeriksaan di atas dijalankan lokal secara langsung.
- Pembayaran, pengiriman WhatsApp, pemesanan layanan tambahan, counter souvenir dan tambahan kuota otomatis tidak dihubungkan ke layanan eksternal. UI dan panduan menjelaskan batas tersebut.

Status yang dapat dipertanggungjawabkan adalah hasil pemeriksaan yang tercatat di atas. Klaim “sempurna tanpa bug” belum dapat dibuat, khususnya sebelum staging dan pilot perangkat nyata selesai.
