import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getISTDateString } from "@/lib/date";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const dish = body?.dish;

    if (!dish) {
      return NextResponse.json(
        { error: "Dish information is missing." },
        { status: 400 }
      );
    }

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
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                cookieStore.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const today = getISTDateString();

    const calories =
      Number(dish.calories) || 0;

    const protein =
      Number(dish.protein) || 0;

    if (calories <= 0) {
      return NextResponse.json(
        {
          error:
            "This dish has invalid calorie information.",
        },
        { status: 400 }
      );
    }

    // Prevent the same Build My Plate dish
    // from being counted repeatedly.
    const { data: existing } = await supabase
      .from("meal_tracking")
      .select("id")
      .eq("user_id", user.id)
      .eq("tracking_date", today)
      .eq("meal_type", "build_my_plate")
      .eq("action_type", "ate_build_my_plate")
      .eq("food_text", dish.name)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyTracked: true,
      });
    }

    // Get today's nutrition summary.
    const { data: nutrition } = await supabase
      .from("daily_nutrition_summary")
      .select("*")
      .eq("user_id", user.id)
      .eq("summary_date", today)
      .maybeSingle();

    if (nutrition) {
      const { error: updateError } =
        await supabase
          .from("daily_nutrition_summary")
          .update({
            total_calories:
              (Number(nutrition.total_calories) || 0) +
              calories,

            total_protein:
              (Number(nutrition.total_protein) || 0) +
              protein,
          })
          .eq("id", nutrition.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      const { error: insertSummaryError } =
        await supabase
          .from("daily_nutrition_summary")
          .insert({
            user_id: user.id,
            summary_date: today,
            total_calories: calories,
            total_protein: protein,
          });

      if (insertSummaryError) {
        throw insertSummaryError;
      }
    }

    // Save the Build My Plate food event.
    const { error: trackingError } =
      await supabase
        .from("meal_tracking")
        .insert({
          user_id: user.id,
          tracking_date: today,
          meal_type: "build_my_plate",
          action_type: "ate_build_my_plate",
          food_text: dish.name,
          calories,
          protein,
          analysis: dish,
        });

    if (trackingError) {
      throw trackingError;
    }

    return NextResponse.json({
      success: true,
      calories_added: calories,
      protein_added: protein,
    });
  } catch (error: unknown) {
  console.error(
    "Build My Plate tracking error:",
    error
  );

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Unable to record Build My Plate meal.",
    },
    { status: 500 }
  );
}
}