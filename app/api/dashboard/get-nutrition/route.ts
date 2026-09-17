import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getISTDateString } from "@/lib/date";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );

    const today = getISTDateString();

    const { data } = await supabase
      .from("daily_nutrition_summary")
      .select("*")
      .eq("user_id", user.id)
      .eq("summary_date", today)
      .maybeSingle();

    return NextResponse.json(
      data || {
        total_calories: 0,
        total_protein: 0,
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to load nutrition" },
      { status: 500 }
    );
  }
}