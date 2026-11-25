import { builtinSkill } from '@/lib/skills';
import type { ChatSettings, Project, ProjectFile, Skill } from '@/lib/types';

export interface SystemPromptInput {
  settings: Pick<ChatSettings, 'system_prompt' | 'response_language'>;
  project?: Pick<Project, 'name' | 'instructions'> | null;
  projectFiles?: Pick<ProjectFile, 'name' | 'extracted_text'>[];
  enabledSkillKeys?: string[];
  customSkills?: Pick<Skill, 'name' | 'instructions'>[];
  agentMode?: boolean;
  now?: Date;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ru: 'Russian',
  es: 'Spanish',
  de: 'German',
  fr: 'French',
  zh: 'Chinese',
};

export function buildSystemPrompt(input: SystemPromptInput): string {
  const sections: string[] = [];
  const now = input.now ?? new Date();

  sections.push(
    [
      'You are MindLarp Chat, a precise and helpful AI assistant.',
      `Today is ${now.toISOString().slice(0, 10)}.`,
      'Write in a clear, direct style. Use Markdown for structure and fenced code blocks with language tags.',
    ].join(' '),
  );

  const language = input.settings.response_language;
  if (language && language !== 'auto') {
    const name = LANGUAGE_NAMES[language] ?? language;
    sections.push(`Always respond in ${name}, regardless of the language of the question.`);
  }

  if (input.settings.system_prompt.trim()) {
    sections.push(`User instructions:\n${input.settings.system_prompt.trim()}`);
  }

  if (input.project) {
    const projectLines = [`This conversation belongs to the project "${input.project.name}".`];
    if (input.project.instructions.trim()) {
      projectLines.push(`Project instructions:\n${input.project.instructions.trim()}`);
    }
    sections.push(projectLines.join('\n'));
  }

  const files = input.projectFiles ?? [];
  if (files.length > 0) {
    const listing = files.map((file) => `- ${file.name}`).join('\n');
    sections.push(`Project knowledge files (use readProjectFile to read them):\n${listing}`);
  }

  const skillInstructions: string[] = [];
  for (const key of input.enabledSkillKeys ?? []) {
    const skill = builtinSkill(key);
    if (skill) skillInstructions.push(`[${skill.name}]\n${skill.instructions}`);
  }
  for (const skill of input.customSkills ?? []) {
    if (skill.instructions.trim()) {
      skillInstructions.push(`[${skill.name}]\n${skill.instructions.trim()}`);
    }
  }
  if (skillInstructions.length > 0) {
    sections.push(`Active skills:\n${skillInstructions.join('\n\n')}`);
  }

  if (input.agentMode) {
    sections.push(
      [
        'Agent mode is ON: you may call tools to accomplish the task end to end.',
        'Plan briefly, act with tools, verify the result, then report what you did.',
        'Prefer producing a concrete artifact (file) over describing how to make one.',
      ].join(' '),
    );
  }

  return sections.join('\n\n');
}
