import { describe, expect, it } from 'vitest';

import { decryptSecret, encryptSecret, randomToken, sha256Hex } from './crypto';

const SECRET = 'test-secret-value-0123456789abcdef';

describe('provider key encryption', () => {
  it('round-trips a key', () => {
    const encrypted = encryptSecret('sk-test-1234567890', SECRET);
    expect(encrypted).not.toContain('sk-test');
    expect(decryptSecret(encrypted, SECRET)).toBe('sk-test-1234567890');
  });

  it('round-trips unicode payloads', () => {
    const value = 'ключ-🔐-with-unicode';
    expect(decryptSecret(encryptSecret(value, SECRET), SECRET)).toBe(value);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const a = encryptSecret('same', SECRET);
    const b = encryptSecret('same', SECRET);
    expect(a).not.toBe(b);
  });

  it('rejects tampered ciphertext', () => {
    const encrypted = encryptSecret('sk-test', SECRET);
    const raw = Buffer.from(encrypted, 'base64');
    raw[raw.length - 1] ^= 0xff;
    expect(() => decryptSecret(raw.toString('base64'), SECRET)).toThrow();
  });

  it('rejects the wrong secret', () => {
    const encrypted = encryptSecret('sk-test', SECRET);
    expect(() => decryptSecret(encrypted, 'another-secret-value-0123456789')).toThrow();
  });
});

describe('handoff helpers', () => {
  it('hashes tokens deterministically', () => {
    expect(sha256Hex('token')).toBe(sha256Hex('token'));
    expect(sha256Hex('token')).not.toBe(sha256Hex('token2'));
    expect(sha256Hex('token')).toHaveLength(64);
  });

  it('generates unique url-safe tokens', () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
