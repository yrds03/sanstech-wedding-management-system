import fs from 'node:fs';
import path from 'node:path';
import { isLocalDemoEnabled } from '@/lib/config';

function filePath(key: string): string {
  if (!/^[a-z]+$/.test(key)) throw new Error('Invalid local storage key');
  return path.join(process.cwd(), '.local-data', `${key}.json`);
}

export function loadFromVault<T>(key: string): T | null {
  if (!isLocalDemoEnabled() || process.env.VITEST) return null;
  try { return JSON.parse(fs.readFileSync(filePath(key), 'utf8')) as T; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error('Data lokal tidak dapat dibaca. Pulihkan cadangan sebelum melanjutkan.');
  }
}

export function saveToVault<T>(key: string, data: T): void {
  if (!isLocalDemoEnabled() || process.env.VITEST) return;
  const target = filePath(key);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(`${target}.tmp`, JSON.stringify(data), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(`${target}.tmp`, target);
}
