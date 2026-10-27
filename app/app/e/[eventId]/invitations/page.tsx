import { createSprintPlaceholderPage } from '@/components/event/sprint-placeholder';

export default createSprintPlaceholderPage({
  title: 'Undangan Digital & Generator QR Unik (S10)',
  sprintBadge: 'Sprint 2 & Sprint 4',
  description:
    'Modul pembuatan token undangan publik dan token QR check-in terpisah akan diaktifkan pada Sprint 2.',
  upcomingFeatures: [
    'Pembuatan public_token_hash dan qr_token_hash kriptografis yang terpisah.',
    'Rotasi/pencabutan token undangan jika tautan tamu bocor.',
    'Pratinjau undangan mobile dan tombol bagikan manual ke WhatsApp (tanpa auto-blast).',
  ],
});
