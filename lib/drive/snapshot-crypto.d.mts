import type {Buffer} from 'node:buffer';
export const SNAPSHOT_FORMAT: 'sanstech-pglite-0.6.0-aes256gcm-gzip-v2';
export function encryptSnapshot(bytes: Uint8Array, encryptionKey: string): string;
export function decryptSnapshot(data: string, encryptionKey: string): Buffer;
