import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getISTDateString } from "@/lib/date";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      meal_type,
      action_type,
      food_text,
      calories,
      protein,
      analysis,
    } = await req.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await supabase.from("meal_tracking").insert({
      user_id: user.id,
      tracking_date: getISTDateString(),
      meal_type,
      action_type,
      food_text,
      calories,
      protein,
      analysis,
    });
    const today = getISTDateString()

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
      total_calories: existing.total_calories + (calories || 0),
      total_protein: existing.total_protein + (protein || 0),
    })
    .eq("id", existing.id);
} else {
  await supabase
    .from("daily_nutrition_summary")
    .insert({
      user_id: user.id,
      summary_date: today,
      total_calories: calories || 0,
      total_protein: protein || 0,
    });
}

    return NextResponse.json({ success: true });
    } catch (e: unknown) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Something went wrong.",
      },
      { status: 500 }
    );
  }
}