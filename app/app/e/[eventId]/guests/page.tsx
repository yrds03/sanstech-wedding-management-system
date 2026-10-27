import { createSprintPlaceholderPage } from '@/components/event/sprint-placeholder';

export default createSprintPlaceholderPage({
  title: 'Daftar Tamu & Grup Undangan (S08 / S09)',
  sprintBadge: 'Sprint 2',
  description:
    'Sesuai aturan AGENTS.md dan 01_PRD_WEDDINGHUB.md, halaman ini menampilkan status jujur "Segera hadir" sampai Gate Sprint 0–1 dinyatakan lulus.',
  upcomingFeatures: [
    'CRUD Grup Undangan (Individu, Pasangan, Keluarga) dengan batas kapasitas 1–20 orang.',
    'Flag kategori Reguler, VIP, VVIP dan opsi privasi layar sambutan (default nonaktif).',
    'Wizard Import Excel/CSV 4 langkah dengan deteksi kandidat duplikat dan penegakan kuota paket (Free maks. 50 undangan).',
  ],
});
