import { createSprintPlaceholderPage } from '@/components/event/sprint-placeholder';

export default createSprintPlaceholderPage({
  title: 'Laporan Rekonsiliasi & Ekspor Kehadiran (S18)',
  sprintBadge: 'Sprint 3 & Sprint 5',
  description:
    'Menampilkan rekonsiliasi akurat dari buku besar check-in (checkin_entries) beserta riwayat koreksi supervisor.',
  upcomingFeatures: [
    'Metrik terpisah: Jumlah Undangan, Kuota Orang, RSVP Orang, Orang Hadir, dan Grup Hadir.',
    'Ekspor CSV/XLSX aman dengan perlindungan anti Formula Injection (CSV Injection).',
  ],
});
