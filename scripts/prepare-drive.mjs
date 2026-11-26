import fs from 'node:fs';
import {parseEnv} from 'node:util';
import {randomBytes} from 'node:crypto';

const deployment = JSON.parse(fs.readFileSync(new URL('../google-apps-script/deployment.json', import.meta.url), 'utf8'));
const target = new URL('../.env.local', import.meta.url);
const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
const values = parseEnv(existing);
const additions = [];
for (const [key, value] of Object.entries({DRIVE_GATEWAY_URL: deployment.webAppUrl,
  GOOGLE_AUTH_SCRIPT_URL: deployment.authWebAppUrl, GOOGLE_AUTH_SCRIPT_ID: deployment.scriptId,
  DRIVE_ENCRYPTION_KEY: randomBytes(32).toString('hex'), NEXT_PUBLIC_APP_URL: 'https://sanstech-wedding-management-system.vercel.app'})) {
  if (!Object.hasOwn(values, key)) additions.push(`${key}=${JSON.stringify(value)}`);
}
for (const key of ['DRIVE_GATEWAY_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) {
  if (!Object.hasOwn(values, key)) additions.push(`${key}=`);
}
if (additions.length) fs.writeFileSync(target, existing + (existing && !existing.endsWith('\n') ? '\n' : '') + additions.join('\n') + '\n', {mode: 0o600});
console.log('Konfigurasi lokal disiapkan. Nilai rahasia tidak ditampilkan dan nilai yang sudah ada dipertahankan.');
