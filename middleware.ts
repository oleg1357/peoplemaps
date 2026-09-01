import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseConfigured } from "@/lib/supabase";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (!supabaseConfigured) {
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value);
        });
      },
    },
  });

  // On the OAuth callback, complete the `code` → session cookie exchange and
  // refresh the cookie chain. This is the only path that needs an auth lookup
  // (getUser) here; every other route relies on the client-side AuthContext
  // (and server-side route guards) instead, so we skip the Supabase network
  // round-trip on all other requests to keep request counts low.
  if (request.nextUrl.pathname === "/login/callback") {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // The cookie chain is only fully established once the exchange completes;
    // send the user home where AuthContext signs them in. Copy the fresh auth
    // cookies onto the redirect so the session persists.
    if (user) {
      const redirect = NextResponse.redirect(new URL("/", request.url));
      response.cookies
        .getAll()
        .forEach((c) => redirect.cookies.set(c.name, c.value, c));
      return redirect;
    }
  }

  return response;
}

// Only the OAuth callback needs middleware (to exchange the `code` for session
// cookies). Everything else is handled by the client-side AuthContext and
// server-side route guards, so running middleware elsewhere just adds cost.
export const config = {
  matcher: ["/login/callback"],
};
