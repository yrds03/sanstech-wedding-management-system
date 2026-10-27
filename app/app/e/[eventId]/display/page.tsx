import { createSprintPlaceholderPage } from '@/components/event/sprint-placeholder';

export default createSprintPlaceholderPage({
  title: 'Pengaturan Pairing Layar Sambutan TV/LED (S16)',
  sprintBadge: 'Sprint 4',
  description:
    'Menghubungkan browser Smart TV / proyektor gedung ke acara ini menggunakan kode pairing berumur pendek (TTL 2 menit).',
  upcomingFeatures: [
    'Sesi layar terbatas khusus satu acara yang dapat dicabut sewaktu-waktu.',
    'Pengaturan durasi sambutan 5–15 detik (default 8 detik) dan mode privasi.',
  ],
});
