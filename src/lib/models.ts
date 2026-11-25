import type { CatalogModel, ProviderKind } from './types';

export const PROVIDER_LABELS: Record<ProviderKind, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  'openai-compatible': 'OpenAI-compatible',
};

export const PROVIDER_KINDS: ProviderKind[] = [
  'openai',
  'anthropic',
  'google',
  'openai-compatible',
];

/** Suggested models; users can refresh the live catalog from the provider API. */
export const SUGGESTED_MODELS: Record<ProviderKind, CatalogModel[]> = {
  openai: [
    { id: 'gpt-5.2', label: 'GPT-5.2' },
    { id: 'gpt-5.2-mini', label: 'GPT-5.2 mini' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'o4-mini', label: 'o4-mini' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { id: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  ],
  google: [
    { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (preview)' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  ],
  'openai-compatible': [],
};

export const DEFAULT_BASE_URLS: Partial<Record<ProviderKind, string>> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
};

export const ENV_KEY_SOURCES: Record<string, { provider: ProviderKind; envVar: string }> = {
  'env:openai': { provider: 'openai', envVar: 'OPENAI_API_KEY' },
  'env:anthropic': { provider: 'anthropic', envVar: 'ANTHROPIC_API_KEY' },
  'env:google': { provider: 'google', envVar: 'GOOGLE_GENERATIVE_AI_API_KEY' },
};

export function modelsForKey(provider: ProviderKind, fetched: CatalogModel[]): CatalogModel[] {
  if (fetched.length > 0) return fetched;
  return SUGGESTED_MODELS[provider];
}

export function modelLabel(provider: ProviderKind, modelId: string, fetched: CatalogModel[]) {
  const known = modelsForKey(provider, fetched).find((model) => model.id === modelId);
  return known?.label ?? modelId;
}
