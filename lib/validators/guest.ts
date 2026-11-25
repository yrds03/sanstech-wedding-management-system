import {z} from 'zod';
export const guestSchema=z.object({
 displayName:z.string().trim().min(2,'Nama penerima minimal 2 karakter.').max(160),
 phoneOptional:z.string().trim().max(40).optional(),
 type:z.enum(['individual','couple','family']),
 capacity:z.number().int('Kapasitas harus bilangan bulat.').min(1).max(20),
 guestCategory:z.enum(['regular','vip','vvip']),
 tableLabelOptional:z.string().trim().max(80).optional(),
 notesPrivateOptional:z.string().trim().max(500).optional(),
 allowedPublicDisplay:z.boolean().default(false),
});
