import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_SALT = 'mindlarp-chat.provider-keys.v1';

const derivedKeys = new Map<string, Buffer>();

function deriveKey(secret: string): Buffer {
  const cached = derivedKeys.get(secret);
  if (cached) return cached;
  const key = scryptSync(secret, KEY_SALT, 32);
  derivedKeys.set(secret, key);
  return key;
}

function encryptionSecret(): string {
  const secret = process.env.KEY_ENCRYPTION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('KEY_ENCRYPTION_SECRET is missing or too short (min 16 chars).');
  }
  return secret;
}

/** Encrypt a provider API key. Output: base64(iv || authTag || ciphertext). */
export function encryptSecret(plaintext: string, secret = encryptionSecret()): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, deriveKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptSecret(payload: string, secret = encryptionSecret()): string {
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, deriveKey(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}
