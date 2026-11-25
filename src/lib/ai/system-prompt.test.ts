import { describe, expect, it } from 'vitest';

import { buildSystemPrompt } from './system-prompt';

const base = {
  settings: { system_prompt: '', response_language: 'en' },
  now: new Date('2026-11-25T00:00:00Z'),
};

describe('buildSystemPrompt', () => {
  it('includes identity and date', () => {
    const prompt = buildSystemPrompt(base);
    expect(prompt).toContain('MindLarp Chat');
    expect(prompt).toContain('2026-11-25');
  });

  it('enforces the response language', () => {
    const prompt = buildSystemPrompt({
      ...base,
      settings: { ...base.settings, response_language: 'ru' },
    });
    expect(prompt).toContain('respond in Russian');
  });

  it('skips language instruction in auto mode', () => {
    const prompt = buildSystemPrompt({
      ...base,
      settings: { ...base.settings, response_language: 'auto' },
    });
    expect(prompt).not.toContain('Always respond in');
  });

  it('includes project instructions and knowledge listing', () => {
    const prompt = buildSystemPrompt({
      ...base,
      project: { name: 'Launch', instructions: 'Be brief.' },
      projectFiles: [{ name: 'brief.md', extracted_text: 'content' }],
    });
    expect(prompt).toContain('"Launch"');
    expect(prompt).toContain('Be brief.');
    expect(prompt).toContain('brief.md');
    expect(prompt).toContain('readProjectFile');
  });

  it('includes builtin and custom skill instructions', () => {
    const prompt = buildSystemPrompt({
      ...base,
      enabledSkillKeys: ['pdf'],
      customSkills: [{ name: 'Legal reviewer', instructions: 'Cite clauses.' }],
    });
    expect(prompt).toContain('createPdf');
    expect(prompt).toContain('Legal reviewer');
    expect(prompt).toContain('Cite clauses.');
  });

  it('adds agent mode guidance only when enabled', () => {
    expect(buildSystemPrompt(base)).not.toContain('Agent mode is ON');
    expect(buildSystemPrompt({ ...base, agentMode: true })).toContain('Agent mode is ON');
  });
});
