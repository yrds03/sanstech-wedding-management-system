import { createSprintPlaceholderPage } from '@/components/event/sprint-placeholder';

export default createSprintPlaceholderPage({
  title: 'Panel Koordinasi VIP & Tim Usher (S15)',
  sprintBadge: 'Sprint 3 & Sprint 4',
  description:
    'Memantau daftar tamu VIP/VVIP yang belum datang, baru datang, dan penugasan tim penjemputan usher.',
  upcomingFeatures: [
    'Pemisahan ketat antara sambutan layar publik (opt-in) dan notifikasi internal usher.',
    'Status penanganan tamu kehormatan (Pending, Seen, Acknowledged).',
  ],
});
