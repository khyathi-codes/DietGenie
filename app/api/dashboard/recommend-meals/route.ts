import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getISTDateString } from "@/lib/date";
type Meal = {
  meal_type: string;
  meal_name: string;
  calories: number;
  protein: number;
  description: string;
};

// ✅ DO NOT init GoogleGenAI at module level — env vars may not be loaded yet.
// Always instantiate inside the handler so process.env is fully resolved.

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in environment variables.");
      return NextResponse.json({ error: "Server misconfiguration: missing API key." }, { status: 500 });
    }

    // ✅ Init inside handler
    const ai = new GoogleGenAI({ apiKey });

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(c) { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const today = getISTDateString();
    const { data: existingPlan } = await supabase
  .from("daily_meal_plans")
  .select("meals")
  .eq("user_id", user.id)
  .eq("plan_date", today)
  .maybeSingle();

if (existingPlan) {
  return NextResponse.json(existingPlan.meals);
}

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

    const cuisineMap: Record<string, string> = {
      "south_indian": "South Indian (e.g. idli, dosa, sambar, upma, pongal, rasam, curd rice, uttapam)",
      "north_indian": "North Indian (e.g. paratha, dal makhani, paneer sabji, roti, rajma, chole, lassi)",
      "both": "a mix of both South Indian and North Indian dishes",
    };

    const budgetMap: Record<string, string> = {
      "standard": "simple, affordable everyday Indian home-cooked meals using basic ingredients costing under ₹100 per meal",
      "premium": "premium quality meals with high-protein ingredients like chicken, paneer, eggs, nuts, Greek yogurt, costing ₹150-300 per meal",
    };

    const cuisine = cuisineMap[profile.cuisine_preference] || profile.cuisine_preference;
    const budget = budgetMap[profile.budget_tier] || profile.budget_tier;

    const response = await ai.models.generateContent({
model: "gemini-3.5-flash-lite",
      contents: `You are a certified Indian nutritionist. Generate a personalized daily 3-meal plan (Breakfast, Lunch, Dinner) strictly following ALL these rules:

CUISINE: Only use ${cuisine} dishes. Do NOT suggest Western, Continental, or generic meals under any circumstances.
BUDGET: ${budget}.
CALORIES: Total daily calories should be close to ${profile.calorie_target}kcal spread across 3 meals.
DIABETES: ${profile.has_diabetes === true || profile.has_diabetes === "true" ? "User has diabetes — avoid high sugar foods, white rice, maida, sweets, fruit juices. Prefer millets, oats, whole grains, low-GI foods." : "No diabetes restrictions."}
FITNESS GOAL: ${profile.fitness_goal || "maintain health"}.

Each meal must be a real, specific Indian dish name — not a generic description. Example good names: "Masala Oats Upma", "Palak Paneer with 2 Rotis", "Chicken Chettinad with Brown Rice".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              meal_type: { type: Type.STRING },
              meal_name: { type: Type.STRING },
              calories: { type: Type.INTEGER },
              protein: { type: Type.INTEGER },
              description: { type: Type.STRING },
            },
            required: ["meal_type", "meal_name", "calories", "protein", "description"],
          },
        },
      },
    });

    const generatedMeals = JSON.parse(response.text || "[]");

// Force the meal totals to match the user's exact calorie target,
// scaling each meal proportionally instead of trusting the AI's raw numbers.
const targetCalories = Number(profile.calorie_target) || 0;
const totalGenerated = generatedMeals.reduce(
  (sum: number, meal: Meal) =>
    sum + (Number(meal.calories) || 0),
  0
);

let adjustedMeals = generatedMeals;

if (targetCalories > 0 && totalGenerated > 0) {
  const scaleFactor = targetCalories / totalGenerated;
  adjustedMeals = generatedMeals.map((meal: Meal) => ({
    ...meal,
    calories: Math.round((Number(meal.calories) || 0) * scaleFactor),
    protein: Math.round((Number(meal.protein) || 0) * scaleFactor),
  }));

  // Rounding can leave the sum off by 1-2 kcal — dump that drift onto the biggest meal.
  const adjustedTotal = adjustedMeals.reduce(
  (sum: number, meal: Meal) => sum + meal.calories,
  0
);
  const drift = targetCalories - adjustedTotal;
  if (drift !== 0) {
   const largestMeal = adjustedMeals.reduce((a: Meal, b: Meal) =>
      a.calories > b.calories ? a : b
    );
    largestMeal.calories += drift;
  }
}

const result = await supabase
  .from("daily_meal_plans")
  .insert({
    user_id: user.id,
    plan_date: today,
    meals: adjustedMeals,
  });

if (result.error) {
  console.error("Failed to save meal plan:", result.error);
  return NextResponse.json(
    { error: "Failed to save meal plan." },
    { status: 500 }
  );
}

return NextResponse.json(adjustedMeals);
  } catch (err: unknown) {
  console.error("Recommend Meals GET Error:", err);

  const message =
    err instanceof Error
      ? err.message
      : "Unable to generate meal plan.";

  return NextResponse.json(
    { error: message },
    { status: 500 }
  );
}
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in environment variables.");
      return NextResponse.json({ error: "Server misconfiguration: missing API key." }, { status: 500 });
    }

    // ✅ Init inside handler
    const ai = new GoogleGenAI({ apiKey });

    const { meal_type } = await req.json();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(c) { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .single();

if (profileError || !profile) {
  console.error("Profile fetch error:", profileError);
  throw new Error("Unable to load your profile.");
}

    const cuisineMapPost: Record<string, string> = {
      "south_indian": "South Indian (e.g. idli, dosa, sambar, upma, pongal, rasam, curd rice, uttapam)",
      "north_indian": "North Indian (e.g. paratha, dal makhani, paneer sabji, roti, rajma, chole, lassi)",
      "both": "a mix of both South Indian and North Indian dishes",
    };
    const budgetMapPost: Record<string, string> = {
      "standard": "simple, affordable everyday Indian home-cooked meals using basic ingredients costing under ₹100 per meal",
      "premium": "premium quality meals with high-protein ingredients like chicken, paneer, eggs, nuts, Greek yogurt, costing ₹150-300 per meal",
    };
    const cuisinePost = cuisineMapPost[profile.cuisine_preference] || profile.cuisine_preference;
    const budgetPost = budgetMapPost[profile.budget_tier] || profile.budget_tier;

    const response = await ai.models.generateContent({
     model: "gemini-3.5-flash-lite",
      contents: `You are a certified Indian nutritionist. Suggest ONE alternative ${meal_type} dish strictly following ALL these rules:

CUISINE: Only use ${cuisinePost} dishes. Do NOT suggest Western or generic meals.
BUDGET: ${budgetPost}.
FITNESS GOAL: ${profile.fitness_goal || "maintain health"}.

Return a real, specific Indian dish name — not a generic description.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            meal_type: { type: Type.STRING },
            meal_name: { type: Type.STRING },
            calories: { type: Type.INTEGER },
            protein: { type: Type.INTEGER },
            description: { type: Type.STRING },
          },
          required: ["meal_type", "meal_name", "calories", "protein", "description"],
        },
      },
    });
    if (!response.text) {
  throw new Error("Gemini returned an empty response.");
}

let newMeal: Meal;
try {
  newMeal = JSON.parse(response.text);
} catch {
  console.error("Invalid Gemini response:", response.text);
  throw new Error("Gemini returned invalid meal data.");
}

const today = getISTDateString();

const { data: plan, error: planError } = await supabase
  .from("daily_meal_plans")
  .select("meals")
  .eq("user_id", user.id)
  .eq("plan_date", today)
  .single();

if (planError && planError.code !== "PGRST116") {
  console.error("Meal plan fetch error:", planError);
  throw new Error("Unable to load today's meal plan.");
}

if (planError && planError.code !== "PGRST116") {
  console.error("Meal plan fetch error:", planError);
  throw new Error("Unable to load today's meal plan.");
}
if (plan) {
const updatedMeals = plan.meals.map((meal: Meal) =>
    meal.meal_type === meal_type ? newMeal : meal
  );

  const targetCalories = Number(profile.calorie_target) || 0;

  if (targetCalories > 0) {
    const otherMealsCalories = updatedMeals
.filter((meal: Meal) => meal.meal_type !== meal_type)
      .reduce(
  (sum: number, meal: Meal) =>
    sum + (Number(meal.calories) || 0),
  0
);

    const replacementCalories = Math.max(
      0,
      targetCalories - otherMealsCalories
    );

    const swappedMeal = updatedMeals.find(
  (meal: Meal) => meal.meal_type === meal_type
);

    if (swappedMeal) {
      swappedMeal.calories = replacementCalories;
    }
  }

  await supabase
    .from("daily_meal_plans")
    .update({
      meals: updatedMeals,
    })
    .eq("user_id", user.id)
    .eq("plan_date", today);

  return NextResponse.json(
  updatedMeals.find(
  (meal: Meal) => meal.meal_type === meal_type
)
  );
}

return NextResponse.json(newMeal);
  } catch (error: unknown) {
  console.error("Recommend Meals POST Error:", error);

  const message =
    error instanceof Error
      ? error.message
      : "Unable to swap meal.";

  return NextResponse.json(
    { error: message },
    { status: 500 }
  );
}
}
