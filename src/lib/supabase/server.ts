import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Request-scoped client running as the signed-in user (RLS enforced). */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component; the middleware refreshes sessions.
          }
        },
      },
      cookieOptions: cookieDomain() ? { domain: cookieDomain() } : undefined,
    },
  );
}

function cookieDomain(): string | undefined {
  const domain = process.env.AUTH_COOKIE_DOMAIN;
  return domain ? domain : undefined;
}
