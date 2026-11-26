# Catatan verifikasi ? 26 November 2026

## Implementasi yang diperiksa

Hosting Vercel yang sudah ada dipertahankan. Backend Supabase diganti dengan Google OpenID Connect dan snapshot PostgreSQL/PGlite terenkripsi di Google Drive. Spreadsheet/folder tujuan berasal dari tautan pemilik pada 26 November 2026. Migration lama dipindahkan utuh ke `database/migrations/`.

Lingkungan: Windows, Node.js 24.22.1, Next.js 16.4.6, React 19.3.1, PGlite 0.6.0, PostgreSQL 17.12, Vitest 5.1.1 dan Playwright 1.65.1/Chromium.

## Pemeriksaan yang sudah lulus

- `npm test`: **80 tes lulus**. SQL memakai migration yang sama dengan runtime; identitas dan sesi Google untuk pengujian dibuat secara terisolasi. Tambahan pemeriksaan mencakup header yang dapat dipasang ulang tanpa kehilangan baris, konflik header sebelum perubahan, kode login Apps Script sekali pakai, PKCE/state/nonce, expiry, pemisahan deployment serta verifikasi tanda tangan/audience/email Google.
- `npm run test:concurrency`: **5 skenario lulus** pada PostgreSQL 17.12 dengan koneksi independen: scan serentak tidak melampaui kapasitas, retry menghasilkan satu ledger, RSVP konsisten saat kapasitas berubah, kuota scanner tidak berlebih dan onboarding idempoten. Isi migration SQL tidak berubah ketika dipindahkan direktorinya.
- `npm run test:drive`: **3 skenario browser lulus pada masing-masing mode login**, total **6**: OIDC Web client langsung dan `WMS_TEST_GOOGLE_SCRIPT=1` melalui Apps Script. Alur meliputi profil baru non-admin, pembuatan workspace/acara/tamu, undangan pada konteks browser lain, RSVP, check-in parsial, laporan CSV Free, logout serta penolakan cookie lama. Masing-masing mode menolak nonce dan tanda tangan identitas palsu. Layanan Google ditiru oleh preload lokal eksplisit; aplikasi produksi dan SQL berjalan tanpa mode demo. Preload pengujian tidak diimpor aplikasi dan menolak berjalan pada Vercel.
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

- Apps Script API diaktifkan pemilik dan autentikasi CLI Google/Vercel berhasil. Proyek bound spreadsheet yang diberikan dipakai, tanpa membuat proyek pengganti. URL gateway pemilik dipertahankan.
- Delapan tab header dan kamus kolom sudah dibuat **langsung di Google Sheets**. Pengulangan menghasilkan nol tab baru; baris header juga diverifikasi dari CSV Google sebenarnya, HTTP 200. Tab lain tetap ada. Templat kolom tidak dianggap sebagai salinan transaksi: data utama tetap snapshot Drive terenkripsi.
- Akses publik Sheet dan folder ditemukan sebagai writer lalu diubah menjadi reader. Metadata Drive diverifikasi ulang untuk keduanya: hanya owner dan pembaca publik. Secret tidak dikirim ketika editor publik masih terbuka.
- Kode final gateway diterbitkan sebagai versi 6 pada deployment pemilik yang sama. Deployment login versi 5 pada proyek yang sama terverifikasi `USER_ACCESSING`/`ANYONE`, scope identitas saja; akses anonim diarahkan HTTP 302 ke login resmi Google. Jalur installer sementara sudah dihapus dari versi aktif. Cadangan sumber sebelumnya disimpan privat, tidak di Git.
- Pemasangan secret baru ke Script Properties melalui endpoint HTTPS diblokir pemeriksaan persetujuan otomatis karena belum ada izin spesifik untuk pengiriman secret ke endpoint publik. Persetujuan eksplisit diminta; operasi tersebut dan aktivasi pasangan environment Vercel menunggu jawabannya. Pengunduhan seluruh secret produksi tidak dilakukan. Tidak ada nilai rahasia di chat, laporan atau Git.
- Login Google nyata lintas akun dan penulisan snapshot produksi belum dinyatakan berhasil sebelum konfigurasi tersebut diterapkan. Pengujian browser di atas memakai layanan Google terisolasi. Kamera/TV fisik tidak terhubung ke sesi pengerjaan.
- GitHub Actions belum diaktifkan karena token Git tidak mempunyai scope `workflow`; template berada di `docs/workflows/ci.yml`. Pemeriksaan di atas dijalankan secara langsung. Integrasi GitHub?Vercel yang sudah ada dipakai untuk deployment.
- Pembayaran, WhatsApp blast dan aktivasi add-on otomatis tetap tidak dihubungkan ke penyedia eksternal. UI menjelaskan pemesanan/konfirmasi manual.

Kondisi produksi terakhir diverifikasi melalui domain dan status commit Vercel ketika pembaruan dikirim. Konfigurasi yang belum tersedia memberi HTTP 503 pada pemeriksaan layanan dan menolak akses data, tanpa akun simulasi produksi.
