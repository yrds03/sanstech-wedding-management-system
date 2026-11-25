# Catatan Keputusan Teknis & Produk (DECISIONS.md)

Dokumen ini mencatat keputusan arsitektur, produk, dan penyesuaian implementasi terhadap spesifikasi awal (`01_PRD_WEDDINGHUB.md`, `02_UX_FLOW_WIREFRAMES.md`, `03_BACKLOG_TEST_CASES.md`).

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

