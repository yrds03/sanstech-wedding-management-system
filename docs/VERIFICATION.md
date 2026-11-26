# Catatan verifikasi ? 26 November 2026

## Implementasi yang diperiksa

Hosting Vercel yang sudah ada dipertahankan. Backend Supabase diganti dengan Google OpenID Connect dan snapshot PostgreSQL/PGlite terenkripsi di Google Drive. Spreadsheet/folder tujuan berasal dari tautan pemilik pada 26 November 2026. Migration lama dipindahkan utuh ke `database/migrations/`.

Lingkungan: Windows, Node.js 24.22.1, Next.js 16.4.6, React 19.3.1, PGlite 0.6.0, PostgreSQL 17.12, Vitest 5.1.1 dan Playwright 1.65.1/Chromium.

## Pemeriksaan yang sudah lulus

- `npm test`: **66 tes lulus**. Meliputi 38 tes unit dan 28 tes integrasi. SQL memakai migration yang sama dengan runtime; identitas dan sesi Google untuk pengujian dibuat secara terisolasi.
- `npm run test:concurrency`: **5 skenario lulus** pada PostgreSQL 17.12 dengan koneksi independen: scan serentak tidak melampaui kapasitas, retry menghasilkan satu ledger, RSVP konsisten saat kapasitas berubah, kuota scanner tidak berlebih dan onboarding idempoten. Isi migration SQL tidak berubah ketika dipindahkan direktorinya.
- `npm run test:drive`: **3 skenario browser lulus pada build produksi**. Rangkaian OAuth state/nonce/PKCE dan verifikasi JWT, profil baru non-admin, pembuatan workspace/acara/tamu, undangan pada konteks browser lain, RSVP, check-in parsial, laporan CSV Free, logout serta penolakan cookie lama. Dua skenario tambahan menolak nonce dan tanda tangan identitas palsu. Layanan Google ditiru oleh preload lokal eksplisit; aplikasi produksi dan SQL berjalan tanpa mode demo. Preload pengujian tidak diimpor aplikasi dan menolak berjalan pada Vercel.
- `npm run test:e2e`: **4 skenario lulus**. Alur acara?tamu?undangan?RSVP?check-in?ekspor XLSX dengan simulasi lokal, tampilan ponsel 390?844, penolakan CSRF/cookie palsu dan tujuan undangan pada pendaftaran. Hasil ini melengkapi tiga skenario build produksi di atas.
- Integrasi Drive memulihkan snapshot ke dua mesin terpisah dan menjalankan konflik compare-and-swap. Pengujian memeriksa isolasi tenant, aktor palsu, batas kapasitas, data publik yang disaring, pencabutan sesi, respons commit yang hilang dan pengulangan dengan kunci idempotensi yang sama, serta penolakan versi mundur berulang setelah cache dibuang.
- Pengujian gateway menjalankan `google-apps-script/Code.gs` di VM dengan layanan Google tiruan. Yang diperiksa meliputi kunci penulisan, versi, HMAC, timestamp, checksum, penolakan penulis eksternal, dan metadata spreadsheet tanpa isi snapshot. Enkripsi AES-256-GCM diuji terhadap perubahan byte serta kunci yang salah. Redirect gateway ke host lain ditolak.
- `npm run lint`, `npm run typecheck`, dan `npm run build`: selesai dengan kode keluar 0. Build mencakup pemeriksaan TypeScript. Artefak server ditelusuri: SQL dan aset WASM/data PGlite tercakup, sehingga tidak bergantung pada unduhan aset dari browser.
- `npm audit`: **0 kerentanan yang dilaporkan** pada dependensi terpasang. SDK Supabase dihapus; PGlite menjadi dependensi runtime dan `jose` memverifikasi ID token.

## Masalah yang ditemukan dan diperbaiki selama pemeriksaan

- Snapshot awal mesin database melampaui batas 4 MiB. Pengujian pada transport produksi menemukannya saat login; batas menjadi 8 MiB base64, di bawah batas `File.setContent` Google 10 MB. Pengujian database saja dengan penyimpanan tanpa batas tidak dipakai sebagai bukti transport siap.
- Pembuatan ulang mesin database pada setiap operasi menambah waktu dan alokasi memori. Mesin boleh dipakai ulang setelah versi/checksum Drive diperiksa kembali. Konflik atau respons commit yang hilang membuang cache; operasi tidak memakai salinan lama sebagai cadangan ketika Drive gagal.
- Intersepsi Playwright awal tidak menangkap tujuan redirect karena routing hanya berlaku pada permintaan pertama dalam rantai. Fixture diperbaiki untuk memeriksa respons POST sesungguhnya lalu membuka tujuan Google secara terpisah.
- Tes ekspor build produksi semula meminta format default Excel pada paket Free dan ditolak HTTP 403 sesuai aturan. Tes kini menggunakan tautan CSV yang benar dari halaman laporan; hak paket tidak dilonggarkan.

- Permintaan masuk dibatasi 4 MiB, di bawah batas platform Vercel 4,5 MB. Pratinjau impor menghitung ukuran formulir setelah pengodean Unicode dan normalisasi baris, lalu menolak pengiriman terlalu besar. Snapshot Drive 8 MiB dikirim antarlayanan dan tidak menjadi payload dari browser.

## Kondisi akun dan layanan

- Kedua tautan Google yang diberikan dapat dibaca tanpa login. Ekspor CSV spreadsheet kosong saat diperiksa. Belum ada perubahan pada isi atau izin berbagi layanan Google dari sesi pengerjaan ini.
- `Code.gs` sudah memakai ID folder dan spreadsheet tersebut sebagai tujuan default. `setupStorage` membuat berkas terenkripsi dan tab `SANSTECH_Status` tanpa menghapus tab lain. Tab status hanya berisi metadata operasional; data tamu, identitas, token, sesi dan key tidak disalin ke sheet yang terbaca publik.
- Konektor Google Drive belum terpasang/terhubung; tidak ada sesi kontrol Google Sheets, kredensial Apps Script CLI, Google Cloud ADC, Vercel CLI atau `.env.local` yang terkonfigurasi di lingkungan ini. Tautan berbagi tidak menyediakan izin OAuth untuk menerbitkan Apps Script atau mengatur environment Vercel.
- Aktivasi akun memerlukan deployment Apps Script `/exec`, secret gateway, kunci enkripsi tersendiri, OAuth Web client Google dan environment proyek Vercel. Langkah persisnya tersedia pada `docs/GOOGLE_DRIVE_SETUP.md`. Rahasia tidak diminta melalui chat atau disimpan dalam Git.
- Login Google cloud, akses tulis ke Drive/Sheets dari akun pemilik, latensi/kuota Google sebenarnya dan alur lintas akun pada domain produksi diperiksa setelah konfigurasi runtime tersedia. Kamera/TV fisik tidak terhubung ke sesi pengerjaan.
- GitHub Actions belum diaktifkan karena token Git tidak mempunyai scope `workflow`; template berada di `docs/workflows/ci.yml`. Pemeriksaan di atas dijalankan secara langsung. Integrasi GitHub?Vercel yang sudah ada dipakai untuk deployment.
- Pembayaran, WhatsApp blast dan aktivasi add-on otomatis tetap tidak dihubungkan ke penyedia eksternal. UI menjelaskan pemesanan/konfirmasi manual.

Kondisi produksi terakhir diverifikasi melalui domain dan status commit Vercel ketika pembaruan dikirim. Konfigurasi yang belum tersedia memberi HTTP 503 pada pemeriksaan layanan dan menolak akses data, tanpa akun simulasi produksi.
