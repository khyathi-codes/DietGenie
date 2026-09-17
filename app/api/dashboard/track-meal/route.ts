import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getISTDateString } from "@/lib/date";

export async function POST(req: Request) {
  try {
    const {
  meal_type,
  calories,
  protein,
  eaten,
} = await req.json();
console.log("TRACK MEAL REQUEST:", {
  meal_type,
  calories,
  protein,
  eaten,
});

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
    const { data: alreadyTracked } = await supabase
  .from("meal_tracking")
  .select("*")
  .eq("user_id", user.id)
  .eq("tracking_date", today)
  .eq("meal_type", meal_type)
  .eq("action_type", "ate_meal")
  .maybeSingle();

if (alreadyTracked) {
  return NextResponse.json({ success: true });
}

    const { data: existing } = await supabase
      .from("daily_nutrition_summary")
      .select("*")
      .eq("user_id", user.id)
      .eq("summary_date", today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("daily_nutrition_summary")
        .update({
          total_calories: existing.total_calories + calories,
          total_protein: existing.total_protein + protein,
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("daily_nutrition_summary")
        .insert({
          user_id: user.id,
          summary_date: today,
          total_calories: calories,
          total_protein: protein,
        });
    }
    const { error } = await supabase
  .from("meal_tracking")
  .insert({
    user_id: user.id,
    tracking_date: today,
    meal_type,
    action_type: "ate_meal",
    calories,
    protein,
    analysis: "Meal accepted",
  });

console.log("MEAL TRACKING ERROR:", error);

if (error) {
  console.error("Failed to save meal tracking:", error);

  return NextResponse.json(
    { error: "Failed to save meal tracking." },
    { status: 500 }
  );
}

return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to track meal" },
      { status: 500 }
    );
  }
}