import fs from 'fs';
import path from 'path';
import os from 'os';
import zlib from 'zlib';
import { cookies } from 'next/headers';

const CHUNK_MAX_LEN = 3400;
const MAX_CHUNKS = 4;

function isTestEnv(): boolean {
  return Boolean(process.env.VITEST);
}

function getTmpFilePath(key: string): string {
  return path.join(os.tmpdir(), `sanstech-vault-${key}.json`);
}

export function loadFromVault<T>(key: string): T | null {
  if (isTestEnv()) return null;

  // 1. Coba baca dari Cookie terkompresi (Selalu konsisten lintas instance Serverless Vercel)
  try {
    const cookieStore = cookies();
    const chunks: string[] = [];
    for (let i = 0; i < MAX_CHUNKS; i++) {
      const val = cookieStore.get(`sanstech_v_${key}_${i}`)?.value;
      if (!val) break;
      chunks.push(val);
    }
    if (chunks.length > 0) {
      const joined = chunks.join('');
      const buf = Buffer.from(joined, 'base64url');
      const jsonStr = zlib.inflateRawSync(buf).toString('utf-8');
      const parsed = JSON.parse(jsonStr) as T;
      // Simpan juga ke /tmp lokal container ini agar tab/polling berikutnya cepat
      try {
        fs.writeFileSync(getTmpFilePath(key), jsonStr, 'utf-8');
      } catch {
        // Abaikan jika gagal tulis ke /tmp
      }
      return parsed;
    }
  } catch {
    // cookies() tidak tersedia di luar konteks request Next.js
  }

  // 2. Fallback baca dari /tmp container serverless
  try {
    const tmpPath = getTmpFilePath(key);
    if (fs.existsSync(tmpPath)) {
      const raw = fs.readFileSync(tmpPath, 'utf-8');
      return JSON.parse(raw) as T;
    }
  } catch {
    // Abaikan jika belum ada file
  }

  return null;
}

export function saveToVault<T>(key: string, data: T): void {
  if (isTestEnv()) return;

  let jsonStr = '';
  try {
    jsonStr = JSON.stringify(data);
  } catch {
    return;
  }

  // 1. Simpan ke /tmp container serverless
  try {
    fs.writeFileSync(getTmpFilePath(key), jsonStr, 'utf-8');
  } catch {
    // Abaikan jika read-only
  }

  // 2. Simpan ke Cookie terkompresi (zlib deflateRaw + base64url chunked)
  try {
    const compressed = zlib.deflateRawSync(Buffer.from(jsonStr, 'utf-8')).toString('base64url');
    const cookieStore = cookies();

    // Hanya simpan ke cookie jika muat dalam batas MAX_CHUNKS
    if (compressed.length <= CHUNK_MAX_LEN * MAX_CHUNKS) {
      for (let i = 0; i < MAX_CHUNKS; i++) {
        const slice = compressed.slice(i * CHUNK_MAX_LEN, (i + 1) * CHUNK_MAX_LEN);
        if (slice.length > 0) {
          cookieStore.set(`sanstech_v_${key}_${i}`, slice, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 30,
          });
        } else {
          cookieStore.delete(`sanstech_v_${key}_${i}`);
        }
      }
    }
  } catch {
    // cookies().set() hanya bisa dipanggil di Route Handler / Server Action
  }
}

