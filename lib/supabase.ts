import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

// Browser-safe client (used for sign in/up and reading the session cookie).
// Session is persisted in HTTP cookies (via @supabase/ssr) so the server-side
// clients (middleware + API routes) see the same session. On the server we
// return null — only the config flags above are used there.
export const supabase =
  supabaseConfigured && typeof document !== "undefined"
    ? createBrowserClient(url as string, anonKey as string, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;