import { z } from 'zod';

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Alamat email wajib diisi.')
    .email('Format alamat email tidak valid.'),
  password: z
    .string()
    .min(8, 'Kata sandi minimal 8 karakter.'),
});

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, 'Nama lengkap atau nama tim minimal 2 karakter.')
      .max(80, 'Nama terlalu panjang.'),
    email: z
      .string()
      .trim()
      .min(1, 'Alamat email wajib diisi.')
      .email('Format alamat email tidak valid.'),
    password: z
      .string()
      .min(8, 'Kata sandi minimal 8 karakter.')
      .max(72, 'Kata sandi maksimal 72 karakter.'),
    confirmPassword: z.string().min(8, 'Konfirmasi kata sandi wajib diisi.'),
    acceptTerms: z.literal(true, {
      errorMap: () => ({
        message: 'Anda wajib menyetujui Kebijakan Privasi & Ketentuan Pelindungan Data Pribadi.',
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok.',
    path: ['confirmPassword'],
  });

export const onboardingWorkspaceSchema = z.object({
  type: z.enum(['wo', 'personal'], {
    errorMap: () => ({ message: 'Pilih jenis penggunaan aplikasi.' }),
  }),
  name: z
    .string()
    .trim()
    .min(2, 'Nama workspace/organisasi minimal 2 karakter.')
    .max(80, 'Nama maksimal 80 karakter.'),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug URL minimal 2 karakter.')
    .max(48, 'Slug URL maksimal 48 karakter.')
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-).'),
  cityOptional: z.string().trim().max(60).optional(),
  idempotencyKey: z.string().uuid('Idempotency key harus berupa UUID valid.'),
});

export const createOrUpdateEventSchema = z
  .object({
    workspaceId: z.string().uuid('Workspace ID tidak valid.'),
    title: z
      .string()
      .trim()
      .min(3, 'Nama acara minimal 3 karakter.')
      .max(100, 'Nama acara maksimal 100 karakter.'),
    brideName: z
      .string()
      .trim()
      .min(1, 'Nama mempelai pertama wajib diisi.')
      .max(80, 'Nama mempelai terlalu panjang.'),
    groomName: z
      .string()
      .trim()
      .min(1, 'Nama mempelai kedua wajib diisi.')
      .max(80, 'Nama mempelai terlalu panjang.'),
    eventDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal acara harus YYYY-MM-DD.'),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Format waktu mulai harus HH:MM.'),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Format waktu selesai harus HH:MM.'),
    timezone: z
      .enum(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'])
      .default('Asia/Jakarta'),
    venue: z
      .string()
      .trim()
      .min(2, 'Nama gedung/lokasi acara wajib diisi.')
      .max(120, 'Nama lokasi maksimal 120 karakter.'),
    city: z
      .string()
      .trim()
      .min(2, 'Nama kota wajib diisi.')
      .max(60, 'Nama kota maksimal 60 karakter.'),
    address: z
      .string()
      .trim()
      .max(250, 'Alamat maksimal 250 karakter.')
      .default(''),
    status: z
      .enum(['draft', 'published', 'live', 'completed', 'archived'])
      .default('draft'),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'Waktu selesai harus lebih akhir dari waktu mulai acara.',
    path: ['endTime'],
  });

export const createMemberInviteSchema = z.object({
  workspaceId: z.string().uuid('Workspace ID tidak valid.'),
  eventId: z.string().uuid('Event ID tidak valid.').nullable().optional(),
  recipientEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email('Format alamat email penerima tidak valid.'),
  eventRoleGrant: z
    .enum(['event_manager', 'couple', 'supervisor', 'receptionist', 'usher', 'viewer'])
    .optional(),
  workspaceRoleGrant: z.enum(['admin', 'member']).optional(),
});

export const atomicCheckinRequestSchema = z.object({
  eventId: z.string().uuid('Event ID tidak valid.'),
  invitationGroupId: z.string().uuid('Invitation Group ID tidak valid.'),
  attendees: z
    .number()
    .int('Jumlah kehadiran harus bilangan bulat.')
    .min(1, 'Minimal 1 orang hadir.')
    .max(20, 'Maksimal 20 orang dalam satu kali konfirmasi.'),
  method: z.enum(['qr', 'manual']),
  idempotencyKey: z.string().uuid('Idempotency key wajib berupa UUID.'),
});

export const checkinCorrectionRequestSchema = z.object({
  eventId: z.string().uuid('Event ID tidak valid.'),
  invitationGroupId: z.string().uuid('Invitation Group ID tidak valid.'),
  signedDelta: z
    .number()
    .int()
    .refine((val) => val !== 0, 'Nilai koreksi tidak boleh 0.'),
  reason: z
    .string()
    .trim()
    .min(5, 'Alasan koreksi wajib diisi minimal 5 karakter untuk keperluan audit.')
    .max(250, 'Alasan koreksi maksimal 250 karakter.'),
  idempotencyKey: z.string().uuid('Idempotency key wajib berupa UUID.'),
});

