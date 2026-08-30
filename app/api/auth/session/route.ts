import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { supabaseConfigured } from "@/lib/supabase";

export async function GET() {
  if (!supabaseConfigured) {
    return NextResponse.json({ user: null, configured: false });
  }
  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ user: null });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return NextResponse.json({ user, configured: true });
}
