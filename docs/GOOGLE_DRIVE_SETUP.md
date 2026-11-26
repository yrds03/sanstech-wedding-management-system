# Mengaktifkan Google Drive dan login Google

Hosting tetap memakai proyek Vercel `yrds/sanstech-wedding-management-system`. Supabase tidak digunakan. Penyimpanan berupa satu berkas database terkompresi dan terenkripsi AES-256-GCM di Google Drive pemilik aplikasi; Google Sheets tidak diperlukan.

## 1. Pasang gateway di akun Google pemilik

1. Buka [spreadsheet tujuan](https://docs.google.com/spreadsheets/d/1uGUbw8vMLeZrbIWxiHZ7BWEde5n55cDmxRTY9B4rYBA/edit) dengan akun pemilik, lalu **Extensions ? Apps Script**. Beri nama proyek `SANSTECH WMS Storage`.
2. Salin isi `google-apps-script/Code.gs` ke `Code.gs`.
3. Di **Project Settings**, tampilkan `appsscript.json`, lalu salin manifest dari `google-apps-script/appsscript.json`.
4. Buat secret acak di komputer Anda, misalnya dengan `node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"`. Simpan dalam pengelola rahasia. Jangan menulisnya ke Git atau mengirimnya melalui chat.
5. Di **Project Settings → Script Properties**, buat `DRIVE_GATEWAY_SECRET` berisi secret tersebut.
6. Jalankan fungsi `setupStorage` dari editor dan setujui akses Drive yang diminta Google untuk akun pemilik. Fungsi ini membuat `database.encrypted.snapshot.json` pada [folder yang Anda berikan](https://drive.google.com/drive/folders/1GcHlIs-dL1ZbRMaZNHcDeYByHeeoFzP7), mencatat `DRIVE_FILE_ID`, dan menambah tab `SANSTECH_Status` pada spreadsheet. Tab lain tidak dihapus. Menjalankannya lagi mempertahankan berkas yang sudah ada. Folder/spreadsheet default sudah diisi dari tautan Anda; `DRIVE_FOLDER_ID`/`DRIVE_SHEET_ID` pada Script Properties dapat menggantinya untuk staging.
7. Pilih **Deploy → New deployment → Web app**. Atur **Execute as: Me** dan **Who has access: Anyone**. Endpoint dapat dijangkau Vercel, tetapi operasi wajib memakai HMAC yang hanya diketahui server. Kedua tautan yang diberikan dapat dibaca tanpa login. Karena itu isi database wajib terenkripsi, sedangkan spreadsheet hanya memuat status/versi/ukuran penyimpanan. Tidak ada nama, kontak tamu, sesi, token atau key yang ditulis ke spreadsheet. Penulis eksternal pada file/folder database ditolak agar pihak lain tidak dapat mengganti snapshot.
8. Salin URL deployment yang berakhir `/exec`. Gunakan URL deployment, bukan URL editor atau `/dev`.

Setelah mengubah kode gateway, buat versi deployment baru melalui **Manage deployments**. Memasang konektor Google Drive di ChatGPT saja tidak menerbitkan Apps Script atau menyediakan kredensial OAuth untuk situs Vercel.

## 2. Buat kredensial login Google

1. Pada https://console.cloud.google.com/ pilih/buat proyek milik Anda.
2. Buka **Google Auth Platform**. Lengkapi branding, email dukungan dan audience. Jika masih dalam mode Testing, tambahkan email pengguna sebagai test users; untuk pemakaian umum, selesaikan publikasi sesuai persyaratan Google.
3. Buat **OAuth client → Web application**.
4. Daftarkan redirect URI persis:
   `https://sanstech-wedding-management-system.vercel.app/auth/callback`
5. Salin Client ID dan Client Secret ke pengelola environment. Login hanya meminta `openid email profile`; tamu/petugas tidak diminta memberikan akses Drive pribadi mereka.

Domain sendiri atau environment preview memerlukan redirect URI dan origin aplikasi masing-masing. Jangan memakai database/gateway produksi untuk pengujian yang mengubah data.

## 3. Isi environment pada proyek Vercel yang sudah ada

| Environment | Nilai |
| --- | --- |
| `DRIVE_GATEWAY_URL` | URL Web App Apps Script `/exec` |
| `DRIVE_GATEWAY_SECRET` | Sama dengan Script Properties; minimal 32 karakter acak |
| `DRIVE_ENCRYPTION_KEY` | Kunci terpisah: 32 byte acak dalam 64 karakter hex; hanya di Vercel/pengelola rahasia |
| `GOOGLE_CLIENT_ID` | OAuth Web client ID Google |
| `GOOGLE_CLIENT_SECRET` | OAuth Web client secret Google |
| `NEXT_PUBLIC_APP_URL` | `https://sanstech-wedding-management-system.vercel.app` |

Buat `DRIVE_ENCRYPTION_KEY` dengan perintah generator yang sama, sebagai nilai acak **berbeda**. Kunci enkripsi tidak disimpan di Apps Script atau spreadsheet. Simpan salinan kunci secara aman; kehilangan kunci membuat database tidak dapat dipulihkan. Pergantian kunci memerlukan dekripsi dengan kunci lama dan enkripsi ulang dengan kunci baru saat penulisan dihentikan. Secret gateway dapat diganti terpisah tanpa mengganti kunci enkripsi.

Semua nilai kecuali origin bersifat server-only. Tidak ada environment `NEXT_PUBLIC_SUPABASE_*` yang dibaca aplikasi. Redeploy setelah mengganti environment. `vercel.json` menetapkan durasi API 60 detik agar pemrosesan Drive tidak terpotong oleh batas default proyek lama.

Untuk lokal, isi `.env.local` dari `.env.example`. Buat OAuth client/redirect `http://localhost:3000/auth/callback` dan gateway/file pengujian terpisah. Jangan mengaktifkan `LOCAL_DEMO_MODE` pada hosting.

## 4. Aktivasi dan pemeriksaan akun

1. Buka `/api/health`: hasil harus HTTP 200 dengan `storage: google_drive`, `database: connected`, `auth: google`.
2. Masuk melalui **Lanjutkan dengan Google**. Profil terbuat tanpa data contoh; akun baru bukan admin platform.
3. Buat workspace/acara, tambahkan tamu, buka undangan dari browser lain, isi RSVP, lakukan check-in, lalu buka kembali dari perangkat berbeda. Pastikan perubahan tersimpan.
4. Ulangi check-in dengan kunci idempotensi yang sama; jumlah ledger tidak bertambah. Permintaan bersamaan tidak boleh melampaui kapasitas.
5. Keluar lalu pastikan cookie lama ditolak. Uji akun kedua yang tidak memiliki keanggotaan untuk memastikan acara tidak terbaca.

Pemilik dapat mengangkat akun Google yang sudah pernah masuk menjadi admin melalui `npm run drive:admin -- email@example.com` pada komputer yang memiliki `.env.local` berisi gateway/secret. Alat ini menampilkan UUID dan email target serta meminta pengetikan `GRANT` sebelum mengubah satu akun tersebut. Tidak tersedia endpoint web untuk mengangkat diri menjadi admin.

## Penyimpanan dan kapasitas

- PostgreSQL/PGlite menjalankan aturan akses dan transaksi di server Vercel. Hasilnya disimpan sebagai snapshot gzip di Drive. Cookie hanya membawa token sesi acak; database tidak dikirim ke browser.
- Apps Script memakai `ScriptLock` dan versi yang harus cocok. Proses yang kalah membaca ulang snapshot lalu mengulang transaksi; tidak menimpa data proses lain. Respons sukses baru diberikan setelah Drive menerima hasil commit.
- Kegagalan jaringan setelah commit dapat membuat klien belum menerima konfirmasi. Check-in harus diulang dengan kunci idempotensi yang sama. Jangan mengganti kunci untuk pengulangan transaksi yang sama.
- Penulisan seluruh aplikasi melalui satu berkas. Batas aplikasi adalah 8 MiB data base64 terkompresi; penulisan ditolak ketika batas terlampaui. Kuota dan keterlambatan Google Drive/Apps Script tetap berlaku. Ukur waktu check-in pada akun sebenarnya sebelum menerima beban acara; tes lokal tidak mengukur kapasitas layanan Google.
- Mesin PGlite dikunci pada versi `0.6.0`. Perubahan versi minor membutuhkan prosedur ekspor/impor yang diuji; jangan mengganti format snapshot secara diam-diam.
- Cadangkan berkas terenkripsi sebelum pembaruan skema. Riwayat revisi Drive bukan kebijakan cadangan yang lengkap. Jangan menaruh kunci enkripsi pada folder tersebut. Jangan mengedit isi berkas atau memulihkan versi lama ketika masih ada petugas aktif; hentikan penulisan, simpan salinan kondisi terakhir, dan verifikasi rekonsiliasi ledger setelah pemulihan.
- Migration di `database/migrations/` dimuat pada salinan database server dan tersimpan bersama commit berikutnya. Kerusakan/checksum yang tidak cocok menghentikan operasi; aplikasi tidak menggantinya dengan database kosong.

Panduan resmi: [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web), [LockService](https://developers.google.com/apps-script/reference/lock/lock-service), [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [kuota Apps Script](https://developers.google.com/apps-script/guides/services/quotas), [snapshot PGlite](https://pglite.dev/docs/api#dumpdatadir).
