import { describe, expect, it } from 'vitest';

import { dayBucket, formatBytes, maskKey, titleFromText, truncate } from './utils';

describe('truncate / titleFromText', () => {
  it('collapses whitespace and cuts with ellipsis', () => {
    expect(truncate('  hello   world  ', 20)).toBe('hello world');
    expect(truncate('a'.repeat(100), 10)).toBe('aaaaaaaaa…');
  });

  it('falls back to New chat for empty input', () => {
    expect(titleFromText('   ')).toBe('New chat');
    expect(titleFromText('Plan the launch')).toBe('Plan the launch');
  });
});

describe('maskKey', () => {
  it('keeps only a hint of the key', () => {
    expect(maskKey('sk-1234567890abcdef')).toBe('sk-…cdef');
    expect(maskKey('short')).toBe('••••');
  });
});

describe('formatBytes', () => {
  it('formats across units', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('dayBucket', () => {
  it('buckets recent timestamps', () => {
    const now = new Date();
    expect(dayBucket(now.toISOString())).toBe('Today');
    expect(dayBucket(new Date(now.getTime() - 86_400_000).toISOString())).toBe('Yesterday');
    expect(dayBucket(new Date(now.getTime() - 3 * 86_400_000).toISOString())).toBe(
      'Previous 7 days',
    );
    expect(dayBucket(new Date(now.getTime() - 30 * 86_400_000).toISOString())).toBe('Older');
  });
});
