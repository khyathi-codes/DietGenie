/**
 * src/app/auth/callback/route.ts
 *
 * Next.js Route Handler (not a page — no UI).
 * This URL is where Supabase redirects after:
 *   • Email/password confirmation link click
 *   • Google / OAuth provider callback
 
 * It exchanges the ?code= param for a real session cookie,
 * then routes the user to:
 *   /onboarding  — if they have no profile yet  (first login)
 *   /dashboard   — if they have a profile        (returning user)
 */

import { NextRequest, NextResponse } from "next/server";
// 🌟 Fixed: Importing directly from the official Supabase SSR package
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code        = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();

    // 🌟 Fixed: Initializing the server client explicitly with your environment variables
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
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
              // The `setAll` method can be called from a Server Component
              // which cannot write cookies. This can be safely ignored.
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const userId = data.session.user.id;

      /* Check if this user has completed onboarding */
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      const destination = profile ? "/dashboard" : "/onboarding";
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  /*
   * Something went wrong (bad code, expired link, etc.)
   * Send them back to login with an error hint.
   */
  return NextResponse.redirect(
    `${origin}/auth/login?error=Could+not+authenticate+you.+Please+try+again.`
  );
}