import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getISTDateString } from "@/lib/date";

export async function GET() {
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

  if (!user) {
    return NextResponse.json({ meals: [] });
  }

  const today = getISTDateString();

  const { data } = await supabase
    .from("meal_tracking")
    .select("meal_type")
    .eq("user_id", user.id)
    .eq("tracking_date", today)
    .eq("action_type", "ate_meal");

  return NextResponse.json({
    meals: data?.map((m) => m.meal_type) || [],
  });
}