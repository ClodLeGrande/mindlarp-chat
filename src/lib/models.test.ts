import { describe, expect, it } from 'vitest';

import { modelLabel, modelsForKey, SUGGESTED_MODELS } from './models';

describe('model catalog', () => {
  it('prefers fetched models over suggestions', () => {
    const fetched = [{ id: 'custom-1', label: 'Custom 1' }];
    expect(modelsForKey('openai', fetched)).toEqual(fetched);
  });

  it('falls back to suggestions when nothing fetched', () => {
    expect(modelsForKey('anthropic', [])).toEqual(SUGGESTED_MODELS.anthropic);
    expect(modelsForKey('openai-compatible', [])).toEqual([]);
  });

  it('resolves labels with raw-id fallback', () => {
    expect(modelLabel('openai', 'gpt-5.2', [])).toBe('GPT-5.2');
    expect(modelLabel('openai-compatible', 'my-model', [])).toBe('my-model');
  });
});
