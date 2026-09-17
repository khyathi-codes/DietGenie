import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getISTDateString } from "@/lib/date";

const ALLOWED_ANIMATIONS = [
  "pour",
  "add",
  "sprinkle",
  "chop",
  "mix",
  "heat",
  "boil",
  "cook",
  "fry",
  "serve",
];
type MealPlanMeal = {
  meal_type?: string | null;
  calories?: number | string | null;
};

type EatenMeal = {
  meal_type?: string | null;
};

type GeneratedStep = {
  step?: number | string;
  instruction?: string;
  animation_type?: string;
};

type GeneratedDish = {
  [key: string]: unknown;
  steps?: GeneratedStep[];
};

type GeminiResult = {
  dishes?: GeneratedDish[];
};
/*
 * Wait before retrying Gemini.
 */
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/*
 * Gemini can temporarily return 503 when the model
 * is experiencing high demand.
 *
 * Retry a few times before giving up.
 */
async function generateWithRetry(
  ai: GoogleGenAI,
  prompt: string
) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent({
        model: "gemini-2.5-flash",

        contents: prompt,

        config: {
          responseMimeType: "application/json",

          responseSchema: {
            type: Type.OBJECT,

            properties: {
              dishes: {
                type: Type.ARRAY,

                items: {
                  type: Type.OBJECT,

                  properties: {
                    name: {
                      type: Type.STRING,
                    },

                    calories: {
                      type: Type.INTEGER,
                    },

                    protein: {
                      type: Type.INTEGER,
                    },

                    carbs: {
                      type: Type.INTEGER,
                    },

                    fats: {
                      type: Type.INTEGER,
                    },

                    cooking_time: {
                      type: Type.INTEGER,
                    },

                    difficulty: {
                      type: Type.STRING,
                    },

                    goal_reason: {
                      type: Type.STRING,
                    },

                    ingredients: {
                      type: Type.ARRAY,

                      items: {
                        type: Type.STRING,
                      },
                    },

                    steps: {
                      type: Type.ARRAY,

                      items: {
                        type: Type.OBJECT,

                        properties: {
                          step: {
                            type: Type.INTEGER,
                          },

                          instruction: {
                            type: Type.STRING,
                          },

                          animation_type: {
                            type: Type.STRING,
                            enum: ALLOWED_ANIMATIONS,
                          },
                        },

                        required: [
                          "step",
                          "instruction",
                          "animation_type",
                        ],
                      },
                    },
                  },

                  required: [
                    "name",
                    "calories",
                    "protein",
                    "carbs",
                    "fats",
                    "cooking_time",
                    "difficulty",
                    "goal_reason",
                    "ingredients",
                    "steps",
                  ],
                },
              },
            },

            required: ["dishes"],
          },
        },
      });
    } catch (error: unknown) {
      const message =
  error instanceof Error
    ? error.message.toLowerCase()
    : String(error).toLowerCase();
      const isTemporaryGeminiError =
        message.includes("503") ||
        message.includes("unavailable") ||
        message.includes("high demand") ||
        message.includes("overloaded") ||
        message.includes("temporarily");

      console.error(
        `Gemini attempt ${attempt}/${maxAttempts} failed:`,
        error
      );

      /*
       * If this isn't a temporary availability problem,
       * don't waste time retrying.
       */
      if (!isTemporaryGeminiError) {
        throw error;
      }

      /*
       * If this was the final attempt, throw the error.
       */
      if (attempt === maxAttempts) {
        throw new Error(
          "Gemini is temporarily busy. Please try generating your dishes again in a few moments."
        );
      }

      /*
       * Increasing delay:
       *
       * Attempt 1 → wait 1.5 sec
       * Attempt 2 → wait 3 sec
       */
      await wait(attempt * 1500);
    }
  }

  throw new Error(
    "Unable to generate dishes right now."
  );
}
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
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Please log in again.",
        },
        { status: 401 }
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "fitness_goal, calorie_target, protein_target"
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error:
            "Your profile could not be found.",
        },
        { status: 404 }
      );
    }

  
const today = getISTDateString();
    /*
     * TODAY'S NUTRITION
     */
    const { data: nutrition } =
      await supabase
        .from(
          "daily_nutrition_summary"
        )
        .select(
          "total_calories, total_protein"
        )
        .eq("user_id", user.id)
        .eq("summary_date", today)
        .maybeSingle();

    const consumedCalories =
      Number(
        nutrition?.total_calories
      ) || 0;

    const consumedProtein =
      Number(
        nutrition?.total_protein
      ) || 0;

    const dailyCalorieTarget =
      Number(
        profile.calorie_target
      ) || 0;

    const dailyProteinTarget =
      Number(
        profile.protein_target
      ) || 0;

    /*
     * TODAY'S MEAL PLAN
     */
    const { data: mealPlan } =
      await supabase
        .from("daily_meal_plans")
        .select("meals")
        .eq("user_id", user.id)
        .eq("plan_date", today)
        .maybeSingle();

    /*
     * MEALS ALREADY EATEN
     */
    const { data: eatenMeals } =
      await supabase
        .from("meal_tracking")
        .select("meal_type")
        .eq("user_id", user.id)
        .eq(
          "tracking_date",
          today
        )
        .eq(
          "action_type",
          "ate_meal"
        );

    const eatenMealTypes =
      new Set(
        (eatenMeals || []).map(
          (meal: EatenMeal) =>
            String(
              meal.meal_type
            ).toLowerCase()
        )
      );

    /*
     * CALCULATE CALORIES RESERVED
     * FOR MEALS THE USER HAS NOT
     * EATEN YET.
     */
    const remainingPlannedMealCalories =
      Array.isArray(
        mealPlan?.meals
      )
        ? mealPlan.meals
            .filter(
              (meal: MealPlanMeal) =>
  !eatenMealTypes.has(
                  String(
                    meal.meal_type
                  ).toLowerCase()
                )
            )
            .reduce(
              (
                total: number,
meal: MealPlanMeal
              ) =>
                total +
                (Number(
                  meal.calories
                ) || 0),
              0
            )
        : 0;

    /*
     * FLEXIBLE CALORIE BUDGET
     */
    const flexibleCalories =
      Math.max(
        0,
        dailyCalorieTarget -
          consumedCalories -
          remainingPlannedMealCalories
      );

    const nutritionContext = {
      calorie_target:
        dailyCalorieTarget,

      calories_consumed:
        consumedCalories,

      protein_target:
        dailyProteinTarget,

      protein_consumed:
        consumedProtein,

      reserved_for_remaining_meals:
        remainingPlannedMealCalories,

      flexible_calories:
        flexibleCalories,

      remaining_planned_meals:
        Array.isArray(
          mealPlan?.meals
        )
          ? mealPlan.meals
              .filter(
                (meal: MealPlanMeal) =>
  !eatenMealTypes.has(
                    String(
                      meal.meal_type
                    ).toLowerCase()
                  )
              )
              .map(
                (meal: MealPlanMeal) =>
  String(
    meal.meal_type
  )
              )
          : [],
    };

    return NextResponse.json({
      fitness_goal:
        profile.fitness_goal ||
        "Maintain Weight",

      nutritionContext,
    });
  } catch (error: unknown) {
    console.error(
      "Build My Plate GET Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load your Build My Plate information.",
      },
      { status: 500 }
    );
  }
}
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const ingredients =
      typeof body.ingredients === "string"
        ? body.ingredients.trim()
        : "";

    
    if (!ingredients) {
      return NextResponse.json(
        {
          error:
            "Please enter at least one ingredient.",
        },
        { status: 400 }
      );
    }
    const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY is not configured.");

  return NextResponse.json(
    { error: "GEMINI_API_KEY is not configured." },
    { status: 500 }
  );
}

    /*
     * SUPABASE
     */

    const cookieStore =
      await cookies();

    const supabase =
      createServerClient(
        process.env
          .NEXT_PUBLIC_SUPABASE_URL!,
        process.env
          .NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },

            setAll(cookiesToSet) {
              cookiesToSet.forEach(
                ({
                  name,
                  value,
                  options,
                }) => {
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

    /*
     * AUTHENTICATION
     */

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Please log in again.",
        },
        { status: 401 }
      );
    }

    /*
     * USER PROFILE
     */

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (
      profileError ||
      !profile
    ) {
      console.error(
        "Profile error:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Your profile could not be found. Please complete your profile first.",
        },
        { status: 404 }
      );
    }

    /*
     * TODAY'S NUTRITION
     */

    const today = getISTDateString();

    const { data: nutrition } =
      await supabase
        .from(
          "daily_nutrition_summary"
        )
        .select(
          "total_calories, total_protein"
        )
        .eq("user_id", user.id)
        .eq(
          "summary_date",
          today
        )
        .maybeSingle();

    const consumedCalories =
      Number(
        nutrition?.total_calories
      ) || 0;

    const consumedProtein =
      Number(
        nutrition?.total_protein
      ) || 0;

    const dailyCalorieTarget =
      Number(
        profile.calorie_target
      ) || 0;

    const dailyProteinTarget =
      Number(
        profile.protein_target
      ) || 0;

    /*
     * TODAY'S MEAL PLAN
     */

    const { data: mealPlan } =
      await supabase
        .from("daily_meal_plans")
        .select("meals")
        .eq("user_id", user.id)
        .eq("plan_date", today)
        .maybeSingle();

    /*
     * MEALS ALREADY EATEN
     */

    const { data: eatenMeals } =
      await supabase
        .from("meal_tracking")
        .select("meal_type")
        .eq("user_id", user.id)
        .eq(
          "tracking_date",
          today
        )
        .eq(
          "action_type",
          "ate_meal"
        );

    const eatenMealTypes =
      new Set(
        (eatenMeals || []).map(
          (meal: EatenMeal) =>
            String(
              meal.meal_type
            ).toLowerCase()
        )
      );

    /*
     * REMAINING PLANNED MEAL CALORIES
     */

    const remainingPlannedMealCalories =
      Array.isArray(
        mealPlan?.meals
      )
        ? mealPlan.meals
            .filter(
              (meal: MealPlanMeal) =>
  !eatenMealTypes.has(
                  String(
                    meal.meal_type
                  ).toLowerCase()
                )
            )
            .reduce(
              (
                total: number,
meal: MealPlanMeal
              ) =>
                total +
                (Number(
                  meal.calories
                ) || 0),
              0
            )
        : 0;

    /*
     * FLEXIBLE CALORIES
     *
     * These are calories that can reasonably
     * be used for Build My Plate without
     * taking calories away from planned meals.
     */

    const flexibleCalories =
      Math.max(
        0,
        dailyCalorieTarget -
          consumedCalories -
          remainingPlannedMealCalories
      );

    /*
     * REMAINING PROTEIN
     */

    const remainingProtein =
      Math.max(
        0,
        dailyProteinTarget -
          consumedProtein
      );

    /*
     * CUISINE
     */

    const cuisineMap: Record<
      string,
      string
    > = {
      south_indian:
        "South Indian cuisine such as dosa, idli, upma, pongal, sambar, rasam, rice dishes and South Indian curries.",

      north_indian:
        "North Indian cuisine such as roti, dal, rajma, chole, paneer dishes and North Indian curries.",

      both:
        "Indian cuisine including both South Indian and North Indian dishes.",
    };

    const cuisine =
      cuisineMap[
        profile.cuisine_preference
      ] ||
      profile.cuisine_preference ||
      "Indian home-style cuisine";

    /*
     * DIET
     */

    const dietType =
      profile.diet_type ||
      "No specific diet restriction";

    /*
     * FITNESS GOAL
     */

    const fitnessGoal =
  profile.fitness_goal ||
  "Maintain Weight";
    /*
     * TARGETS
     */

    const calorieTarget =
      profile.calorie_target ??
      "not specified";

    const proteinTarget =
      profile.protein_target ??
      "not specified";

    /*
     * HEALTH CONSIDERATIONS
     */

    const restrictions: string[] =
      [];

    if (
      profile.has_diabetes ===
        true ||
      profile.has_diabetes ===
        "true"
    ) {
      restrictions.push(
        "Avoid added sugar, sweets, sugary drinks and highly refined carbohydrates. Prefer balanced, lower-GI choices."
      );
    }

    if (
      profile.has_bp === true ||
      profile.has_bp === "true"
    ) {
      restrictions.push(
        "Avoid excessive salt and highly processed foods."
      );
    }

    if (
      profile.has_thyroid ===
        true ||
      profile.has_thyroid ===
        "true"
    ) {
      restrictions.push(
        "Keep meals nutritionally balanced and do not make unsupported medical claims."
      );
    }

    const restrictionText =
      restrictions.length > 0
        ? restrictions.join("\n")
        : "No additional health restrictions provided.";

    /*
     * GEMINI
     */

    const ai = new GoogleGenAI({
      apiKey,
    });

    const prompt = `
You are Diet Genie, an AI Indian nutrition and recipe assistant.

The user wants to BUILD A MEAL using ingredients they already have.

========================
INGREDIENTS
========================

${ingredients}

========================
USER PROFILE
========================

Diet type:
${dietType}

Cuisine preference:
${cuisine}

Fitness goal:
${fitnessGoal}

Daily calorie target:
${calorieTarget} kcal

Daily protein target:
${proteinTarget} g

========================
TODAY'S ACTUAL NUTRITION
========================

Calories already consumed today:
${consumedCalories} kcal

Protein already consumed today:
${consumedProtein} g

Calories from remaining planned meals:
${remainingPlannedMealCalories} kcal

Flexible calories available for this Build My Plate dish:
${flexibleCalories} kcal

Remaining protein target:
${remainingProtein} g

Health considerations:
${restrictionText}

========================
MAIN TASK
========================

Generate exactly 4 realistic dishes that the user can make primarily from the ingredients they entered.

IMPORTANT RULES:

1. Use the user's available ingredients as the MAIN ingredients.

2. Do NOT pretend that the user has ingredients that they did not enter.

3. You may add a SMALL number of normal pantry ingredients when necessary, such as:
   - salt
   - pepper
   - basic spices
   - cooking oil
   - water
   - onion
   - garlic

4. Respect the user's diet type.

5. Respect the user's cuisine preference.

6. Respect the user's selected fitness goal.

7. Consider the user's calorie and protein targets.

8. Consider the user's health flags.

9. Give realistic approximate nutrition values.

10. IMPORTANT CALORIE BUDGET RULE:
Consider the user's actual calories already consumed today.

11. If the user still has planned meals remaining today,
do NOT use the entire remaining daily calorie target for this dish.

12. The user's flexible calorie budget is approximately
${flexibleCalories} kcal.

13. Use the user's PROFILE as the primary guide for what
kind of food is appropriate. Always respect:
- fitness goal
- diet type
- cuisine preference
- calorie target
- protein target
- health considerations

14. Use TODAY'S nutrition information to decide how
substantial the dish should be.

15. If flexible calories are greater than 0, try to keep
the dish reasonably close to that available calorie budget.

16. If flexible calories are 0 because the user has already
reached or exceeded their calorie target, DO NOT stop
generating recipes.

17. When flexible calories are 0, generate smaller,
lighter and nutrient-dense options that still fit the
user's profile, diet and fitness goal.

18. Reaching the calorie target does NOT mean the user
cannot generate or eat another recipe.

19. If the user has exceeded their calorie target, do not
recommend starvation, skipping all food, purging, excessive
exercise, or extreme calorie restriction.

20. If the user has exceeded their calorie target, provide
reasonable lighter options while still respecting their
profile and nutritional needs.

21. Consider protein needs as well as calories.

22. Never treat a generated dish as eaten automatically.

23. The dish's calories and protein must only be added to
today's nutrition after the user explicitly clicks
"I Ate This".

24. Give exactly 5 to 7 cooking steps for EVERY dish.

26. Never treat a generated dish as eaten automatically.

27. The user must explicitly choose "I Ate This" before
the dish's calories and protein are added to today's nutrition.

28. Give exactly 5 to 7 cooking steps for EVERY dish.

29. Every cooking step must be short and easy to understand.

30. The cooking instructions should be useful for a beginner.

31. Avoid complicated professional cooking terminology.

========================
CARTOON ANIMATION
========================

Every cooking step MUST have an animation_type.

The frontend will turn this animation_type into a simple cartoon cooking animation.

This is NOT a professional video.

Use ONLY these animation types:

"pour"
"add"
"sprinkle"
"chop"
"mix"
"heat"
"boil"
"cook"
"fry"
"serve"

Choose the animation that most literally represents the action.

Examples:

Pouring oil, water or milk:
"pour"

Putting vegetables/rice/ingredients into pan:
"add"

Adding salt, pepper or powdered spices:
"sprinkle"

Cutting vegetables:
"chop"

Stirring or mixing:
"mix"

Heating the pan:
"heat"

Boiling:
"boil"

Simmering/cooking:
"cook"

Frying:
"fry"

Putting finished food on a plate:
"serve"

IMPORTANT:
Do not use any animation_type other than the 10 listed above.

========================
STEP STYLE
========================

Make steps visually understandable.

Good:

"Pour 1 tablespoon oil into the pan."

"Add chopped onion."

"Sprinkle salt."

"Mix everything well."

"Cook for 5 minutes."

"Serve hot."

Avoid long paragraphs inside steps.

========================
OUTPUT
========================

Return ONLY valid JSON matching the requested schema.

Do not return markdown.

Do not return code fences.

Do not add explanations outside JSON.
`;

    /*
     * GENERATE WITH RETRY
     */

    const response =
      await generateWithRetry(
        ai,
        prompt
      );

    /*
     * PARSE GEMINI RESPONSE
     */

    let result: GeminiResult;

    try {
      result = JSON.parse(
  response.text ||
    '{"dishes":[]}'
) as GeminiResult;
    } catch (parseError) {
      console.error(
        "Gemini JSON parse error:",
        parseError
      );

      return NextResponse.json(
        {
          error:
            "The AI returned an invalid recipe response. Please try again.",
        },
        { status: 500 }
      );
    }

    /*
     * VALIDATE RESPONSE
     */

    if (
      !result ||
      !Array.isArray(
        result.dishes
      )
    ) {
      return NextResponse.json(
        {
          error:
            "No dishes were generated. Please try again.",
        },
        { status: 500 }
      );
    }

    /*
     * CLEAN ANIMATION TYPES
     */

    result.dishes =
      result.dishes.map(
        (dish: GeneratedDish) => {
          const steps =
            Array.isArray(
              dish.steps
            )
              ? dish.steps
              : [];

          return {
            ...dish,

            steps: steps.map(
              (
                step: GeneratedStep,
index: number
              ) => {
                const animationType =
  ALLOWED_ANIMATIONS.includes(
    step.animation_type ?? ""
  )
    ? step.animation_type
    : "cook";
                return {
                  step:
                    Number(
                      step.step
                    ) ||
                    index + 1,

                  instruction:
                    String(
                      step.instruction ||
                        "Continue cooking."
                    ),

                  animation_type:
                    animationType,
                };
              }
            ),
          };
        }
      );

    return NextResponse.json({
  ...result,

  nutritionContext: {
    calorie_target: dailyCalorieTarget,
    calories_consumed: consumedCalories,
    protein_target: dailyProteinTarget,
    protein_consumed: consumedProtein,
    reserved_for_remaining_meals:
      remainingPlannedMealCalories,
    flexible_calories:
      flexibleCalories,

    remaining_planned_meals:
      Array.isArray(mealPlan?.meals)
        ? mealPlan.meals
            .filter(
              (meal: MealPlanMeal) =>
  !eatenMealTypes.has(
    String(meal.meal_type).toLowerCase()
  )
            )
            .map(
              (meal: MealPlanMeal) =>
  String(meal.meal_type)
            )
        : [],
  },
});

  } catch (error: unknown) {
    console.error(
      "Build My Plate Error:",
      error
    );

    const message =
  error instanceof Error
    ? error.message
    : String(error);

    /*
     * Return a clean user-friendly message
     * for temporary Gemini overload.
     */

    if (
      message
        .toLowerCase()
        .includes(
          "temporarily busy"
        )
    ) {
      return NextResponse.json(
        {
          error:
            "Gemini is temporarily busy. Please wait a few seconds and try again.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error:
          message ||
          "Unable to generate dishes right now. Please try again.",
      },
      { status: 500 }
    );
  }
}