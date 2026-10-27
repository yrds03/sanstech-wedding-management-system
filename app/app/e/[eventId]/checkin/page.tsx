import { createSprintPlaceholderPage } from '@/components/event/sprint-placeholder';

export default createSprintPlaceholderPage({
  title: 'Scanner QR & Check-in Hari-H (S12 / S13 / S14)',
  sprintBadge: 'Sprint 3',
  description:
    'Mesin SQL transaksi atomik (perform_atomic_checkin) telah disiapkan pada migration database dan akan dihubungkan ke antarmuka kamera mobile pada Sprint 3.',
  upcomingFeatures: [
    'Pemindaian kamera mobile one-hand + fallback pencarian nama manual.',
    'Konfirmasi jumlah tamu hadir (mendukung kedatangan parsial keluarga) dengan idempotency_key.',
    'Koreksi kehadiran oleh Supervisor wajib disertai alasan audit.',
    'Peringatan jujur dan SOP manual apabila koneksi internet gedung terputus.',
  ],
});
