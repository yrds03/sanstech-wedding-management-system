# MULAI DI SINI — Paket Blueprint WeddingHub untuk VS Code + Antigravity

Paket ini adalah **spesifikasi produk dan instruksi AI coding**, **bukan aplikasi yang sudah selesai dibuat**. Anda dapat memasukkannya ke workspace VS Code agar coding agent membuat proyek secara bertahap.

## Isi paket

| File | Isi |
|---|---|
| `01_PRD_WEDDINGHUB.md` | PRD produk lengkap: business rules, roles, API, database, paket, keamanan, pilot acceptance |
| `02_UX_FLOW_WIREFRAMES.md` | Peta navigasi, 21 rancangan halaman, Mermaid user flow, states/microcopy |
| `03_BACKLOG_TEST_CASES.md` | Sprint 0–5 dan 20 test cases penerimaan |
| `04_PROMPT_ANTIGRAVITY.md` | Teks perintah siap copy ke AI coding |
| `AGENTS.md` | Instruksi permanen untuk coding agent di proyek |
| `README_MULAI_DI_SINI.md` | Panduan penggunaan paket |
| `00_COPY_PASTE_SEMUA.md` | Gabungan prompt + seluruh spesifikasi jika ingin memakai satu file saja |

## Cara paling mudah (Windows/Mac/Linux)

1. Unduh ZIP dan **extract** ke folder baru, misalnya `WeddingHub`.
2. Buka VS Code, pilih **File > Open Folder** lalu pilih folder `WeddingHub`.
3. Pastikan Google Antigravity extension/agent telah dipasang dan Anda login (jika menggunakan Google Antigravity). Alternatif: gunakan chat coding agent yang bisa membaca file workspace.
4. Buka file `04_PROMPT_ANTIGRAVITY.md`, lalu **copy teks di bawah garis pemisah `---`**.
5. Paste ke **chat coding agent**, bukan ke terminal, lalu kirim.
6. Biarkan agent menginspeksi workspace dan menulis kode Sprint 0–1. Review perintah terminal/migration yang diminta; jangan izinkan akses kredensial atau data produksi tanpa memahami akibatnya.
7. Bila butuh Supabase: buat project Supabase Anda sendiri, copy `.env.example` ke `.env.local`, isi nilai dari dashboard Supabase lokal Anda, dan jalankan migration sesuai petunjuk agent. Jangan pernah membagikan secret ke chat publik atau commit Git.
8. Jalankan `npm run dev` sesuai petunjuk yang dihasilkan agent, buka alamat local host dari terminal. Lakukan tes dengan akun WO dan akun pengantin yang berbeda.
9. Setelah Sprint 0–1 stabil, minta coding agent `Lanjutkan Sprint 2 sesuai 03_BACKLOG_TEST_CASES.md, implementasi + tests, jangan demo-only` lalu seterusnya.

## Alternatif sekali copy paste

- Buka `00_COPY_PASTE_SEMUA.md`, pilih semua, copy, paste ke chat AI coding. Ini panjang dan sebagian agent mungkin memiliki batas konteks. Cara **ZIP + file lokal + prompt singkat** lebih konsisten.

## Yang belum otomatis tersedia dari dokumen

- Server Supabase, API keys, domain, hosting, dan billing provider harus disiapkan sendiri.
- QR scanning butuh browser/device dengan kamera dan HTTPS pada website publik (localhost biasanya pengecualian untuk development).
- Kode hasil agent tetap harus diuji manual pada acara dan diaudit untuk keamanan sebelum memproses data tamu sungguhan.
- Harga dan kuota saat ini rancangan untuk uji pasar, belum final.

## Penamaan

`WeddingHub` hanya nama kerja yang dipakai agar instruksi jelas. Ganti brand kapan pun setelah Anda memilih nama aplikasi final.
