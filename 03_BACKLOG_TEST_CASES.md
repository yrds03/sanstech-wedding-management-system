# WEDDINGHUB — Backlog Teknis, Sprint, dan Test Acceptance

Dokumen ini menjadi daftar pekerjaan yang dapat dieksekusi oleh coding agent. **Jangan membuat seluruh aplikasi dalam satu commit tanpa tes.** Setiap task dinyatakan selesai hanya bila fungsi nyata berjalan dengan database yang terkonfigurasi dan pemeriksaan lintas role terpenuhi.

## A. Stack dan struktur repository

- Next.js App Router + TypeScript strict + Tailwind CSS + shadcn/ui.
- Supabase Auth + PostgreSQL + RLS + Storage + Realtime (terproteksi; fallback polling).
- Zod untuk schema input; React Hook Form untuk form. Scanner library yang compatible HTTPS mobile browser; pastikan ada fallback manual.
- PDF generator **tidak diperlukan** untuk MVP. Import XLSX/CSV memakai library matang yang dipilih dan dikunci versinya; ekspor CSV dahulu.
- Vitest untuk unit, Playwright untuk E2E, integration tests dengan database lokal untuk transaksi dan RLS.
- Format/lint TypeScript; CI script `lint`, `typecheck`, `test`, `build`.

Struktur usulan:
```text
weddinghub/
├── app/
│   ├── (public)/
│   ├── auth/
│   ├── onboarding/
│   ├── app/w/[workspaceId]/
│   ├── app/e/[eventId]/
│   ├── display/[sessionId]/
│   ├── i/[publicToken]/
│   ├── admin/
│   └── api/
├── components/{ui,app,event,guests,scanner,display,reports}/
├── lib/{auth,permissions,db,validators,plans,qr,dates,errors}/
├── supabase/migrations/
├── supabase/tests/
├── tests/{unit,integration,e2e}/
├── public/
├── docs/
│   ├── 01_PRD_WEDDINGHUB.md
│   ├── 02_UX_FLOW_WIREFRAMES.md
│   └── 03_BACKLOG_TEST_CASES.md
├── .env.example
├── AGENTS.md
└── README.md
```

File folder `app/` mengikuti konvensi Next.js versi yang benar ketika implementasi; struktur di atas adalah panduan konseptual. Jangan menginstal dependensi usang tanpa pengecekan kompatibilitas.

## B. Sprint 0 — Setup yang benar

| Task | Deliverable | Acceptance |
|---|---|---|
| S0-01 | Scaffold Next.js TS strict | `npm run dev`, `npm run build` berhasil |
| S0-02 | Tailwind + shadcn/ui + design tokens | Layout responsif, accessible focus |
| S0-03 | Supabase clients server/browser | Secret admin hanya server; `.env.example` aman |
| S0-04 | Supabase migration + seeds dev | Schema reproducible, RLS semua tabel privat |
| S0-05 | Auth login/register/password reset | Protected route redirect dan session persist aman |
| S0-06 | AppShell + nav role placeholder | Nav berdasarkan server permission, bukan hardcoded globals |
| S0-07 | Error handling, lint/test setup | lint, typecheck, unit tests, build lolos |
| S0-08 | README install lokal | Semua env dan command tercatat |

Gate S0: developer dapat login di lokal, melihat app shell kosong secara autentik, dan menguji RLS deny scenario.

## C. Sprint 1 — Workspace dan event

| Task | Deliverable | Acceptance |
|---|---|---|
| S1-01 | Onboarding WO/couple | Owner tercipta, refresh tak duplikat |
| S1-02 | Workspace switcher | Multi-workspace satu user bekerja |
| S1-03 | Membuat/edit event | Detail event tervalidasi server |
| S1-04 | WO dashboard event list | Hanya event di workspace valid |
| S1-05 | Couple event overview | Couple hanya event diundang/miliknya |
| S1-06 | Invite anggota + accept/revoke | Token expired, role guard, revoke immediately effective |
| S1-07 | Audit log membership/event update | Actor dan event tersimpan |
| S1-08 | RLS test A vs B | Tidak ada cross-tenant read/write |

Gate S1: contoh dua WO dan satu pasangan yang mendapat akses pada satu event saja; pindah URL event lain -> 404/403.

## D. Sprint 2 — Tamu, kuota, undangan

| Task | Deliverable | Acceptance |
|---|---|---|
| S2-01 | Guest list CRUD, search, paging | Data event scoped; mobile cards |
| S2-02 | Category+capacity+privacy flag | Constraint kapasitas dan default false |
| S2-03 | Import template download | Template valid CSV/XLSX |
| S2-04 | Import preview/mapping/commit | Baris error jelas; quota validated server |
| S2-05 | Invitation generation | Opaque random separate public and QR tokens |
| S2-06 | QR image render/download | Token tervalidasi server, no PII inline |
| S2-07 | Free quota 50 groups | Baris ke-51 ditolak server, upgrade CTA |
| S2-08 | Token revoke/rotate admin | Token lama ditolak |

Gate S2: buat 4 orang dalam satu undangan, generate QR, tambah 50 Free, attempt 51 -> error bisnis; tidak ada data bocor lintas event.

## E. Sprint 3 — Penerimaan tamu hari-H (paling kritis)

| Task | Deliverable | Acceptance |
|---|---|---|
| S3-01 | Scanner camera + fallback manual | Mobile HTTPS; permission-denied state |
| S3-02 | QR resolve scoped event | Token event lain/revoked invalid |
| S3-03 | Server-side transaction check-in | Count tidak melebihi capacity dalam race |
| S3-04 | Idempotency key | Retry request sama tidak menambah kedua kalinya |
| S3-05 | Partial group arrivals | +2 lalu +2 kuota4 sukses; +1 ditolak |
| S3-06 | Scanner active session limit | Free=1, Pro=3, ProPlus=10; revoke session |
| S3-07 | Manual search and check-in | Role receptionist allowed, event scoped |
| S3-08 | Supervisor correction with reason | Ledger signed delta; receptionist forbidden |
| S3-09 | Status online/offline + SOP | Tidak menampilkan sukses jika gagal server |
| S3-10 | Event report basics | Aggregates exact ledger totals |
| S3-11 | Concurrency integration test | 2 simultaneous requests capacity1 -> 1 success |

Gate S3: pakai dua browser/HP untuk memindai QR sama pada waktu hampir bersamaan; hasil tetap benar secara atomik. Ini gate wajib sebelum pilot.

## F. Sprint 4 — Undangan publik dan display

| Task | Deliverable | Acceptance |
|---|---|---|
| S4-01 | Basic invitation template | Preview/publish, responsive |
| S4-02 | Public per-guest invite route | Token required; sanitized fields only |
| S4-03 | Public RSVP form | Count <= quota, rate limit, update event aggregate |
| S4-04 | Copy link + share intent | Tidak klaim sudah otomatis WA blast |
| S4-05 | Display pairing short-lived | Pair/revoke, access only event-specific sanitized state |
| S4-06 | Welcome event queue | Sequential, TTL, fallback polling |
| S4-07 | VIP public privacy | Non-opt-in never appears in public display |
| S4-08 | Display preview & settings | Default 8 sec; 5–15 configurable |

Gate S4: screen authorized tampil welcome jika allowed; privacy false -> generic welcome; revoke pairing -> display loses access.

## G. Sprint 5 — Paket, admin, hardening

| Task | Deliverable | Acceptance |
|---|---|---|
| S5-01 | Plans table seeded | Entitlements from server DB/config |
| S5-02 | Event license free default | Event selalu memiliki plan valid |
| S5-03 | Manual upgrade request | Pending state, no fake charge |
| S5-04 | Platform admin manual activation | Admin-only, audit log |
| S5-05 | Export report CSV + optional XLSX | Permissions; prevent formula injection |
| S5-06 | FeatureGate enforcement | Locked UI + server deny |
| S5-07 | Privacy & retention controls basic | User-facing notice and documented rules |
| S5-08 | Regression suite, pilot checklist | Core scenarios green; known limitations documented |

Gate S5: aplikasi end-to-end layak pilot; belum disebut production-ready sebelum pengujian keamanan, legal, backup restore, monitoring dan uji perangkat nyata.

## H. Test cases rinci (Gherkin-style)

### TC-001 Guest isolation
**Given** owner WO A login dan WO B mempunyai event B
**When** WO A memanggil API event B atau mengubah URL eventId ke B
**Then** server memberikan 404/403 dan tidak mengembalikan daftar tamu B.

### TC-002 Couple invitation
**Given** WO mempunyai event E dan mengirim member invite untuk pasangan X
**When** X membuka token yang sah, login, dan menerima
**Then** X hanya mendapat role couple pada E, bukan semua event workspace WO.

### TC-003 Expired invite
**Given** member invite telah expired
**When** digunakan
**Then** tidak memberikan akses; admin bisa mengirim undangan baru.

### TC-004 Capacity partial arrivals
**Given** invitation group kapasitas 4 dan checked-in 0
**When** receptionist check-in +2 lalu +2 dari sesi berbeda
**Then** keduanya sukses, saldo 4; permintaan +1 setelahnya ditolak.

### TC-005 Concurrent scan lock
**Given** kapasitas 1 dan saldo 0
**When** dua request check-in +1 dengan dua idempotency key unik dieksekusi hampir bersamaan
**Then** tepat satu sukses; jumlah akhir 1, satu request mendapat conflict.

### TC-006 Idempotency
**Given** check-in +1 sudah tersimpan dengan idempotency key K
**When** request sama persis dengan key K diulang setelah timeout browser
**Then** API memberikan hasil semula, dan ledger tidak mendapat penambahan kedua.

### TC-007 Correction permissions
**Given** receptionist login
**When** memanggil correction endpoint
**Then** 403. Supervisor valid dengan alasan dapat membuat delta -1 jika saldo mencukupi.

### TC-008 Cross-event QR
**Given** QR event E1
**When** di-scan pada scanner event E2
**Then** ditolak dan ledger event E2 tidak berubah.

### TC-009 Token rotation
**Given** QR aktif lalu manager melakukan regenerate/rotate
**When** QR lama dipindai
**Then** invalid; QR baru sah.

### TC-010 RSVP validation
**Given** kapasitas 3
**When** tamu meminta RSVP attending 4 orang
**Then** validation error; nilai lama tidak berubah.

### TC-011 Non-public VIP
**Given** tamu VVIP `allowed_public_display=false`
**When** check-in berhasil
**Then** check-in tercatat dan layar publik tidak menampilkan namanya; usher internal dapat menerima notifikasi sesuai plan/role.

### TC-012 Display revoke
**Given** display yang sudah paired
**When** supervisor mencabut akses
**Then** display tak bisa fetch info event berikutnya dan menampilkan fallback generik.

### TC-013 Feature quota
**Given** event Free sudah mempunyai 50 invitation groups
**When** operator mengirim request tambah ke-51 langsung via API
**Then** server menolak walau frontend dimodifikasi.

### TC-014 Export authorization
**Given** usher login
**When** meminta export seluruh daftar tamu
**Then** forbidden dan tidak ada file keluar.

### TC-015 CSV injection
**Given** nama tamu dimulai `=`, `+`, `-`, atau `@`
**When** diekspor CSV untuk spreadsheet
**Then** cell diperlakukan sebagai teks aman, bukan formula yang dieksekusi.

### TC-016 Offline behavior
**Given** browser scanner kehilangan koneksi
**When** petugas memindai QR
**Then** UI menjelaskan check-in online tidak berhasil; tidak memalsukan sukses; petugas dapat melihat SOP/manual fallback jika diizinkan.

### TC-017 Session revocation
**Given** event Free memakai satu sesi scanner
**When** scanner kedua mencoba aktif
**Then** ditolak sampai sesi lama berakhir atau dicabut oleh admin.

### TC-018 Data counters
**Given** 2 invitation groups dengan kapasitas total 5, yang pertama +2 lalu +1 dan kedua +1, correction pertama -1
**When** melihat report
**Then** invitation groups hadir=2, orang hadir=3, total kapasitas=5; audit correction tetap tersimpan.

### TC-019 Role switching
**Given** user U owner WO A dan couple pada event B milik WO C
**When** U berpindah konteks
**Then** navigation dan semua query berganti sesuai role/context, tanpa bocor data event lain.

### TC-020 Manual upgrade honesty
**Given** event Free dan belum ada payment gateway
**When** pemilik mengklik upgrade
**Then** muncul request `pending verification`, bukan status `paid/active` sampai admin memverifikasi dan mengaktifkan.

## I. Kontrak bukti pengujian developer per sprint

Setelah menyelesaikan sprint, coding agent harus mengirimkan:

1. Ringkasan fitur sungguh berfungsi vs placeholder.
2. Daftar file baru/diubah dan daftar migration.
3. Instruksi mengisi env tanpa membocorkan nilainya.
4. Perintah `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` dan hasil aktual.
5. Hasil pengujian RLS/integration dan screenshot halaman utama jika tooling tersedia.
6. Apa yang masih memerlukan kredensial, deployment, pengujian perangkat/WO nyata.
7. Tiga langkah yang pengguna perlu lakukan sendiri (mis. buat Supabase project, copy env, apply migration).

## J. Keterbatasan pilot yang harus dijelaskan kepada pengguna

- Online-first, bukan offline sync otomatis.
- Belum ada blast WhatsApp otomatis (hanya share link).
- Belum ada pembayaran gateway otomatis (aktivasi manual).
- Tampilan layar TV memerlukan perangkat dan koneksi ke event.
- Undangan v1 berbasis template, belum editor drag-and-drop.
- Semua harga bersifat uji pasar sampai diputuskan pemilik produk.
