import 'server-only';

import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogle } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';

import { DEFAULT_BASE_URLS } from '@/lib/models';
import type { CatalogModel, ProviderKind } from '@/lib/types';

export interface ModelTarget {
  provider: ProviderKind;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export function resolveLanguageModel(target: ModelTarget): LanguageModel {
  const { provider, model, apiKey, baseUrl } = target;

  switch (provider) {
    case 'openai':
      return createOpenAI({ apiKey, baseURL: baseUrl || undefined })(model);
    case 'anthropic':
      return createAnthropic({ apiKey, baseURL: baseUrl || undefined })(model);
    case 'google':
      return createGoogle({ apiKey, baseURL: baseUrl || undefined })(model);
    case 'openai-compatible': {
      if (!baseUrl) {
        throw new Error('An OpenAI-compatible provider requires a base URL.');
      }
      return createOpenAICompatible({ name: 'custom', baseURL: baseUrl, apiKey })(model);
    }
  }
}

/** Fetch the live model catalog from a provider API. */
export async function fetchRemoteModels(
  provider: ProviderKind,
  apiKey: string,
  baseUrl?: string,
): Promise<CatalogModel[]> {
  if (provider === 'google') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=200`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Google models request failed (${response.status}).`);
    const body = (await response.json()) as {
      models?: { name: string; displayName?: string; supportedGenerationMethods?: string[] }[];
    };
    return (body.models ?? [])
      .filter((entry) => entry.supportedGenerationMethods?.includes('generateContent'))
      .map((entry) => ({
        id: entry.name.replace(/^models\//, ''),
        label: entry.displayName ?? entry.name.replace(/^models\//, ''),
      }));
  }

  if (provider === 'anthropic') {
    const url = `${baseUrl || DEFAULT_BASE_URLS.anthropic}/models?limit=200`;
    const response = await fetch(url, {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    });
    if (!response.ok) throw new Error(`Anthropic models request failed (${response.status}).`);
    const body = (await response.json()) as { data?: { id: string; display_name?: string }[] };
    return (body.data ?? []).map((entry) => ({
      id: entry.id,
      label: entry.display_name ?? entry.id,
    }));
  }

  const url = `${baseUrl || DEFAULT_BASE_URLS.openai}/models`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!response.ok) throw new Error(`Models request failed (${response.status}).`);
  const body = (await response.json()) as { data?: { id: string }[] };
  return (body.data ?? [])
    .map((entry) => ({ id: entry.id, label: entry.id }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
