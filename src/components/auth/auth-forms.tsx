'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import { OAuthButtons } from '@/components/auth/oauth-buttons';

function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/chat';
}

function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const message =
    error === 'sso'
      ? 'The single sign-on link expired or was already used. Sign in below.'
      : error === 'oauth'
        ? (searchParams.get('message') ?? 'The OAuth sign-in failed.')
        : error === 'auth'
          ? 'The confirmation link is invalid or expired. Please try again.'
          : '';

  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-danger/30 px-3 py-2 text-xs text-danger">
      {message}
    </p>
  );
}

function PasswordForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isSignUp = mode === 'sign-up';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    const supabase = createClient();
    const normalizedEmail = email.trim().toLowerCase();

    if (isSignUp) {
      const { data, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/chat`,
        },
      });

      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        router.replace('/chat');
        router.refresh();
      } else {
        setMessage('Check your email and follow the confirmation link to activate your account.');
      }
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError) {
        setError(authError.message);
      } else {
        router.replace(safeNext(searchParams.get('next')));
        router.refresh();
      }
    }

    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="h-10 rounded-md border border-line bg-raised px-3 outline-none transition focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Password</span>
        <input
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={isSignUp ? 'At least 8 characters' : 'Your password'}
          className="h-10 rounded-md border border-line bg-raised px-3 outline-none transition focus:border-accent"
        />
      </label>
      {error && <p role="alert" className="rounded-md border border-danger/30 px-3 py-2 text-xs text-danger">{error}</p>}
      {message && <p role="status" className="rounded-md border border-line px-3 py-2 text-xs text-muted">{message}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-1 flex h-10 items-center justify-center rounded-md bg-ink text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
}

export function SignInForm() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Sign in to your MindLarp account.</p>
      </div>
      <AuthError />
      <PasswordForm mode="sign-in" />
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        or continue with
        <span className="h-px flex-1 bg-line" />
      </div>
      <OAuthButtons />
      <p className="text-center text-sm text-muted">
        New here?{' '}
        <Link href="/sign-up" className="text-accent hover:underline">Create an account</Link>
      </p>
    </div>
  );
}

export function SignUpForm() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl">Create account</h1>
        <p className="mt-1 text-sm text-muted">Use your email and a password, or continue with a provider.</p>
      </div>
      <AuthError />
      <PasswordForm mode="sign-up" />
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        or sign up with
        <span className="h-px flex-1 bg-line" />
      </div>
      <OAuthButtons />
      <p className="text-center text-sm text-muted">
        Already registered?{' '}
        <Link href="/sign-in" className="text-accent hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
