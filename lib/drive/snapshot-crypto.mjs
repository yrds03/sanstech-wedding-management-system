import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto';
export const SNAPSHOT_FORMAT = 'sanstech-pglite-0.6.0-aes256gcm-gzip-v2';
const marker = Buffer.from('WMS2');
function key(value) {
 if (!/^[a-f0-9]{64}$/i.test(value ?? '')) throw new Error('Snapshot encryption key is not configured');
 return Buffer.from(value, 'hex');
}
export function encryptSnapshot(bytes, encryptionKey) {
 const iv = randomBytes(12);
 const cipher = createCipheriv('aes-256-gcm', key(encryptionKey), iv);
 cipher.setAAD(Buffer.from(SNAPSHOT_FORMAT));
 const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
 return Buffer.concat([marker, iv, cipher.getAuthTag(), encrypted]).toString('base64');
}
export function decryptSnapshot(data, encryptionKey) {
 const bytes = Buffer.from(data, 'base64');
 if (bytes.length < 33 || !bytes.subarray(0, 4).equals(marker)) throw new Error('Invalid encrypted snapshot');
 const decipher = createDecipheriv('aes-256-gcm', key(encryptionKey), bytes.subarray(4, 16));
 decipher.setAAD(Buffer.from(SNAPSHOT_FORMAT));
 decipher.setAuthTag(bytes.subarray(16, 32));
 return Buffer.concat([decipher.update(bytes.subarray(32)), decipher.final()]);
}
