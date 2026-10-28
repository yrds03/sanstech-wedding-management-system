import type { EventRole } from '@/lib/types';

export interface RoleAccessGuide {
  title: string;
  canDo: string[];
  cannotDo: string[];
  firstStep: string;
}

/** Ringkasan akses per peran — harus sejalan dengan matriks pada lib/permissions. */
export const ROLE_ACCESS_GUIDE: Record<string, RoleAccessGuide> = {
  couple: {
    title: 'Calon Pengantin',
    canDo: [
      'Mengisi & mengelola daftar tamu keluarga, import Excel',
      'Mengatur desain undangan digital & membagikan tautan/QR',
      'Memantau RSVP, kehadiran, dan laporan',
      'Mengatur layar sambutan',
    ],
    cannotDo: ['Mengundang tim lain', 'Melihat acara klien WO lain', 'Mengoreksi check-in'],
    firstStep: 'Buka menu "Daftar Tamu & Import", lalu unduh template Excel dan isi daftar tamu.',
  },
  event_manager: {
    title: 'Manajer Acara',
    canDo: [
      'Seluruh pengelolaan acara: tamu, undangan, scanner, VIP, layar, laporan',
      'Mengundang anggota tim acara',
      'Koreksi check-in (dengan alasan, tercatat audit)',
    ],
    cannotDo: ['Mengubah paket/harga', 'Mengakses workspace atau acara lain'],
    firstStep: 'Buka "Ringkasan" untuk melihat kesiapan acara, lalu cek "Tim & Akses".',
  },
  supervisor: {
    title: 'Supervisor Hari-H',
    canDo: [
      'Scanner & check-in',
      'Koreksi kehadiran bertanda tangan (wajib alasan, tercatat audit)',
      'Memantau antrean VIP, layar sambutan, dan laporan',
    ],
    cannotDo: ['Mengubah daftar tamu', 'Mengundang tim', 'Mengubah paket'],
    firstStep: 'Buka "Scanner & Check-in Hari-H" dan pastikan layar TV terhubung.',
  },
  receptionist: {
    title: 'Petugas Penerima Tamu (Scanner)',
    canDo: ['Scan QR / cari nama tamu dan konfirmasi kehadiran', 'Melihat ringkasan acara'],
    cannotDo: ['Melihat catatan privat WO', 'Mengoreksi check-in', 'Mengubah data tamu'],
    firstStep: 'Buka "Scanner & Check-in Hari-H", izinkan kamera, lalu pindai QR tamu.',
  },
  usher: {
    title: 'Tim Usher VIP',
    canDo: ['Melihat antrean & notifikasi tamu VIP/VVIP yang sudah hadir', 'Melihat ringkasan acara'],
    cannotDo: ['Melakukan check-in', 'Mengubah data tamu', 'Melihat laporan'],
    firstStep: 'Buka "Protokol VIP & Usher" dan siaga di pintu utama.',
  },
  viewer: {
    title: 'Pengamat Laporan',
    canDo: ['Melihat ringkasan dan laporan kehadiran'],
    cannotDo: ['Mengubah data apa pun'],
    firstStep: 'Buka menu "Laporan" untuk melihat rekap kehadiran.',
  },
};

export function getRoleAccessGuide(role: EventRole | string): RoleAccessGuide {
  return (
    ROLE_ACCESS_GUIDE[role] ?? {
      title: String(role),
      canDo: ['Akses sesuai peran yang diberikan pengelola acara'],
      cannotDo: [],
      firstStep: 'Buka halaman acara dan ikuti arahan pengelola.',
    }
  );
}

