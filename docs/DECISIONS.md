# Catatan Keputusan Teknis & Produk (DECISIONS.md)

Dokumen ini mencatat keputusan arsitektur, produk, dan penyesuaian implementasi terhadap spesifikasi awal (`01_PRD_WEDDINGHUB.md`, `02_UX_FLOW_WIREFRAMES.md`, `03_BACKLOG_TEST_CASES.md`).

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

