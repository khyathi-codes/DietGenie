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
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("streak_count,last_active_date")
      .eq("id", user.id)
      .single();

    const todayStr = getISTDateString();
    const today = new Date(todayStr);

    let streak = profile?.streak_count || 0;
    const lastDate = profile?.last_active_date;

    if (!lastDate) {
      streak = 1;
    } else {
      const last = new Date(lastDate);

      const diffDays = Math.floor(
        (today.getTime() - last.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0) {
        // same day
      } else if (diffDays === 1) {
        streak += 1;
      } else {
        streak = 1;
      }
    }

    await supabase
      .from("profiles")
      .update({
        streak_count: streak,
        last_active_date: todayStr,
      })
      .eq("id", user.id);

    return NextResponse.json({
      streak_count: streak,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load streak" },
      { status: 500 }
    );
  }
}