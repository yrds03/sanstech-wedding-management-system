# SANSTECH Wedding Management System

Aplikasi berbahasa Indonesia untuk WO dan pengantin: workspace, acara, tim, undangan digital, RSVP, check-in parsial, TV sambutan, dan laporan.

## Menjalankan lokal

Gunakan Node.js **24 LTS** dan npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Isi URL dan anon key Supabase untuk menggunakan autentikasi/database sebenarnya. Untuk **simulasi lokal saja**, kosongkan kedua nilai tersebut dan isi `LOCAL_DEMO_MODE=true`. Akun pengujian tampil di `/auth/login`. Data simulasi disimpan di `.local-data/` yang diabaikan Git. Jangan masukkan data pribadi sungguhan ke simulasi.

Mode simulasi selalu ditolak pada build produksi/Vercel. Tanpa konfigurasi database, halaman publik tetap terbuka; dashboard menampilkan status penyiapan dan API privat mengembalikan 503. Tidak ada login produksi dengan email saja atau kata sandi bawaan.

## Menyiapkan Supabase

1. Pilih proyek Supabase yang benar, ambil cadangan, dan tinjau migration sebelum penerapan.
2. Terapkan seluruh file `supabase/migrations/` sesuai urutan nama. Migration baru adalah `20261125000002_production_repository.sql`. Jangan menjalankan ulang migration awal pada database yang sudah memilikinya.
3. Atur `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` pada environment lokal/Vercel. Runtime aplikasi tidak membutuhkan service-role key.
4. Pada Supabase Auth, atur Site URL dan Redirect URLs untuk `https://DOMAIN/auth/callback`, termasuk hostname preview yang memang digunakan. Aktifkan konfirmasi email. Konfigurasikan SMTP untuk pengiriman email produksi dan uji email verifikasi serta pemulihan dari kotak masuk sebenarnya.
5. Daftar melalui aplikasi. Profil dibuat oleh trigger database. Akun baru selalu non-admin. Penetapan administrator dilakukan oleh pemilik database melalui konsol SQL terkontrol untuk **UUID akun yang sudah diverifikasi**, bukan dari browser.
6. Acara baru selalu memiliki paket Free. Permintaan paket berbayar dicatat; aktivasi dilakukan administrator setelah verifikasi pembayaran manual melalui `/admin`.

Versi lama menggunakan data simulasi cookie/memori sementara. Data tersebut tidak otomatis menjadi data Supabase. Ekspor dan tinjau data lama sebelum pemindahan; aplikasi tidak menerima cookie lama sebagai sumber data atau identitas.

## GitHub dan Vercel

Repository: https://github.com/yrds03/sanstech-wedding-management-system

Proyek Vercel yang terdeteksi: `yrds/sanstech-wedding-management-system`. Push ke `main` memicu integrasi deployment yang sudah terpasang. Gunakan Node.js 24, perintah instalasi `npm ci`, build `npm run build`, serta environment Supabase untuk target Production dan Preview yang digunakan. `NEXT_PUBLIC_APP_URL` boleh kosong agar tautan menggunakan hostname Vercel; isi origin HTTPS jika memakai domain sendiri.

Perubahan skema **tidak dijalankan otomatis** saat deployment. Publikasi kode saja tidak membuktikan layanan Supabase/SMTP sudah dikonfigurasi. Uji staging, periksa hasil CI dan deployment, lalu jalankan uji lintas perangkat pada domain produksi.

## Alur yang tersedia

- `/auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`: Supabase Auth dan callback verifikasi.
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

Data produksi memakai tabel PostgreSQL bersama. Mutasi dijalankan melalui RPC yang memeriksa `auth.uid()`, profil aktif, kepemilikan, dan peran. Akses tabel langsung dibatasi; pengguna tidak dapat mengubah `is_platform_admin`, lisensi, keanggotaan atau ledger melalui tabel publik. Token mentah yang diperlukan untuk mengunduh ulang undangan disimpan pada tabel privat; pencarian menggunakan hash. Jangan memberikan akses langsung ke tabel tersebut.

Check-in mengunci baris, memeriksa kapasitas dan isi kunci idempotensi, serta mencatat audit. Ledger produksi tidak memiliki reset/penghapusan dari aplikasi. Koreksi menggunakan entri baru. Cookie tidak menyimpan salinan database. Request mutasi diverifikasi asalnya dan dibatasi 5 MB. Pesan kesalahan tidak memuat rincian koneksi database.

## Pemeriksaan

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Tes integrasi menjalankan seluruh migration pada PostgreSQL sementara (PGlite) dengan schema Auth terisolasi. Ini menguji kontrak SQL, hak akses, token, impor, dan ledger tanpa menyentuh produksi. Tes Chromium menjalankan alur UI dengan **simulasi lokal**. Kedua jenis tes tidak menggantikan uji Supabase Auth/SMTP, RLS pada proyek sebenarnya, balapan transaksi dari beberapa koneksi, kamera fisik, TV, dan pilot acara nyata.

Lihat `docs/DECISIONS.md` dan `docs/VERIFICATION.md` untuk keputusan serta bukti validasi terakhir. Jangan menyatakan aplikasi bebas bug berdasarkan build atau tes otomatis saja.

Template GitHub Actions tersedia di `docs/workflows/ci.yml`. Pindahkan ke `.github/workflows/ci.yml` menggunakan akun/token yang memiliki izin `workflow` untuk mengaktifkannya. Kredensial sesi audit ini hanya memiliki izin `repo`, `read:org`, dan `gist`; pemeriksaan lokal tetap dijalankan secara langsung.
