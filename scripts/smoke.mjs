/**
 * End-to-end smoke test against the local dev stack.
 *
 *   npm run dev            (terminal 1)
 *   npm run mock:provider  (terminal 2)
 *   node scripts/smoke.mjs
 *
 * Signs in the seeded demo user through @supabase/ssr (same cookie flow as the
 * app), creates a conversation with a mock provider key, streams a chat reply,
 * then runs an agent-mode request that must produce a real PDF artifact.
 */
import { createCipheriv, randomBytes, scryptSync } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';

const APP = process.env.SMOKE_APP_URL ?? 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:56321';
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const ENCRYPTION_SECRET =
  process.env.KEY_ENCRYPTION_SECRET ?? '9ZNhLlPoavJVKUIYZQplTklUoSgL2y8fyB5/V84EsQA=';

const DEMO_EMAIL = 'demo@mindlarp.local';
const DEMO_PASSWORD = 'demo-password-123';

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

// --- cookie jar shared by the ssr client and fetch calls --------------------
const jar = new Map();
const supabase = createServerClient(SUPABASE_URL, ANON_KEY, {
  cookies: {
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    setAll: (cookies) => {
      for (const { name, value } of cookies) jar.set(name, value);
    },
  },
});

function cookieHeader() {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function appFetch(path, init = {}) {
  return fetch(`${APP}${path}`, {
    ...init,
    headers: { cookie: cookieHeader(), ...(init.headers ?? {}) },
    redirect: 'manual',
  });
}

// --- same AES-256-GCM scheme as src/lib/crypto.ts ---------------------------
function encryptKey(plaintext) {
  const key = scryptSync(ENCRYPTION_SECRET, 'mindlarp-chat.provider-keys.v1', 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}

const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email: DEMO_EMAIL,
  password: DEMO_PASSWORD,
});
if (authError) fail(`sign-in: ${authError.message}`);
const userId = auth.user.id;
ok(`signed in as ${DEMO_EMAIL}`);

const chatPage = await appFetch('/chat');
if (![200, 307, 302].includes(chatPage.status)) fail(`/chat returned ${chatPage.status}`);
ok('/chat responds');

// --- conversation + mock provider key via PostgREST -------------------------
const keyResponse = await fetch(`${SUPABASE_URL}/rest/v1/provider_keys`, {
  method: 'POST',
  headers: {
    apikey: ANON_KEY,
    authorization: `Bearer ${auth.session.access_token}`,
    'content-type': 'application/json',
    'accept-profile': 'chat',
    'content-profile': 'chat',
    prefer: 'return=representation',
  },
  body: JSON.stringify({
    user_id: userId,
    provider: 'openai-compatible',
    label: 'Mock provider',
    base_url: 'http://localhost:8787/v1',
    encrypted_key: encryptKey('mock-key'),
    key_hint: 'moc…key',
  }),
});
if (!keyResponse.ok) fail(`create key: ${keyResponse.status} ${await keyResponse.text()}`);
const [providerKey] = await keyResponse.json();
ok('provider key stored (encrypted)');

async function createConversation(patch) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/conversations`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      authorization: `Bearer ${auth.session.access_token}`,
      'content-type': 'application/json',
      'accept-profile': 'chat',
      'content-profile': 'chat',
      prefer: 'return=representation',
    },
    body: JSON.stringify({
      user_id: userId,
      title: 'New chat',
      provider: 'openai-compatible',
      model: 'mock-1',
      provider_key_id: providerKey.id,
      ...patch,
    }),
  });
  if (!response.ok) fail(`create conversation: ${await response.text()}`);
  const [conversation] = await response.json();
  return conversation;
}

async function sendAndCollect(conversation, text) {
  const response = await appFetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: conversation.id,
      trigger: 'submit-message',
      messages: [
        {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: 'user',
          parts: [{ type: 'text', text }],
        },
      ],
    }),
  });
  if (!response.ok) fail(`/api/chat: ${response.status} ${await response.text()}`);
  const raw = await response.text();
  if (!raw.includes('data:')) fail('expected an SSE stream');

  // Reassemble streamed text from deltas for content assertions.
  let assembled = '';
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
    try {
      const chunk = JSON.parse(line.slice(6));
      if (chunk.type === 'text-delta') assembled += chunk.delta;
    } catch {
      // Ignore malformed lines.
    }
  }
  return { raw, assembled };
}

// --- 1. plain streaming chat -------------------------------------------------
const conversation = await createConversation({});
const stream = await sendAndCollect(conversation, 'Hello from the smoke test');
if (!stream.assembled.includes('Mock reply')) fail('stream did not contain the mock reply');
ok('chat streams a reply');

const messagesResponse = await fetch(
  `${SUPABASE_URL}/rest/v1/messages?conversation_id=eq.${conversation.id}&select=role,status`,
  {
    headers: {
      apikey: ANON_KEY,
      authorization: `Bearer ${auth.session.access_token}`,
      'accept-profile': 'chat',
    },
  },
);
const messages = await messagesResponse.json();
if (messages.length !== 2) fail(`expected 2 persisted messages, got ${messages.length}`);
ok('user + assistant messages persisted');

const usageResponse = await fetch(
  `${SUPABASE_URL}/rest/v1/usage_events?conversation_id=eq.${conversation.id}&select=total_tokens,status`,
  {
    headers: {
      apikey: ANON_KEY,
      authorization: `Bearer ${auth.session.access_token}`,
      'accept-profile': 'chat',
    },
  },
);
const usage = await usageResponse.json();
if (usage.length !== 1 || usage[0].total_tokens <= 0) fail('usage event missing or empty');
ok(`usage recorded (${usage[0].total_tokens} tokens)`);

// --- 2. agent mode produces a PDF artifact ----------------------------------
const agentConversation = await createConversation({ agent_mode: true, enabled_skills: ['pdf'] });
const agentStream = await sendAndCollect(agentConversation, 'Please write a PDF report');
if (!agentStream.raw.includes('createPdf')) fail('agent stream did not call createPdf');
ok('agent called createPdf');

const artifactsResponse = await fetch(
  `${SUPABASE_URL}/rest/v1/artifacts?conversation_id=eq.${agentConversation.id}&select=id,kind,title,storage_path,size_bytes`,
  {
    headers: {
      apikey: ANON_KEY,
      authorization: `Bearer ${auth.session.access_token}`,
      'accept-profile': 'chat',
    },
  },
);
const artifacts = await artifactsResponse.json();
if (artifacts.length !== 1 || artifacts[0].kind !== 'pdf') fail('PDF artifact row missing');
ok(`artifact stored: "${artifacts[0].title}" (${artifacts[0].size_bytes} bytes)`);

const download = await appFetch(`/api/artifacts/${artifacts[0].id}`);
if (![302, 307].includes(download.status)) fail(`artifact download: ${download.status}`);
const signedUrl = download.headers.get('location');
const fileResponse = await fetch(signedUrl);
const bytes = Buffer.from(await fileResponse.arrayBuffer());
if (bytes.subarray(0, 5).toString() !== '%PDF-') fail('downloaded file is not a PDF');
ok('artifact downloads as a valid PDF');

// --- 3. SSO handoff ----------------------------------------------------------
const { randomToken, sha256Hex } = await import('./smoke-crypto.mjs');
const token = randomToken();
const handoffInsert = await fetch(`${SUPABASE_URL}/rest/v1/sso_handoffs`, {
  method: 'POST',
  headers: {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz',
    authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    token_hash: sha256Hex(token),
    email: DEMO_EMAIL,
    display_name: 'Demo User',
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  }),
});
if (!handoffInsert.ok) fail(`handoff insert: ${await handoffInsert.text()}`);

const handoff = await appFetch(`/auth/handoff?token=${token}`);
if (![302, 307].includes(handoff.status)) fail(`handoff: ${handoff.status}`);
const replay = await appFetch(`/auth/handoff?token=${token}`);
const replayLocation = replay.headers.get('location') ?? '';
if (!replayLocation.includes('error=sso')) fail('replayed handoff token was not rejected');
ok('SSO handoff works once and rejects replay');

console.log('\nAll smoke checks passed.');
