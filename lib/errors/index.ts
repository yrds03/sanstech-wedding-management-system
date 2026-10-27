export type AppErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'QUOTA_EXCEEDED'
  | 'CAPACITY_EXCEEDED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INVITE_EXPIRED_OR_REVOKED'
  | 'RATE_LIMITED'
  | 'OFFLINE_MODE_ACTIVE'
  | 'INTERNAL_ERROR';

export interface StructuredAppError {
  code: AppErrorCode;
  message: string;
  details?: Record<string, string | number | boolean>;
}

const DEFAULT_MESSAGES_ID: Record<AppErrorCode, string> = {
  UNAUTHORIZED: 'Sesi Anda telah berakhir atau belum masuk. Silakan masuk kembali.',
  FORBIDDEN: 'Anda tidak memiliki akses untuk tindakan ini.',
  NOT_FOUND: 'Data atau halaman yang diminta tidak ditemukan atau tidak berada dalam akses Anda.',
  VALIDATION_ERROR: 'Data yang dimasukkan belum sesuai. Periksa kembali formulir Anda.',
  QUOTA_EXCEEDED: 'Batas kuota paket acara Anda telah tercapai. Silakan ajukan upgrade paket.',
  CAPACITY_EXCEEDED: 'Jumlah kehadiran melebihi sisa kapasitas undangan ini.',
  IDEMPOTENCY_CONFLICT: 'Jumlah kehadiran baru saja berubah. Periksa kembali sebelum melanjutkan.',
  INVITE_EXPIRED_OR_REVOKED: 'Tautan undangan tim sudah kedaluwarsa atau telah dicabut.',
  RATE_LIMITED: 'Terlalu banyak permintaan dalam waktu singkat. Silakan tunggu beberapa saat.',
  OFFLINE_MODE_ACTIVE: 'Koneksi terputus. Check-in online belum dapat dilakukan.',
  INTERNAL_ERROR: 'Terjadi kendala pada server. Silakan coba beberapa saat lagi.',
};

export function createAppError(
  code: AppErrorCode,
  customMessage?: string,
  details?: Record<string, string | number | boolean>
): { error: StructuredAppError } {
  return {
    error: {
      code,
      message: customMessage ?? DEFAULT_MESSAGES_ID[code],
      ...(details ? { details } : {}),
    },
  };
}

export function getHttpStatusForError(code: AppErrorCode): number {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
    case 'QUOTA_EXCEEDED':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CAPACITY_EXCEEDED':
    case 'IDEMPOTENCY_CONFLICT':
    case 'INVITE_EXPIRED_OR_REVOKED':
      return 409;
    case 'RATE_LIMITED':
      return 429;
    default:
      return 500;
  }
}

