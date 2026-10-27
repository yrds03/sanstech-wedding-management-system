# SANSTECH Wedding Management System (WeddingHub)

> **Tagline:** *"Satu platform untuk mengelola perjalanan tamu, dari menerima undangan sampai pulang dari acara."*

Sistem SaaS multi-workspace, multi-event, dan multi-role untuk **Wedding Organizer (WO)** dan **Calon Pengantin**. Dirancang sesuai spesifikasi `01_PRD_WEDDINGHUB.md`, `02_UX_FLOW_WIREFRAMES.md`, `03_BACKLOG_TEST_CASES.md`, dan `AGENTS.md`.

---

## Fitur yang Telah Diimplementasikan (Sprint 0 & Sprint 1)

1. **Fondasi & Desain Visual (Sprint 0):**
   - Next.js App Router + TypeScript `strict` + Tailwind CSS dengan palet resmi (`navy #15263F`, `ivory #FAF8F4`, `gold #B28A50`, `success #16805D`, `danger #C33F49`).
   - Halaman utama (`/`) berbahasa Indonesia dengan penjelasan 6 modul ekosistem, simulasi pemisahan layar VIP vs notifikasi internal usher, dan tabel paket per acara (`Free`, `Pro`, `Pro Plus`).
   - Skema penuh PostgreSQL + Row Level Security (RLS) + fungsi SQL check-in atomik (`perform_atomic_checkin`) di `supabase/migrations/20261027000001_initial_schema_and_rls.sql`.
   - Pemisahan klien Supabase Browser (`lib/db/supabase-browser.ts`) dan Server (`lib/db/supabase-server.ts`) tanpa pernah membocorkan `SUPABASE_SERVICE_ROLE_KEY` ke client.

2. **Onboarding, Multi-Workspace, Acara & Kolaborasi Tim (Sprint 1):**
   - Autentikasi (`/auth/login`, `/auth/register`, `/auth/forgot-password`) + panel penguji multi-peran pada mode pengembangan lokal.
   - Onboarding idempotent (`/onboarding`) untuk memilih peran utama: **Wedding Organizer (WO)** atau **Calon Pengantin**.
   - Pemilih workspace & akses acara lintas peran (`/app/workspaces`).
   - Dashboard Wedding Organizer (`/app/w/[workspaceId]`) dan manajemen pembuatan acara (`/app/w/[workspaceId]/events`).
   - Dashboard Ringkasan Acara (`/app/e/[eventId]`) dengan 6 metrik terpisah secara eksplisit (*Jumlah Undangan*, *Kuota Orang*, *Rencana RSVP*, *Orang Hadir*, *Grup Hadir*, *VIP Hadir*) serta riwayat Audit Log.
   - Pengaturan Acara (`/app/e/[eventId]/settings`), Sistem Undangan Anggota Tim & Pasangan dengan token berbatas waktu dan pencabutan akses (`/app/e/[eventId]/team`), serta halaman Paket & Lisensi (`/app/e/[eventId]/plan`).

---

## Persyaratan Sistem

- **Node.js** versi `18.18+` atau `20+` LTS (beserta `npm`).
- **Git** (untuk manajemen versi dan unggah ke GitHub).
- Proyek **Supabase** (untuk database PostgreSQL, Auth, dan RLS produksi/staging).

---

## Cara Menjalankan Aplikasi Secara Lokal

1. **Pasang seluruh dependensi:**
   ```bash
   npm install
   ```

2. **Siapkan variabel environment:**
   Salin `.env.example` menjadi `.env.local`, lalu isi dengan URL dan Anon Key dari dashboard Supabase Anda:
   ```bash
   cp .env.example .env.local
   ```
   *(Catatan: Jika `.env.local` belum diisi, aplikasi otomatis berjalan dalam **Mode Pengembangan Lokal / Sandbox** dengan akun uji WO A, Calon Pengantin Andi & Putri, serta WO Tenant B untuk menguji isolasi akses).*

3. **Terapkan migration database ke Supabase Anda:**
   Buka **SQL Editor** pada dashboard Supabase Anda (atau gunakan Supabase CLI), lalu jalankan isi file:
   - `supabase/migrations/20261027000001_initial_schema_and_rls.sql`

4. **Jalankan server pengembangan:**
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000` di browser.

5. **Jalankan pemeriksaan kualitas kode & pengujian:**
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

---

## Cara Upload Langsung ke GitHub Anda

Repositori Git lokal pada folder ini sudah diinisialisasi dan seluruh perubahan Sprint 0–1 telah di-commit. Untuk mengunggah ke akun GitHub Anda:

1. Buat repository kosong baru di GitHub (misalnya `sanstech-wedding-management-system`).
2. Jalankan perintah berikut di terminal pada folder proyek:
   ```bash
   git remote add origin https://github.com/USERNAME_ANDA/sanstech-wedding-management-system.git
   git branch -M main
   git push -u origin main
   ```
3. Untuk langsung dibagikan ke tim WO agar bisa diuji lewat HP/laptop, hubungkan repository GitHub tersebut ke **Vercel** (gratis), masukkan variabel `.env.local` Anda di pengaturan Vercel, dan klik **Deploy**.
