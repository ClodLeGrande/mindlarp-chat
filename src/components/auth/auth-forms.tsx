'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { OAuthButtons } from '@/components/auth/oauth-buttons';

function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const message =
    error === 'sso'
      ? 'The single sign-on link expired or was already used. Sign in directly below.'
      : error === 'oauth'
        ? (searchParams.get('message') ?? 'The OAuth sign-in was cancelled or failed.')
        : error === 'auth'
          ? 'The sign-in link is invalid or expired. Try again.'
          : '';

  if (!message) return null;
  return (
    <p className="rounded-md border border-danger/30 px-3 py-2 text-xs text-danger">{message}</p>
  );
}

export function SignInForm() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Same account as the MindLarp site and console.</p>
      </div>

      <AuthError />
      <OAuthButtons />

      <p className="text-center text-sm text-muted">
        New here?{' '}
        <Link href="/sign-up" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export function SignUpForm() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl">Create account</h1>
        <p className="mt-1 text-sm text-muted">
          One MindLarp account for the site, the console and this chat. Your account is created
          automatically on first sign-in.
        </p>
      </div>

      <AuthError />
      <OAuthButtons />

      <p className="text-center text-sm text-muted">
        Already registered?{' '}
        <Link href="/sign-in" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
