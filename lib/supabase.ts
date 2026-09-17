// src/lib/supabase.ts
import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

let supabaseInstance: ReturnType<typeof createSupabaseBrowserClient> | null = null;

export function createBrowserClient() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabaseInstance;
}