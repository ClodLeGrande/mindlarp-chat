import 'server-only';

/**
 * Direct Google / GitHub / Discord OAuth. Supabase's OAuth providers are not
 * involved; after the exchange we open a Supabase session via a service-side
 * magic-link token. Accounts are matched by verified email.
 */

export type OAuthProvider = 'google' | 'github' | 'discord';

export const OAUTH_PROVIDERS: OAuthProvider[] = ['google', 'github', 'discord'];

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === 'google' || value === 'github' || value === 'discord';
}

interface ProviderConfig {
  clientId: string | undefined;
  clientSecret: string | undefined;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
}

export function providerConfig(provider: OAuthProvider): ProviderConfig {
  if (provider === 'google') {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: 'openid email profile',
    };
  }
  if (provider === 'github') {
    return {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorizeUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scope: 'read:user user:email',
    };
  }
  return {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    authorizeUrl: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    scope: 'identify email',
  };
}

export function callbackUrl(siteUrl: string, provider: OAuthProvider) {
  return `${siteUrl}/auth/oauth/${provider}/callback`;
}

export function authorizeRedirectUrl(
  provider: OAuthProvider,
  siteUrl: string,
  state: string,
): string {
  const config = providerConfig(provider);
  const params = new URLSearchParams({
    client_id: config.clientId ?? '',
    redirect_uri: callbackUrl(siteUrl, provider),
    response_type: 'code',
    scope: config.scope,
    state,
  });
  if (provider === 'google') {
    params.set('access_type', 'online');
    params.set('prompt', 'select_account');
  }
  return `${config.authorizeUrl}?${params.toString()}`;
}

export interface OAuthProfile {
  email: string;
  name: string;
  avatarUrl: string;
  providerUserId: string;
}

export async function exchangeCodeForProfile(
  provider: OAuthProvider,
  code: string,
  siteUrl: string,
): Promise<OAuthProfile> {
  const config = providerConfig(provider);
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`${provider} OAuth is not configured (missing client id/secret).`);
  }

  const tokenResponse = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: callbackUrl(siteUrl, provider),
    }),
  });
  if (!tokenResponse.ok) {
    throw new Error(`${provider} token exchange failed (${tokenResponse.status}).`);
  }
  const token = (await tokenResponse.json()) as { access_token?: string; error?: string };
  if (!token.access_token) {
    throw new Error(token.error ?? `${provider} returned no access token.`);
  }

  if (provider === 'google') {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    if (!response.ok) throw new Error('Could not read the Google profile.');
    const profile = (await response.json()) as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };
    if (!profile.email || !profile.email_verified) {
      throw new Error('The Google account has no verified email.');
    }
    return {
      email: profile.email.toLowerCase(),
      name: profile.name ?? '',
      avatarUrl: profile.picture ?? '',
      providerUserId: profile.sub,
    };
  }

  if (provider === 'discord') {
    const response = await fetch('https://discord.com/api/users/@me', {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    if (!response.ok) throw new Error('Could not read the Discord profile.');
    const profile = (await response.json()) as {
      id: string;
      username: string;
      global_name?: string | null;
      avatar?: string | null;
      email?: string | null;
      verified?: boolean;
    };
    if (!profile.email || profile.verified !== true) {
      throw new Error('The Discord account has no verified email.');
    }
    return {
      email: profile.email.toLowerCase(),
      name: profile.global_name ?? profile.username,
      avatarUrl: profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
        : '',
      providerUserId: profile.id,
    };
  }

  const headers = {
    authorization: `Bearer ${token.access_token}`,
    accept: 'application/vnd.github+json',
    'user-agent': 'MindLarp-Chat',
  };
  const response = await fetch('https://api.github.com/user', { headers });
  if (!response.ok) throw new Error('Could not read the GitHub profile.');
  const profile = (await response.json()) as {
    id: number;
    login: string;
    name?: string;
    avatar_url?: string;
    email?: string | null;
  };

  let email = profile.email ?? '';
  if (!email) {
    const emailsResponse = await fetch('https://api.github.com/user/emails', { headers });
    if (emailsResponse.ok) {
      const emails = (await emailsResponse.json()) as {
        email: string;
        primary: boolean;
        verified: boolean;
      }[];
      email = emails.find((entry) => entry.primary && entry.verified)?.email ?? '';
    }
  }
  if (!email) throw new Error('The GitHub account has no verified email.');

  return {
    email: email.toLowerCase(),
    name: profile.name ?? profile.login,
    avatarUrl: profile.avatar_url ?? '',
    providerUserId: String(profile.id),
  };
}
