# PRD WEDDINGHUB — Sistem Undangan & Penerimaan Tamu Pernikahan

**Versi dokumen:** 1.0 | **Tanggal:** 27 Oktober 2026 | **Bahasa produk:** Indonesia | **Status:** Spesifikasi awal siap implementasi bertahap

> Nama **WeddingHub** adalah nama kerja/placeholder, bukan merek final. Spesifikasi ini menetapkan asumsi MVP secara eksplisit; jika detail belum ditentukan, terapkan default tertulis di sini. Jangan menciptakan fitur pembayaran/WhatsApp yang seolah telah terhubung ke layanan nyata.

## 1. Visi, masalah, tujuan

**Visi:** Satu platform SaaS multi-tenant untuk Wedding Organizer (WO) dan calon pengantin agar dapat mengelola acara, undangan digital, RSVP, daftar tamu, check-in QR, layar sambutan dan laporan tanpa memindahkan data antarsistem.

**Masalah utama:** pengelolaan nama tamu di spreadsheet; check-in manual lambat; duplikasi pencatatan; kapasitas undangan keluarga berbeda dari jumlah individu yang hadir; sulit koordinasi VIP/usher; WO mengelola banyak klien; pengantin membutuhkan transparansi pelaporan.

**Target pengguna:** (a) WO yang menangani banyak event; (b) pasangan yang membuat event tanpa WO; (c) staf penerima tamu, supervisor, usher; (d) tamu tanpa akun.

**Tujuan MVP yang terukur (target validasi, bukan janji produksi):**
1. Membuat satu acara sampai siap menerima tamu tanpa bantuan developer.
2. Check-in QR normal selesai maksimal beberapa detik pada internet stabil; gunakan pengujian perangkat sungguhan.
3. Kapasitas undangan dan kedatangan parsial tercatat benar walau terjadi scan serentak.
4. Pemisahan data antar-workspace/event teruji dengan tes negatif.
5. Laporan rekonsiliasi sesuai riwayat transaksi check-in.
6. Bisa diuji dengan sekurangnya dua WO dan dua pasangan, termasuk pilot acara nyata.

**Bukan target MVP:** aplikasi native Android/iOS, editor undangan drag-and-drop penuh, auto blast WhatsApp, payment gateway otomatis, seating map visual, sinkronisasi offline multi-perangkat, inventaris souvenir canggih, marketplace vendor, AI seating planner.

## 2. Prinsip dan keputusan awal

- **Satu aplikasi web responsif/PWA online-first**, tiga pengalaman UI: desktop WO, mobile pengantin, mobile scanner; route display fullscreen untuk TV.
- **Satu identitas bisa memiliki banyak role dan workspace**. Semua operasi menentukan `active_workspace` dan `event_id`, diverifikasi di backend, bukan percaya frontend.
- **Semua event memiliki owner workspace** (tipe `wo` atau `couple`), dan tamu/petugas diatur per event. Pasangan dapat menjadi collaborator pada event milik WO tanpa otomatis mengambil alih kepemilikan.
- **Paket per event** (`free`, `pro`, `pro_plus`), bukan per user; batas ditegakkan pada backend. Harga bukan hard-coded business logic.
- **Setiap undangan mewakili satu pihak penerima**: satu individu, pasangan, atau keluarga, dengan `max_attendees >= 1`; check-in boleh parsial.
- **RSVP tidak sama dengan check-in**: RSVP adalah rencana, check-in adalah kehadiran terkonfirmasi.
- **QR check-in bukan bukti identitas**; petugas dapat memverifikasi manual sesuai SOP.
- **MVP memerlukan internet saat check-in live**; sediakan ekspor daftar cadangan dan SOP manual. Jangan mengklaim fitur offline otomatis sudah aktif.
- **Privasi VIP:** default layar publik tidak menampilkan nama VIP tanpa pilihan eksplisit dari penyelenggara dan persetujuan/landasan yang sesuai; internal usher dapat menerima notifikasi sesuai izin.
- **Penagihan:** tahap awal aktivasi paket oleh super admin setelah verifikasi manual, dengan status jelas. Belum ada integrasi payment gateway palsu.

## 3. Terminologi domain

| Istilah | Definisi |
|---|---|
| Account/User | Identitas login (Supabase Auth) |
| Workspace | Area organisasi WO atau pasangan pribadi; owner pengelola penagihan |
| Event | Satu acara/resepsi dengan waktu dan lokasi spesifik |
| Event membership | Akses seseorang dalam event beserta role-nya |
| Invitation Group | Satu unit undangan (individu/keluarga), mempunyai kuota orang |
| Guest | Data individu opsional yang terkait undangan |
| Public invite token | Token acak untuk membuka undangan publik dan RSVP |
| QR check-in token | Token acak berbeda untuk proses check-in |
| RSVP | Konfirmasi rencana jumlah kehadiran |
| Check-in ledger | Catatan penambahan/pengurangan peserta, tidak boleh hilang tanpa audit |
| Display session | Sesi layar publik yang dipasangkan ke event dengan izin terbatas |
| License/Entitlement | Hak dan batas fitur event berdasarkan paket |

## 4. Persona dan hak akses

### 4.1 Role

1. `platform_admin` (global): kelola paket, aktivitas sistem, aktivasi manual, support terbatas. Data pribadi tamu tidak bebas ditampilkan di dashboard admin.
2. `workspace_owner`: kelola workspace, pemilik akses/billing, membuat event, kelola anggota.
3. `workspace_admin`: membantu kelola workspace dan event, tidak dapat transfer kepemilikan/billing tanpa izin khusus.
4. `event_manager`: mengelola satu event, undangan/tamu, operator, layar, laporan.
5. `couple`: mengelola informasi acara, tamu, undangan, RSVP, melihat laporan; tidak boleh mengubah billing atau hak akses owner tanpa izin.
6. `supervisor`: memantau dan mengoreksi check-in dengan alasan, mengelola petugas shift.
7. `receptionist`: scan QR, mencari undangan, check-in manual, membaca daftar minimum yang dibutuhkan.
8. `usher`: menerima daftar kedatangan VIP dan nomor meja yang ditugaskan; tidak bisa ekspor seluruh daftar tamu.
9. `viewer`: melihat ringkasan/laporan tanpa mengubah data.
10. `guest_public`: tanpa login, hanya dapat melihat undangan yang tokennya dimiliki dan mengisi RSVP terbatas.

### 4.2 Matriks izin inti (server-side)

| Tindakan | Owner/Admin WO | Manager | Couple | Supervisor | Receptionist | Usher | Viewer |
|---|---|---|---|---|---|---|---|
| Buat event di workspace | Ya | Tidak | Hanya bila owner workspace pribadi | Tidak | Tidak | Tidak | Tidak |
| Edit detail event | Ya | Ya | Ya (kecuali kepemilikan/tagihan) | Tidak | Tidak | Tidak | Tidak |
| Kelola undangan & data tamu | Ya | Ya | Ya | Lihat sesuai tugas | Pencarian terbatas | VIP relevan saja | Tidak |
| Import/export Excel | Ya | Ya | Ya | Export terbatas jika diizinkan | Tidak | Tidak | Tidak |
| Kelola peran / undang staf | Ya | Ya (bukan owner) | Izin event terbatas | Tidak | Tidak | Tidak | Tidak |
| Scan & check-in | Ya | Ya | Opsional berdasarkan grant | Ya | Ya | Tidak | Tidak |
| Koreksi kehadiran | Ya | Ya | Tidak secara default | Ya + alasan | Tidak | Tidak | Tidak |
| Konfigurasi layar/VIP | Ya | Ya | Ya | Bisa pilih mode | Tidak | Tidak | Tidak |
| Lihat daftar penjemputan VIP | Ya | Ya | Ya | Ya | Perubahan terbatas | Ya | Tidak |
| Kelola paket event | Pemilik pembayar | Tidak | Owner workspace pribadi | Tidak | Tidak | Tidak | Tidak |
| Laporan ringkasan | Ya | Ya | Ya | Ya | Ringkas shift | VIP shift | Ya |

Kunci: role tidak selalu sama dengan pembayaran. `workspace_memberships` dan `event_memberships` adalah sumber kebenaran. Semua query wajib difilter dan diotorisasi pada server/RLS. Satu orang dapat menjadi owner WO sekaligus pasangan di event lain.

## 5. Paket dan batas fitur (konfigurabel, hipotesis awal)

| Entitlement | Free | Pro | Pro Plus |
|---|---:|---:|---:|
| Undangan unik per event | 50 | 500 | 2.000 |
| Operator scanner aktif | 1 | 3 | 10 |
| Check-in QR dan manual | Ya | Ya | Ya |
| RSVP sederhana | Ya | Ya | Ya |
| Undangan templat | 1 basic | Beberapa premium | Premium + branding |
| Import XLSX/CSV | Tidak / input manual saja | Ya | Ya |
| Layar sambutan standar | Tidak | Ya | Ya |
| Notifikasi internal VIP otomatis | Tidak | Tidak | Ya |
| Penempatan meja & souvenir | Tidak | Dasar (belakangan) | Lanjutan (belakangan) |
| Export laporan Excel | Ringkasan CSV | Detail | Detail |
| White label | Tidak | Tidak | Tahap lanjutan |

- Kuota dihitung **per event**; Free tidak boleh menghapus data lama saat upgrade.
- Limit jumlah operator = sesi scanner valid yang aktif; admin memiliki tindakan memutus sesi perangkat lain.
- Harga yang mungkin diuji: Pro Rp199.000/event dan Pro Plus Rp499.000/event. Ini **hipotesis**; simpan harga dalam konfigurasi, bukan angka tertanam di komponen.
- Belum ada pembayaran online dalam MVP. `pending_manual_payment` -> verifikasi admin -> `active`; `expired` jika masa berlaku habis. Trial/free langsung aktif.
- Bila kuota tercapai, tampilkan pesan terarah dan upgrade CTA; jangan membiarkan backend menambah data melewati batas.
- Jangan membuat fitur Pro Plus terlihat bekerja padahal hanya animasi. Beri label `Segera hadir` jika belum dikerjakan.

## 6. Alur end-to-end

### FLOW-01 Registrasi sendiri (pengantin)

`Landing -> Register / Login -> Verifikasi email -> Pilih "Pengantin" -> Buat workspace personal -> Buat event -> Paket Free -> Dashboard event -> Input tamu -> Undangan -> RSVP -> Hari H: scan -> Laporan`

**Aturan:** registrasi harus idempotent; refresh halaman tidak membuat workspace/event duplikat. Wizard bisa disimpan sebagai draft. Tanggal event menggunakan timezone pilihan (default Asia/Jakarta).

### FLOW-02 WO mengelola pasangan

`Register -> Pilih "Wedding Organizer" -> Buat workspace WO -> Dashboard WO -> Tambah event klien -> Undang pasangan melalui link aman -> Couple terima undangan & login -> Couple hanya melihat event yang dibagikan -> WO mengundang petugas -> Pengelolaan bersama -> Hari H -> Laporan`

**Aturan:** undangan member memiliki expiry dan status `pending / accepted / expired / revoked`; penerima baru diberi akses setelah autentikasi dan verifikasi token. Owner workspace dapat mencabut akses; audit setiap perubahan.

### FLOW-03 Import data tamu

`Event -> Tamu -> Import -> Download template -> Upload CSV/XLSX -> Preview dan mapping kolom -> Validasi -> Konfirmasi -> Hasil import -> Generate link/QR`.

Template kolom: `nama_penerima, nomor_hp_opsional, tipe_undangan, kapasitas, kategori, nama_meja_opsional, catatan_internal_opsional`.

Validasi: nama wajib, kapasitas 1..20 (konfigurabel), file maksimal 5 MB sebagai default, hanya XLSX/CSV, trim whitespace, normalisasi nomor telepon tanpa memaksa. Deteksi kandidat duplikat **per event**, tampilkan preview, jangan gabungkan otomatis tanpa konfirmasi. Import transaksi terkelola; baris salah dilaporkan dan bisa dikoreksi. Gunakan batas paket. Data tamu tidak boleh terekspos ke uploader lain.

### FLOW-04 Membuat undangan dan RSVP

`Event -> Undangan -> Pilih template -> Isi nama pasangan/tanggal/lokasi/cerita singkat opsional -> Preview mobile -> Publikasikan -> Generate URL unik per invitation group -> Bagikan manual via tautan/WhatsApp share -> Tamu buka halaman -> Pilih hadir/tidak/belum pasti + jumlah hadir <= kuota -> Simpan RSVP -> Dashboard update`.

Keamanan: token publik dan token QR check-in terpisah dan random berentropi tinggi; simpan hash token jika memungkinkan; token bisa di-rotate oleh manager. Jangan tampilkan seluruh daftar tamu. Tamu tidak perlu membuat akun. Rate limit form publik. Tidak ada WhatsApp blast otomatis.

### FLOW-05 Check-in dan partial arrival

`Petugas login -> Pilih event -> Mulai sesi scanner -> Izin kamera -> Scan QR -> Server validasi event+token+izin+status+kuota -> Preview (nama, kategori, sisa kuota) -> Pilih jumlah datang -> Konfirmasi -> Server transaksi atomik -> Sukses -> Update statistik -> Trigger layar/notifikasi jika diizinkan`.

**Kasus:** undangan 4 orang, 2 hadir pagi, 2 hadir kemudian. Kedua transaksi valid; check-in kelima ditolak. QR berbeda event ditolak. QR dinonaktifkan ditolak. Scan ganda bersamaan tidak boleh melewati kuota. Repeated request akibat refresh memakai idempotency key sehingga tidak menggandakan transaksi.

`Cari Manual`: petugas mencari nama dalam event, hasil terbatas, pilih invitation group, konfirmasi jumlah datang; log `method=manual`.

### FLOW-06 VIP/VVIP datang

`Check-in selesai -> Tamu bertanda VIP -> Server membuat event_notifikasi -> Jika layar publik aktif dan public_display_allowed=true -> display menampilkan sambutan sementara -> Jika Pro Plus dan usher ditugaskan -> notifikasi privat sampai diakui (ack) -> kembali ke layar default.`

Mode display: `default`, `welcome`, `privacy_mode`, `paused`; durasi default 8 detik, dapat diatur 5–15 detik. Jika ada banyak VIP dalam waktu pendek gunakan antrean FIFO dengan tombol skip oleh supervisor. Jangan broadcast nama, nomor HP, atau catatan privat di channel tanpa autentikasi.

### FLOW-07 Setelah acara

`Event -> Laporan -> Ringkasan undangan vs orang -> RSVP vs hadir -> Kategori VIP -> Riwayat check-in -> Export CSV/XLSX sesuai paket -> Tandai acara selesai -> Arsip`.

Perbedaan ukuran harus jelas: `jumlah undangan`, `kuota orang diundang`, `jumlah orang RSVP`, `jumlah orang hadir`, `jumlah invitation group yang hadir`. Jangan mengganti semua menjadi label ambigu "jumlah tamu".

### FLOW-08 Revisi data saat hari H

Supervisor membuka check-in detail -> pilih Koreksi -> memasukkan alasan wajib -> memasukkan jumlah koreksi (tidak boleh negatif total) -> konfirmasi -> catat correction entry serta user/timestamp -> dashboard konsisten. Receptionist tidak bisa menyunting log lama atau menghapus ledger.

## 7. Kebutuhan fungsional dan acceptance criteria

**Priority:** P0 wajib sebelum pilot; P1 sesudah core; P2 lanjutan.

| ID | Prioritas | Requirement | Kriteria penerimaan minimal |
|---|---|---|---|
| AUTH-01 | P0 | Daftar/masuk/logout/verifikasi/reset password | User hanya masuk setelah sesi valid; route aman di server |
| ORG-01 | P0 | Workspace WO/personal | Owner terbentuk sekali, dapat memilih workspace aktif |
| ORG-02 | P0 | Undang/cabut anggota | Token ekspire; role tak bisa melebihi hak pengundang |
| EVT-01 | P0 | CRUD event & status | Event milik workspace; hanya role berhak bisa ubah |
| EVT-02 | P0 | Event membership | User bisa di lebih dari satu event dan hanya melihat yang sah |
| GST-01 | P0 | Tambah/ubah/cari tamu | Validasi nama, kapasitas, kategori; pencarian hanya event aktif |
| GST-02 | P0 | Import CSV/XLSX | Preview, validasi, error per baris, limit paket |
| GST-03 | P0 | Kelompok/kuota undangan | Kapasitas angka bulat >=1; tidak boleh lebih rendah dari checked-in tanpa koreksi |
| INV-01 | P0 | QR unik, rotasi token | Scan hanya valid untuk event dan token aktif |
| INV-02 | P1 | Halaman undangan basic | URL individual aman, desain mobile, data event benar |
| RSVP-01 | P1 | Form RSVP publik | Jumlah RSVP <= kapasitas; perlu validasi token+rate limit |
| SCN-01 | P0 | Scan kamera dan manual search | Permission kamera ditangani; search fallback tersedia |
| SCN-02 | P0 | Check-in parsial & ganda | Batas atomik, idempotent, riwayat immutable |
| SCN-03 | P0 | Sesi operator sesuai paket | Admin bisa lihat/cabut sesi, kuota ditegakkan server |
| VIP-01 | P1 | Flag VIP/VVIP & nomor meja | Terpisah dari catatan privat; hanya role berizin |
| DSP-01 | P1 | Pair layar dan sambutan realtime | Display diotorisasi, privacy flag dihormati, fallback polling |
| DSP-02 | P2 | Notifikasi usher privat + ack | Hanya usher/event berizin, catatan status ack |
| RPT-01 | P0 | Statistik & riwayat | Angka sama dengan database ledger termasuk koreksi |
| RPT-02 | P1 | Export CSV/XLSX | Data hanya event sah, formula-injection di CSV dicegah |
| PLN-01 | P0 | Paket & feature flags | Quota server-side, tidak percaya field dari browser |
| PLN-02 | P1 | Upgrade manual diaudit | Aktivasi hanya platform_admin, bukan self-approve |
| AUD-01 | P0 | Audit untuk aksi kritis | Actor, event, action, timestamp, before/after minimum |
| SEC-01 | P0 | RLS isolation | User A tidak dapat melihat/ubah event B via UI maupun API |
| OPS-01 | P0 | SOP saat koneksi gagal | Pesan offline, ekspor backup pre-event dan rekonsiliasi manual |

## 8. Model data yang harus dibuat di migration

**Standar semua tabel:** UUID PK kecuali dinyatakan lain, `created_at timestamptz`, `updated_at timestamptz` jika relevan, FK eksplisit, index berdasarkan query, constraint, unique yang relevan, tidak mengandalkan hanya validator UI.

- `profiles`: `user_id` (FK auth), display_name, phone_optional, status.
- `workspaces`: id, type (`wo|personal`), name, slug unique, owner_user_id, status.
- `workspace_memberships`: workspace_id, user_id, role (`owner|admin|member`), status, unique(workspace_id,user_id).
- `events`: id, workspace_id, title, bride_name, groom_name (atau partner_1/2 untuk fleksibilitas), event_date, start_time, end_time, timezone default `Asia/Jakarta`, venue, address, city, status (`draft|published|live|completed|archived`), cover_image_path, settings jsonb dengan schema jelas.
- `event_memberships`: id, event_id, user_id, role enum, permissions_optional, status, unique(event_id,user_id,role) atau model grant yang didokumentasikan.
- `member_invites`: id, workspace_id/event_id nullable sesuai scope, recipient_email, role, token_hash, expires_at, accepted_at, revoked_at, created_by.
- `invitation_groups`: id, event_id, display_name, phone_optional, type (`individual|couple|family`), capacity int, guest_category (`regular|vip|vvip`), table_label_optional, notes_private_optional, allowed_public_display bool default false, status.
- `guests`: id, invitation_group_id, name (opsional untuk nama anggota keluarga), notes_optional, jika dibutuhkan oleh UI; jangan mewajibkan satu baris per individu.
- `invitations`: id, invitation_group_id, event_id, public_token_hash, qr_token_hash, token_version int, published_at, revoked_at, last_sent_at; hanya token yang aktif boleh dipakai.
- `rsvps`: id, invitation_group_id, status (`attending|declined|unsure`), attendee_count, note_optional, responded_at, source, versi update; unique(invitation_group_id) bila memakai model RSVP terkini dengan histori terpisah.
- `checkin_entries`: id, event_id, invitation_group_id, actor_user_id, delta_attendees int (positif untuk check-in, negatif untuk correction), method (`qr|manual|correction`), reason_nullable, idempotency_key uuid, created_at; unique(event_id,idempotency_key). Jangan hard-delete.
- `scanner_sessions`: id, event_id, user_id, device_label, session_token_hash, last_seen_at, revoked_at, ended_at; enforce quota untuk sesi aktif dengan mekanisme heartbeat/lease.
- `display_sessions`: id, event_id, pairing_code_hash, auth_token_hash, device_name, active, expires_at, last_seen_at, config jsonb.
- `display_events`: id, event_id, invitation_group_id nullable (jika welcome generik), payload_public_minimal jsonb, state (`queued|shown|skipped|expired`), queued_at, shown_at, expires_at.
- `usher_notifications`: id, event_id, invitation_group_id, assigned_to_user_id nullable, status (`pending|seen|acknowledged`), created_at, acknowledged_at.
- `plans`: code, display_name, limits jsonb, features jsonb, price_idr, is_active.
- `event_licenses`: id, event_id unique, plan_code, status, activated_by, activated_at, expires_at, payment_note_internal; periksa status backend.
- `audit_logs`: id, event_id nullable, workspace_id nullable, actor_user_id nullable, action, entity_type, entity_id, metadata redacted, created_at.

**Indeks minimum:** `events(workspace_id,event_date)`, `event_memberships(user_id,event_id)`, `invitation_groups(event_id,lower(display_name))` atau pencarian teroptimasi, `invitations(event_id, qr_token_hash)`, `checkin_entries(event_id,invitation_group_id)`, `scanner_sessions(event_id,revoked_at)`, `display_events(event_id,state,queued_at)`.

**Invarian kapasitas:** `checked_in_count = SUM(checkin_entries.delta_attendees)` per invitation group dan selalu `0 <= checked_in_count <= capacity`. Penambahan harus melalui fungsi atomik server/SQL transaksi, lock baris group `FOR UPDATE` atau pendekatan setara; callback frontend tidak cukup. Setiap request membawa `idempotency_key` unik. Koreksi negatif wajib reason dan role sesuai. Simpan ledger, jangan memodifikasi sejarah.

**Invarian RSVP:** `0 <= attendee_count <= capacity`; bila `declined`, count=0. Publik RSVP hanya melalui endpoint token valid.

**Keamanan schema:** aktifkan RLS dan grant minimum pada seluruh tabel yang terekspos; service secret hanya di server. Jika memakai SECURITY DEFINER fungsi, tentukan `search_path` ketat, autentikasi actor dan cek membership di dalam fungsi, audit; jangan membuka RPC kepada anonim sembarangan.

## 9. Kontrak service/API yang direkomendasikan

Gunakan route handlers / server actions untuk operasi mutasi dengan Zod input schema + auth + authorization. Ini daftar kontrak logis; boleh diimplementasikan sebagai server action jika lebih tepat, tetapi perilaku harus sama.

| Method | Endpoint logis | Input utama | Output |
|---|---|---|---|
| POST | `/api/workspaces` | type, name | workspace |
| POST | `/api/events` | workspace_id, detail_event | event |
| GET | `/api/events/:id/summary` | session | counts, permissions, plan |
| POST | `/api/events/:id/member-invites` | email, role | invite link/notification |
| GET/POST | `/api/events/:id/invitation-groups` | pagination / group fields | lists/create |
| POST | `/api/events/:id/imports/preview` | file | mapped preview/errors |
| POST | `/api/events/:id/imports/commit` | validated import batch | success/error summary |
| POST | `/api/events/:id/invitations/generate` | group ids | tokenized invitations |
| GET | `/i/:publicToken` (halaman) | opaque token | sanitized public event/invite |
| POST | `/api/public/rsvp` | token, status, count | confirmed status |
| POST | `/api/events/:id/scan/resolve` | qr token | minimal sanitized group detail |
| POST | `/api/events/:id/checkins` | qr token/group id, delta, idempotency_key | authoritative total, remaining |
| POST | `/api/events/:id/checkins/correct` | group id, signed delta, reason, idempotency_key | new total |
| GET | `/api/events/:id/reports` | filters | summary + paginated ledger |
| GET | `/api/events/:id/reports/export` | type | safe authorized file |
| POST | `/api/events/:id/displays/pair-code` | screen label | short-lived code |
| POST | `/api/display/pair` | code | restricted display session |
| GET | `/api/display/:sessionId/state` | display credential | current welcome/queue |
| POST | `/api/admin/licenses/activate` | event, plan, note | activation + audit |

**Format kesalahan:** status 400 validation, 401 unauthenticated, 403 forbidden/feature unavailable, 404 not found (termasuk event tak dapat diakses), 409 check-in/quota/idempotency conflict, 429 rate limit, 5xx server. Return `{error:{code,message,details?}}`, kode stabil untuk UI berbahasa Indonesia.

**Contoh request check-in:**
```json
{
  "qr_token": "opaque_random_token_from_scan",
  "attendees": 2,
  "idempotency_key": "7b193b97-1aa2-4ac2-95fd-e486c3957c0d"
}
```
**Contoh respons berhasil:**
```json
{
  "status": "success",
  "invitation_group_id": "uuid",
  "added_attendees": 2,
  "checked_in_count": 4,
  "capacity": 4,
  "remaining": 0,
  "welcome_queued": true
}
```
Jangan pernah mengembalikan private notes, semua nomor HP, atau full guest list ke layar display/public.

## 10. Layout desain dan navigasi

Baca **`02_UX_FLOW_WIREFRAMES.md`** untuk screen-by-screen wireframe, CTA, validasi, state error, dan flow Mermaid. Ringkasan route:

| Route | Audience | Deskripsi |
|---|---|---|
| `/` | Publik | Landing page, pricing, login |
| `/auth/login`, `/auth/register` | Semua akun | Autentikasi |
| `/onboarding` | Baru | Pilih WO/pengantin; buat workspace |
| `/app/workspaces` | Login | Pilih workspace |
| `/app/w/[workspaceId]` | WO | Ringkasan WO |
| `/app/w/[workspaceId]/events` | WO | Semua event |
| `/app/e/[eventId]` | Event authorized | Ringkasan event |
| `/app/e/[eventId]/guests` | Manager/Couple | CRUD tamu |
| `/app/e/[eventId]/guests/import` | Berizin + plan | Import wizard |
| `/app/e/[eventId]/invitations` | Manager/Couple | Undangan & token |
| `/app/e/[eventId]/rsvps` | Manager/Couple | Statistik RSVP |
| `/app/e/[eventId]/checkin` | Staff | Scanner |
| `/app/e/[eventId]/vip` | Supervisor/Usher | Daftar VIP |
| `/app/e/[eventId]/display` | Manager/Supervisor | Pair layar |
| `/display/[sessionId]` | Paired display | Fullscreen only |
| `/app/e/[eventId]/reports` | Berizin | Laporan |
| `/app/e/[eventId]/team` | Manager | Tim acara |
| `/app/e/[eventId]/settings` | Manager | Setting event |
| `/app/e/[eventId]/plan` | Payer | Plan dan upgrade |
| `/i/[publicToken]` | Tamu publik | Undangan/RSVP/QR milik token |
| `/admin` | Platform admin | Support, plan, aktivasi, audit |

UI memakai Bahasa Indonesia, IDR dan locale `id-ID`; format tanggal manusiawi menurut timezone event, simpan DB sebagai timestamp berzona jika menyimpan kejadian. Tanggal acara tidak boleh bergeser karena interpretasi UTC keliru.

## 11. Kebutuhan desain visual

**Karakter:** profesional, elegan, wedding-friendly tanpa berlebihan; dashboard harus tetap cepat dibaca oleh petugas saat antrean.

- Palet: navy `#15263F`, ivory `#FAF8F4`, gold accent `#B28A50`, success `#16805D`, danger `#C33F49`, primary text `#172033`, border `#E8E7E2`; gunakan kontras WCAG AA.
- Font yang tersedia via web-safe atau Google Fonts berlisensi sesuai ketentuan; jangan mewajibkan aset berbayar. Judul display boleh serif, dashboard sans-serif.
- Sidebar desktop, bottom action / navigasi ringkas pada mobile. Scanner harus full mobile-first dengan area kamera jelas, satu CTA, dan getar/audio opsional (dapat dimatikan).
- Minimum touch target sekitar 44 px, focus keyboard visible, screen-reader label, loading/empty/error/permission-denied states.
- Gunakan komponen reusable: `AppShell, WorkspaceSwitcher, EventSwitcher, RoleGate, FeatureGate, StatCard, DataTable, SearchBox, GuestForm, ScannerView, ScanResult, GuestCountStepper, InvitationPreview, ScreenPreview, ConfirmDialog, EmptyState, ErrorState, AuditList`.
- Tampilkan contoh data hanya di environment seed development; tidak ada dummy data di production setelah autentikasi.

## 12. Layar sambutan dan event realtime

- Manager membuat kode pairing sekali pakai TTL 2 menit (default) lalu membuka link pairing di browser layar TV. Display session memiliki izin hanya untuk satu event dan bisa dicabut.
- Berlangganan ke channel terproteksi atau polling berkala fallback. Display menampilkan status koneksi; jangan menganggap socket selalu berhasil.
- Mode default menunjukkan nama pasangan, jam, background, dan teks selamat datang generik.
- Nama tamu tampil **hanya** jika `allowed_public_display=true` dan fitur plan aktif. Petugas dapat memilih mode tanpa nama. Payload diperkecil: `display_name`, `greeting`, `table_label` hanya jika aman, `duration`, `event_id`.
- Untuk datang bersamaan: queue, tidak menumpuk overlay. TTL mencegah sambutan terlambat muncul.
- Jika layanan realtime gagal, proses check-in tetap sukses; response dapat menyatakan `welcome_queued=false` dan dashboard log issue, jangan rollback kehadiran yang sudah sah hanya karena display down.

## 13. Privacy, security, data governance

1. Privacy notice yang jelas untuk pasangan/WO dan publik RSVP; tetapkan siapa pihak pengendali dan pemroses data per konteks dengan penasihat hukum sebelum launching.
2. Terapkan minimisasi PII, masking nomor HP untuk receptionist jika tidak dibutuhkan, catatan internal tidak tampil di layar publik.
3. Authorization **server-side dan RLS** untuk semua data privat; tes negatif lintas tenant.
4. Cookie auth aman, CSRF protection sesuai teknik framework, XSS escaping, validated URL upload, batas ukuran gambar/file, safe file types, antivirus/pemeriksaan tambahan bila diperlukan.
5. QR dan token akses kriptografis acak, dapat dicabut, tidak mengandung PII; jangan menampilkan secret dalam log atau analytics.
6. Rate limiting untuk login, URL publik/RSVP, scan resolve, pairing, import; throttling pesan error agar tidak membantu enumerasi tamu.
7. Semua mutasi penting audit; retention log dan data dapat dikonfigurasi, prosedur permintaan akses/koreksi/penghapusan dan export. Jangan menghapus record yang diperlukan untuk audit tanpa kebijakan yang sah.
8. Backup database dan uji restore secara berkala; akses produksi minimum, env variables tidak pernah di-commit.
9. Patuhi ketentuan relevan UU PDP Indonesia setelah review hukum; PRD bukan nasihat hukum.
10. Tidak membuat fitur auto-blast WhatsApp atau mengekspor database semua tamu ke pihak ketiga tanpa dasar hukum dan persetujuan yang layak.

## 14. Kinerja dan reliabilitas (target internal awal)

- Target scanner: resolve + check-in cepat pada koneksi stabil; ukur p95 dari pilot, jangan klaim angka tanpa pengujian.
- Desain untuk contoh 2.000 undangan/event dan 10 operator/event pada Pro Plus; uji beban nyata.
- Pagination tamu default 25–50 baris, server-side search dan indexes.
- Pengolahan CSV/XLSX tidak memblokir UI; batasi ukuran; import preview.
- Realtime berstatus reconnecting/disconnected; fallback polling; check-in tetap menjadi sumber kebenaran di DB.
- Error observability dan structured logs dengan redaction token/PII. Health-check, backup dan rollback deployment.
- SOP manual saat internet/event service down: export backup sebelum acara (akses supervisor), daftar penanda, rekonsiliasi setelah online, hindari auto reimport ganda.

## 15. Pengukuran dan analytics (tanpa membocorkan PII)

- `workspace_created`, `event_created`, `first_guest_added`, `first_invitation_published`, `first_rsvp`, `first_checkin`, `event_completed`, `feature_gate_shown`, `upgrade_requested`.
- Funnel utama: registrasi -> event -> >=1 tamu -> undangan diterbitkan -> check-in pertama -> acara selesai.
- Produktivitas: durasi rata-rata scan, jumlah manual fallback, error check-in, staff per event, penggunaan layar, koreksi dengan alasan.
- Dashboard internal menampilkan agregat, bukan nama lengkap tamu secara global.

## 16. Testing dan acceptance pilot

### Automated tests (P0)

- Unit: validasi kapasitas, entitlement, RSVP, normalisasi import, format tanggal timezone, idempotency.
- Integration/Postgres: dua check-in paralel pada undangan kuota=1 -> persis satu berhasil; re-submit idempotency key -> jumlah tidak berubah; koreksi tanpa role -> forbidden.
- RLS: user tenant A tidak bisa SELECT/INSERT/UPDATE/DELETE tenant B dan tamu publik tidak dapat enumerate undangan.
- E2E: WO signup -> event -> invite couple -> import guest -> generate QR -> scan -> report; pasangan self-service; scanner manual; VIP privacy; upgrade manual oleh admin.
- Security: tidak ada service secret di client bundle, validasi file, rate limiting, QR token tidak bisa ditebak pada pengujian desain.
- Accessibility: navigasi keyboard form utama, label input, pesan error terbaca, kontras memadai.

### Skenario pilot wajib

1. 50/500 undangan, 2–3 operator scan secara paralel.
2. Tamu keluarga datang bertahap 2+2 dari kapasitas 4.
3. Dua HP scan QR sama hampir bersamaan, total tidak melebihi kuota.
4. VIP non-public tidak pernah muncul namanya di layar.
5. Salah scan/QR event lain/kamera ditolak tetap ada penanganan jelas.
6. Supervisor mengoreksi dengan alasan, laporan tetap cocok.
7. Operator melebihi kuota sesi paket mendapatkan penjelasan dan admin dapat memutus perangkat lama.
8. Cabut anggota event dan pastikan sesi/akses tidak dapat dipakai lagi.
9. Internet tidak tersedia: UI menyatakan offline, SOP/manual list tersedia, tidak memalsukan status success.
10. Pengantin hanya melihat event miliknya sekalipun user mencoba mengganti ID di URL.

**Definition of Done untuk setiap fitur:** UI responsif, backend benar, validasi, empty/loading/error state, pengujian sesuai risiko, role checks, dokumentasi dan cara menjalankan lokal. Demo screenshot bukan dianggap selesai.

## 17. Urutan delivery & dependensi

- **Sprint 0 (fondasi):** repo, README, TypeScript strict, lint, tests, auth, Supabase migration, CI sederhana.
- **Sprint 1 (workspace + event):** onboarding, WO vs pasangan, membership, event, seed minimal.
- **Sprint 2 (guest/invitation):** daftar tamu, import XLSX/CSV, kuota grup, QR token.
- **Sprint 3 (hari-H core):** scanner, manual search, transaksi atomik, sesi operator, ledger, laporan dasar.
- **Sprint 4 (public invite + display):** template undangan 1 basic, RSVP, privacy VIP, display pairing dan realtime.
- **Sprint 5 (komersialisasi):** plan gates, upgrade manual, admin dashboard, reporting XLSX, hardening + uji pilot.
- **Backlog setelah pilot:** notifikasi usher lengkap, souvenir, seating, editor tema kompleks, gateway pembayaran, WA business integrations, white label dan offline sync multi-device.

Setelah tiap sprint developer harus memberi: file yang berubah, env vars yang dibutuhkan, migration, command jalankan/test, apa yang selesai/tertunda, dan cara memeriksa lewat browser. Jangan lanjut otomatis jika ada error build/typecheck/tests yang belum dijelaskan.

## 18. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Koneksi internet ballroom buruk | Tes lokasi, hotspot cadangan, daftar offline cetak/CSV, SOP rekonsiliasi |
| Scan QR ganda | Transaksi DB atomik + idempotency key + ledger |
| Perbedaan hak akses pasangan vs WO | Membership terpisah, audit, review kepemilikan saat onboarding |
| Token undangan bocor | Token random, revocation, read minimization, rate limits |
| Tamu VIP merasa terekspos | Nama layar off by default; mode privasi; notifikasi usher internal |
| Pembayaran palsu | Manual activation & audit, jangan mensimulasikan successful payment |
| API/DB mahal | Limit kuota, pagination, indexes, observability, pengukuran biaya |
| Scope creep | Pisahkan P0/P1/P2; sprint acceptance sebelum fitur baru |

## 19. Keputusan yang bisa diubah nanti (default agar implementasi tetap maju)

- Pasangan dapat mengelola daftar tamu pada event WO kecuali manager menonaktifkan izin tersebut; perubahan ini diaudit dan tidak menghilangkan hak owner.
- Kategori awal hanya `regular`, `vip`, `vvip`.
- Nama kedua pasangan berupa dua field bebas, tidak mengunci urutan gender.
- Default timezone `Asia/Jakarta`, format IDR.
- RSVP mengizinkan `attending`, `declined`, `unsure`; update RSVP sebelum event selesai.
- Batas kapasitas undangan awal 20 orang, override supervisor jika diperlukan pada fitur terpisah (tidak otomatis).
- Batas file import awal 5 MB.
- Durasi sambutan layar 8 detik, default tidak menampilkan nama privat.
- Satu event memiliki tepat satu license saat aktif, plan free diinisialisasi otomatis.
- Plan bukan lifetime subscription; entitlements berlaku sesuai durasi event yang dikonfigurasi dan status lisensi.

**Dokumen pendamping:** `02_UX_FLOW_WIREFRAMES.md`, `03_BACKLOG_TEST_CASES.md`, `04_PROMPT_ANTIGRAVITY.md`, `AGENTS.md`, `README_MULAI_DI_SINI.md`.
