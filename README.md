# SANSTECH Wedding Management System

Aplikasi berbahasa Indonesia untuk WO dan pengantin: workspace, acara, tim, undangan digital, RSVP, check-in parsial, TV sambutan, dan laporan.

## Menjalankan lokal

Gunakan Node.js **24 LTS** dan npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Isi environment Google Drive dan OAuth sesuai `.env.example` serta [panduan pemasangan](docs/GOOGLE_DRIVE_SETUP.md). Untuk simulasi lokal saja, kosongkan konfigurasi gateway dan isi `LOCAL_DEMO_MODE=true`. Akun pengujian tampil di `/auth/login`; data lokal berada di `.local-data/` yang diabaikan Git.

Mode simulasi ditolak pada build produksi/Vercel. Tanpa konfigurasi layanan, dashboard menampilkan status penyiapan dan API data mengembalikan 503. Tidak ada data contoh, login email saja, atau kata sandi bawaan pada produksi.

## Penyimpanan Google Drive

Atas pilihan pemilik, Supabase telah diganti dengan **Google Drive + Apps Script**, dan login memakai **Google OpenID Connect**. Spreadsheet yang diberikan menjadi panel status commit tanpa data pribadi tamu. Database terenkripsi berada pada folder Drive yang diberikan. File database dienkripsi AES-256-GCM pada Drive pemilik; petugas masuk dengan Google tanpa meminta akses Drive pribadi mereka.

Aturan transaksi PostgreSQL dijalankan oleh PGlite di server Vercel. Hasil commit disimpan sebagai snapshot gzip. Gateway Apps Script memakai HMAC, ScriptLock dan compare-and-swap versi sehingga dua proses tidak saling menimpa. Snapshot dibatasi 8 MiB base64; kuota serta latency akun Google tetap berlaku.

Kode gateway/manifest ada di `google-apps-script/`. Skema SQL yang diuji dipertahankan di `database/migrations/`, bersama bootstrap identitas/sesi Drive. Migration dijalankan pada salinan server dan disimpan bersama commit berikutnya. Rahasia dan database tidak dikirim ke browser atau dicatat di Git.

Panduan lengkap: [docs/GOOGLE_DRIVE_SETUP.md](docs/GOOGLE_DRIVE_SETUP.md). Di dalamnya terdapat pemasangan Apps Script, OAuth Google, environment Vercel, pengujian akun, pemberian admin, batas penyimpanan dan pemulihan.

## GitHub dan Vercel

Repository: https://github.com/yrds03/sanstech-wedding-management-system

Proyek Vercel: `yrds/sanstech-wedding-management-system`. Push ke `main` memicu deployment yang sudah terpasang. Gunakan Node.js 24, instalasi `npm ci`, build `npm run build`. Isi `DRIVE_GATEWAY_URL`, `DRIVE_GATEWAY_SECRET`, `DRIVE_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` dan `NEXT_PUBLIC_APP_URL` pada environment target. Setelah mengganti environment, redeploy.

Publikasi kode tidak otomatis membuat file di akun Google, menerbitkan Apps Script atau membuat OAuth client. `/api/health` memberi status koneksi sebenarnya. Preview yang mengubah data harus memakai penyimpanan pengujian terpisah.

## Alur yang tersedia

- `/auth/register`, `/auth/login`, `/auth/callback`: login Google dengan state/nonce/PKCE dan sesi yang dapat dicabut. Halaman bantuan akun mengarahkan pemulihan ke Google.
- `/onboarding`, `/app/workspaces`, `/app/w/[workspaceId]/events`: workspace dan pembuatan acara.
- `/app/e/[eventId]/settings`, `/team`, `/plan`: detail acara, undangan anggota berbatas waktu, pencabutan akses, dan paket.
- `/guests`: input/edit tamu, privasi layar, pencarian, impor CSV/XLSX dengan pratinjau, validasi, deteksi calon duplikat, serta transaksi impor menyeluruh.
- `/invitations`, `/i/[publicToken]`: desain sesuai paket, QR, tautan individual, rotasi token, dan RSVP yang terpisah dari kehadiran. Daftar dipaginasi agar ribuan QR tidak dibuat sekaligus.
- `/checkin`: kamera, gambar QR, pencarian manual, kedatangan parsial, koreksi bertanda dengan alasan, idempotensi, kuota dan pencabutan sesi scanner. Koneksi internet diperlukan. Sesi perangkat terhitung aktif selama dua menit setelah transaksi terakhir.
- `/display`, `/tv`, `/display/[sessionToken]`: kode sekali pakai 15 menit ditukar menjadi sesi layar terbatas 24 jam. Sesi dapat dicabut. Sambutan memakai antrean FIFO delapan detik dan hanya menampilkan tamu yang menyetujui tampilan publik. Polling menjadi mekanisme sinkronisasi.
- `/vip`: pemantauan VIP, pembaruan lima detik, notifikasi internal Pro Plus dan konfirmasi penjemputan.
- `/reports`: rekonsiliasi ledger; Free memperoleh ringkasan CSV, paket berbayar memperoleh detail CSV/XLSX.

Tidak ada pembayaran online atau WhatsApp blast otomatis. Tautan WhatsApp membuka pesan untuk dikirim manual. Katalog layanan tambahan merupakan penawaran layanan manual; pembelian add-on, souvenir counter, dan pembayaran belum terintegrasi otomatis.

## Keamanan dan penyimpanan

Data produksi berada dalam snapshot database terenkripsi di Google Drive. Mutasi dijalankan melalui RPC yang memeriksa `auth.uid()`, profil aktif, kepemilikan, dan peran. Akses tabel langsung dibatasi; pengguna tidak dapat mengubah `is_platform_admin`, lisensi, keanggotaan atau ledger melalui tabel publik. Token mentah yang diperlukan untuk mengunduh ulang undangan disimpan pada tabel privat; pencarian menggunakan hash. Jangan memberikan akses langsung ke tabel tersebut.

Check-in mengunci baris, memeriksa kapasitas dan isi kunci idempotensi, serta mencatat audit. Ledger produksi tidak memiliki reset/penghapusan dari aplikasi. Koreksi menggunakan entri baru. Cookie tidak menyimpan salinan database. Request mutasi diverifikasi asalnya dan dibatasi 5 MB. Pesan kesalahan tidak memuat rincian koneksi database.

## Pemeriksaan

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:drive
npm run test:e2e
npm run test:concurrency
```

Tes integrasi menjalankan seluruh migration pada PostgreSQL sementara (PGlite) dengan schema Auth terisolasi. `test:concurrency` menjalankan PostgreSQL 17 sebenarnya di loopback dengan beberapa koneksi untuk menguji scan, idempotensi, perubahan kapasitas/RSVP, kuota scanner dan onboarding serentak. Data pengujian berada di `test-results/` yang diabaikan Git. Tes Drive memulihkan snapshot sungguhan ke mesin database terpisah, menjalankan konflik CAS, pencabutan sesi dan kehilangan respons commit. Tes gateway menjalankan kode Apps Script dengan layanan Google tiruan. Tes Chromium alur acara memakai **simulasi lokal**; tes browser OAuth memeriksa alur redirect dengan konfigurasi uji. Login Google cloud, Drive/Apps Script sebenarnya, kamera dan TV fisik dicatat sesuai layanan/perangkat yang tersedia.

Lihat `docs/DECISIONS.md` dan `docs/VERIFICATION.md` untuk keputusan, hasil validasi, serta status koneksi layanan terakhir.

Template GitHub Actions tersedia di `docs/workflows/ci.yml`. Pindahkan ke `.github/workflows/ci.yml` menggunakan akun/token yang memiliki izin `workflow` untuk mengaktifkannya. Kredensial sesi audit ini hanya memiliki izin `repo`, `read:org`, dan `gist`; pemeriksaan lokal tetap dijalankan secara langsung.
