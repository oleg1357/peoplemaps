import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseConfigured } from "@/lib/supabase";

export async function getServerSupabase() {
  if (!supabaseConfigured) return null;
  const cookieStore = await cookies();
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const envAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  return createServerClient(envUrl, envAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component; fine to ignore middleware-based refresh.
        }
      },
    },
  });
}
