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

  // Refreshes the auth cookie chain when needed and completes an OAuth `code`
  // exchange (code → session cookies) for the callback route. Call once per
  // request; it is a no-op when the session is already valid.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // On the OAuth callback, the cookie chain is only fully established once the
  // exchange completes; send the user home where AuthContext signs them in.
  // Copy the fresh auth cookies onto the redirect so the session persists.
  if (request.nextUrl.pathname === "/login/callback" && user) {
    const redirect = NextResponse.redirect(new URL("/", request.url));
    response.cookies
      .getAll()
      .forEach((c) => redirect.cookies.set(c.name, c.value, c));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
