import type { UIMessage } from 'ai';

export type ProviderKind = 'openai' | 'anthropic' | 'google' | 'openai-compatible';

export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error' | 'stopped';

export type ArtifactKind = 'presentation' | 'pdf' | 'document' | 'html';

export type Theme = 'light' | 'dark' | 'system';

export interface CatalogModel {
  id: string;
  label: string;
  contextWindow?: number;
}

export interface ChatSettings {
  user_id: string;
  display_name: string;
  response_language: string;
  theme: Theme;
  default_provider_key_id: string | null;
  default_model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  system_prompt: string;
  agent_mode: boolean;
  enabled_skills: string[];
  send_on_enter: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderKey {
  id: string;
  user_id: string;
  provider: ProviderKind;
  label: string;
  base_url: string;
  key_hint: string;
  models: CatalogModel[];
  models_fetched_at: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  instructions: string;
  icon: string;
  color: string;
  default_model: string;
  default_provider_key_id: string | null;
  enabled_skills: string[];
  agent_mode: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  extracted_text: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  provider: string;
  model: string;
  provider_key_id: string | null;
  agent_mode: boolean;
  enabled_skills: string[];
  pinned: boolean;
  archived: boolean;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageMetadata {
  createdAt?: string;
  provider?: string;
  model?: string;
  status?: MessageStatus;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export type ChatUIMessage = UIMessage<ChatMessageMetadata>;

export interface MessageRow {
  id: string;
  conversation_id: string;
  user_id: string;
  role: ChatUIMessage['role'];
  parts: ChatUIMessage['parts'];
  status: MessageStatus;
  provider: string;
  model: string;
  error: string;
  prompt_tokens: number;
  completion_tokens: number;
  created_at: string;
}

export interface Skill {
  id: string;
  user_id: string;
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Artifact {
  id: string;
  user_id: string;
  conversation_id: string | null;
  message_id: string | null;
  kind: ArtifactKind;
  title: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface UsageEvent {
  id: number;
  user_id: string;
  conversation_id: string | null;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number;
  agent_mode: boolean;
  skills: string[];
  status: string;
  created_at: string;
}

/** Reference to a stored provider key. `env:*` ids use server-side env keys. */
export interface ProviderKeyRef {
  id: string;
  provider: ProviderKind;
  label: string;
  baseUrl: string;
  source: 'user' | 'env';
}

export interface ArtifactToolOutput {
  artifactId: string;
  kind: ArtifactKind;
  title: string;
  url: string;
  previewUrl?: string;
  sizeBytes: number;
  meta?: Record<string, unknown>;
}
