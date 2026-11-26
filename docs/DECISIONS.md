# Catatan Keputusan Teknis & Produk (DECISIONS.md)

Dokumen ini mencatat keputusan arsitektur, produk, dan penyesuaian implementasi terhadap spesifikasi awal (`01_PRD_WEDDINGHUB.md`, `02_UX_FLOW_WIREFRAMES.md`, `03_BACKLOG_TEST_CASES.md`).

## DEC-011: Audit uji coba, layanan yang tersedia dan panduan

- **Tanggal:** 26 November 2026. Pemilik memastikan batas paket Free/Pro tetap dipakai; tidak ada pembukaan seluruh fitur secara gratis atau perubahan harga bisnis.
- Katalog publik hanya menampilkan permintaan layanan manual. Extra Quota +250, perpanjangan arsip dan modul souvenir berstatus `unavailable`, tidak ditawarkan sebagai fitur aktif. Mengubah harga add-on tidak memberikan entitlement atau menambah kuota.
- Template CSV/XLSX hanya berisi header. Ilustrasi nama dan statistik tamu contoh pada beranda dihapus. Panduan ditulis ulang mengikuti login Google serta alur aktual; akses laporan setelah acara dibedakan dari masa aktif akun.
- Impor membersihkan isi lama ketika file baru dipilih, mengunci submit selama pembacaan/kesalahan, dan mengabaikan hasil pembacaan lama jika pilihan sudah berubah. Validasi memeriksa kapasitas wajib, izin TV, jumlah kolom, panjang isian dan sisa kuota. Free menampilkan pembatasan fitur sebelum pengguna mengunggah file.
- Pesan operator memakai URL penuh `/tv?code=...`. Kode pairing bukan token sesi `/display/...`. Klaim tampil dalam waktu pasti dihapus. Aksi admin tidak dikenal dan identitas acara/paket tidak valid ditolak sebelum perubahan harga/lisensi.
- `drive:audit` merupakan audit hanya-baca. Pengujian browser menonaktifkan konfigurasi cloud pada proses simulasi dan tidak memakai server lain yang mungkin membawa kredensial produksi. Fixture pengujian tetap terpisah dari data aplikasi produksi.
- Konfigurasi cloud pengujian dinonaktifkan dengan nilai sentinel nonkosong dan pemeriksaan status sebelum skenario lokal. Ini menghindari perbedaan perlakuan environment kosong antarhost. Build produksi juga menguji timeout Google yang disengaja lalu pemulihan melalui `retry()` Next.js 16; exception DOM dinormalisasi sebelum masuk renderer server.

## DEC-012: Konfirmasi snapshot yang tidak berubah

- **Tanggal:** 26 November 2026. Pembacaan berulang sebelumnya mengunduh sekitar 6,4 MB walaupun versi sama.
- Gateway tetap membaca Drive dan memeriksa akses privat, format, checksum serta versi di bawah ScriptLock. Jika versi **dan** checksum cocok dengan salinan server Vercel, respons hanya mengonfirmasi metadata. Jika berbeda, snapshot penuh dikirim kembali. Klien lama tetap menerima snapshot penuh.
- Salinan lokal hanya digunakan setelah konfirmasi jaringan berhasil. Kegagalan jaringan, konfirmasi tidak sesuai atau versi mundur tidak memakai cache sebagai cadangan. CAS dan kunci idempotensi tetap berlaku.
- Verifikasi Google sebenarnya pada database versi 1 menghasilkan respons penuh 6.400.939 byte dan konfirmasi 169 byte. Satu pengukuran memerlukan sekitar 6,3 detik dan 2,9 detik; ini bukti ukuran respons, bukan jaminan latency atau kapasitas acara.

## DEC-009: Tujuan Drive/Sheets pengguna dan enkripsi snapshot

- **Tanggal:** 26 November 2026. Pengguna memberikan spreadsheet `1uGUbw8vMLeZrbIWxiHZ7BWEde5n55cDmxRTY9B4rYBA` dan folder `1GcHlIs-dL1ZbRMaZNHcDeYByHeeoFzP7`. Keduanya terbaca melalui tautan tanpa login; ekspor CSV spreadsheet masih kosong saat diperiksa.
- Snapshot di folder tersebut memakai AES-256-GCM dengan kunci 32 byte terpisah yang hanya berada di server. GCM memverifikasi integritas sebelum pemulihan. Secret gateway dapat diputar tanpa mengubah kunci enkripsi. Akses penulis eksternal pada file/folder database ditolak; izin berbagi pengguna tidak diubah otomatis.
- Spreadsheet dipakai sebagai panel `SANSTECH_Status`: status koneksi, versi commit, waktu, ukuran, dan metode penyimpanan. Data tamu, identitas, sesi, token, database dan key tidak ditulis ke sheet yang terbaca publik. Tab lain tidak ditimpa.
- Kegagalan pembaruan panel tidak membatalkan check-in yang sudah committed. Nomor versi authoritative tetap berada dalam berkas terenkripsi di Drive, diperiksa di bawah ScriptLock. Mesin database boleh dipakai ulang hanya setelah nomor versi dan checksum Drive diperiksa lagi; konflik atau respons commit yang hilang membuang cache lokal.
- Tes pada build produksi menemukan snapshot awal lebih besar dari batas 4 MiB sebelumnya. Batas dinaikkan menjadi 8 MiB base64, masih di bawah batas `DriveApp.File.setContent` 10 MB. Tes melalui transport sebenarnya menjaga batas ini, sehingga tes database tidak hanya memakai penyimpanan tiruan tanpa batas ukuran.

## DEC-008: Google Drive menggantikan Supabase atas instruksi pengguna

- **Tanggal:** 25 November 2026. Keputusan ini menggantikan ketergantungan layanan Supabase pada DEC-004/007; aturan ledger dan akses tetap berlaku.
- PostgreSQL/PGlite 0.6.0 menjalankan SQL yang sama di server. Snapshot gzip disimpan pada satu berkas privat Google Drive melalui Apps Script. ScriptLock dan compare-and-swap versi melindungi penulisan antarproses; perubahan yang kalah diulang dari versi baru.
- Identitas memakai Google OpenID Connect: state/nonce/PKCE, verifikasi tanda tangan ID token, issuer, audience dan email terverifikasi. Sesi acak disimpan sebagai hash di database, berlaku tujuh hari, dapat dicabut. Akun baru non-admin; tidak ada seed produksi atau login email saja.
- Tidak ada Supabase SDK, Auth, URL atau key pada runtime. Nama schema `auth` dan kontrak `wms_repository` dipertahankan sebagai batas internal SQL, bukan layanan Supabase. Histori migration lama dipindah utuh ke `database/migrations/`.
- Vercel tetap menjadi hosting. Google Sheets tidak wajib. Koneksi plugin Google Drive bukan kredensial runtime; Apps Script dan OAuth memerlukan konfigurasi akun Google pemilik.
- Batas snapshot aplikasi adalah 8 MiB base64. Satu berkas menserialkan semua penulisan; kuota dan latency akun Google harus diukur pada deployment sebenarnya. Respons sukses check-in menunggu konfirmasi commit Drive, dan retry mempertahankan kunci idempotensi.
- Panduan pemasangan, pemulihan, pembatasan akses Drive dan pemberian admin lokal tersedia di `docs/GOOGLE_DRIVE_SETUP.md`. Tidak ada backend pengganti yang dipasang diam-diam ketika file rusak atau konfigurasi belum tersedia.

## DEC-010: Header otomatis dan login melalui proyek Apps Script yang sudah ada

- **Tanggal:** 26 November 2026. Pemilik menyediakan ID editor dan meminta proyek yang sama digunakan. Proyek bound spreadsheet dipertahankan; akses editor publik pada Sheet/folder ditutup dan diverifikasi menjadi pembaca sebelum penyediaan secret.
- Delapan tab header beserta kamus kolom dibuat dengan preflight konflik dan tanpa menghapus tab/baris lain. Tab ini adalah templat; transaksi tetap tersimpan pada snapshot Drive terenkripsi, bukan salinan data pribadi di Sheet publik.
- Login dapat menggunakan deployment kedua di proyek yang sama dengan eksekusi `USER_ACCESSING`, hanya scope identitas. Versi storage mempertahankan eksekusi pemilik dan URL yang diberikan. Mode deployment melarang operasi storage pada endpoint login serta penerbitan identitas dari endpoint pemilik.
- Identitas berasal langsung dari `ScriptApp.getIdentityToken`, bukan dari input pengguna. Kode acak sekali pakai disimpan dua menit pada ScriptCache, terikat state/nonce dan PKCE, lalu dikonsumsi di bawah ScriptLock melalui HMAC gateway. Node memeriksa proyek broker dan tanda tangan token Google, issuer, audience dari record broker tepercaya, masa berlaku dan email terverifikasi. Tidak ada ID token/PII pada URL atau HTML. OIDC Web client langsung tetap didukung.
- Tidak ada proyek Supabase/Google baru atau layanan berbayar yang dibuat. Pemasangan secret dilakukan terpisah secara privat setelah izin yang diperlukan tersedia. Token CLI dan konfigurasi lokal berada di file yang diabaikan Git/lint.

## DEC-007: Penguncian lintas operasi dan pembatasan respons petugas

- **Tanggal:** 25 November 2026.
- Migration `20261125000003_transaction_and_privacy_guards.sql` menambahkan lapisan validasi di depan dispatcher lama dan mencabut akses langsung ke dispatcher internal. Urutan kunci dibuat konsisten: acara lalu grup undangan, termasuk RSVP, perubahan kapasitas, rotasi token, pencabutan anggota dan check-in.
- PostgreSQL 17 dengan koneksi independen dipakai untuk menguji balapan sebenarnya. Perubahan kapasitas dan RSVP tidak dapat melewati satu sama lain; idempotensi dan kuota tetap berlaku pada permintaan bersamaan.
- Fungsi dengan hak khusus menggunakan `search_path=public,pg_temp` dan hak membuat objek di schema publik dicabut dari role API. Tes memastikan tabel sementara palsu tidak dapat mengganti sumber otorisasi.
- Viewer hanya menerima ringkasan yang diperlukan, respons petugas scanner tidak memuat nomor kontak/catatan privat, dan Usher tidak menerima token QR. Sambutan kedatangan dibatalkan saat koreksi mengembalikan kehadiran menjadi nol.
- Endpoint sensitif memakai `no-store`, `noindex` dan kebijakan referer `same-origin` agar token tidak ikut dikirim ke situs luar tanpa menghilangkan Origin pada formulir internal. Tautan peta dibatasi ke rute peta, bukan sekadar hostname yang juga dapat menyediakan pengalih URL. Tujuan undangan dipertahankan saat anggota baru membuka pendaftaran.
- Pengguna memastikan hosting Vercel sudah ada dan proyek Supabase belum dibuat. Penghalang konfigurasi diperlakukan sebagai langkah koneksi akun yang konkret; pembuatan proyek tidak dinyatakan terjadi sebelum ada hasil API layanan.

## DEC-004: Penyimpanan dan autentikasi produksi yang sebenarnya

- **Tanggal:** 25 November 2026.
- **Temuan:** implementasi sebelumnya menganggap email/ID simulasi sebagai login, menyimpan database seluruh tenant di cookie, memulihkan acara tanpa bukti kepemilikan, menerima undangan portabel tanpa verifikasi sumber, dan membuka acara pertama untuk kode TV sembarang. Fungsi SQL check-in awal belum memeriksa aktor atau peran dan profil dapat mengubah flag admin.
- **Keputusan:** produksi menggunakan Supabase Auth dan repository PostgreSQL melalui RPC yang memverifikasi `auth.uid()`. RLS dipertahankan dan hak akses tabel/fungsi dipersempit. Simulasi dipindahkan ke repository khusus yang ditolak pada Vercel dan `NODE_ENV=production`. Cookie tidak menjadi sumber data; tidak ada pemulihan kepemilikan berdasarkan URL.
- **Konsekuensi:** deployment tanpa environment/migration Supabase tidak membuka dashboard atau akun uji. Data simulasi versi lama perlu diekspor dan ditinjau sebelum pemindahan; tidak diterima otomatis sebagai data produksi. Tidak ada penerapan migration produksi otomatis dari build.

## DEC-005: Transaksi, token dan layar bersama

- Kuota undangan dan sesi scanner ditegakkan di database. Acara baru selalu Free; pilihan paket berbayar menjadi permintaan yang menunggu verifikasi manual.
- Check-in memakai kunci transaksi, penguncian grup, validasi kapasitas, pembandingan payload idempotensi, serta audit. Koreksi bertanda membuat entri baru. Reset ledger produksi dinonaktifkan.
- Token publik dan QR berbeda, acak, serta dapat dirotasi. Hash dipakai untuk pencarian. Salinan token mentah untuk unduh ulang tetap berada pada tabel privat yang tidak dapat dibaca langsung oleh pengguna API.
- Kode TV sekali pakai memiliki masa berlaku 15 menit, ditukar menjadi token sesi 24 jam dan dapat dicabut. Display memakai antrean FIFO delapan detik, filter opt-in, payload minimum dan polling. Notifikasi VIP Pro Plus mempunyai konfirmasi penjemputan dan tetap privat.
- Impor produksi satu transaksi: baris salah, calon duplikat atau kelebihan kuota membatalkan seluruh batch. CSV mendukung kutip dan baris baru; XLSX dibatasi ukuran terkompresi, hasil ekstraksi, baris dan kolom. Pembuatan QR dipaginasi untuk menghindari respons HTML berlebihan.

## DEC-006: Versi dan batas bukti pengujian

- Next.js 14 yang tidak lagi didukung diganti Next.js 16.4.6, React 19, Supabase SSR terbaru, Zod 4 dan Vitest 5. API request asinkron, proxy, ESLint CLI dan konfigurasi build disesuaikan. Runtime ditetapkan Node.js 24 LTS.
- Tes PostgreSQL sementara menjalankan migration sebenarnya dengan schema Auth terisolasi. Tes browser memakai simulasi lokal. Hasil tersebut tidak membuktikan konfigurasi, SMTP, sesi Supabase, kamera fisik, TV, beban atau konkurensi multi-koneksi pada produksi.
- Layanan yang belum otomatis tersedia diberi penjelasan manual/Segera hadir. Tidak ada klaim pembayaran, WhatsApp blast, souvenir counter atau add-on kuota yang aktif tanpa implementasi.

## DEC-001: Penamaan Brand Publik vs Nama Teknis
- **Tanggal:** 27 Oktober 2026
- **Konteks:** Dokumen PRD menggunakan nama kerja `WeddingHub`, sedangkan pengguna meminta nama aplikasi **"SANSTECH Wedding Management System"** dengan tagline konsep **"Satu platform untuk mengelola perjalanan tamu, dari menerima undangan sampai pulang dari acara"**.
- **Keputusan:** Seluruh tampilan publik, judul halaman, metadata, dan komponen UI menggunakan brand **"SANSTECH Wedding Management System"** (atau singkatnya **SANSTECH WMS** pada ruang sempit). Struktur kode dan variabel internal tetap bersih dan konsisten dengan arsitektur dokumen.

## DEC-002: Target Pengguna Utama (Keduanya: WO & Calon Pengantin)
- **Tanggal:** 27 Oktober 2026
- **Konteks:** Pengguna memilih opsi **"Keduanya"** (Wedding Organizer dan Calon Pengantin langsung).
- **Keputusan:** Alur `/onboarding` mendukung pemilihan peran utama (`wo` untuk bisnis multi-acara dan `personal` untuk pasangan calon pengantin). Satu akun juga dapat menjadi anggota di beberapa workspace maupun acara berbeda dengan role spesifik (`workspace_owner`, `workspace_admin`, `event_manager`, `couple`, `supervisor`, `receptionist`, `usher`, `viewer`).

## DEC-003: Mode Pengembangan Lokal & Keamanan Kredensial Supabase
- **Tanggal:** 27 Oktober 2026
- **Konteks:** Aplikasi wajib menggunakan skema PostgreSQL + RLS Supabase yang nyata, tanpa mengekspos `SUPABASE_SERVICE_ROLE_KEY` ke client dan tanpa memalsukan status produksi.
- **Keputusan:**
  1. Seluruh skema tabel, indeks, constraint, fungsi atomik check-in (`perform_atomic_checkin`, `perform_checkin_correction`), dan kebijakan RLS ditulis lengkap pada `supabase/migrations/20261027000001_initial_schema_and_rls.sql`.
  2. Ketika variabel environment Supabase belum dikonfigurasi oleh developer/pengguna, aplikasi menampilkan banner status konfigurasi yang jujur dan menyediakan repositori pengujian terisolasi untuk memverifikasi alur UI/RBAC/validasi pada lingkungan pengembangan lokal/demo tanpa mengklaim terhubung ke database produksi.

