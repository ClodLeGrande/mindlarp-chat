'use client';

import { useState } from 'react';

import { createClient } from '@/lib/supabase/client';

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.96H1.29v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.29a12 12 0 0 0 0 10.76l3.99-3.1Z" />
      <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.99 3.1C6.22 6.87 8.87 4.76 12 4.76Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.78 1.05.78 2.12v3.14c0 .31.2.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.7 5.2A18.2 18.2 0 0 0 15.2 4l-.2.4a16.8 16.8 0 0 0-6 0L8.8 4a18.2 18.2 0 0 0-4.5 1.2C1.5 9.5.7 13.7 1.1 17.8a18.4 18.4 0 0 0 5.5 2.8l1.2-2a11.8 11.8 0 0 1-1.9-.9l.5-.4a13.2 13.2 0 0 0 11.2 0l.5.4a11.8 11.8 0 0 1-1.9.9l1.2 2a18.4 18.4 0 0 0 5.5-2.8c.5-4.8-.8-8.9-3.2-12.6ZM8.7 14.8c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Zm6.6 0c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Z" />
    </svg>
  );
}

const BUTTON_CLASS =
  'flex h-10 cursor-pointer items-center justify-center gap-2.5 rounded-md border border-line bg-raised text-sm font-medium transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50';

export function OAuthButtons() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function signIn(provider: 'google' | 'github' | 'discord') {
    setBusy(provider);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/chat` },
    });
    if (authError) {
      setError(authError.message);
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <button type="button" disabled={busy !== null} onClick={() => signIn('google')} className={BUTTON_CLASS}>
        <GoogleIcon /> {busy === 'google' ? 'Redirecting…' : 'Continue with Google'}
      </button>
      <button type="button" disabled={busy !== null} onClick={() => signIn('github')} className={BUTTON_CLASS}>
        <GitHubIcon /> {busy === 'github' ? 'Redirecting…' : 'Continue with GitHub'}
      </button>
      <button type="button" disabled={busy !== null} onClick={() => signIn('discord')} className={BUTTON_CLASS}>
        <DiscordIcon /> {busy === 'discord' ? 'Redirecting…' : 'Continue with Discord'}
      </button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
