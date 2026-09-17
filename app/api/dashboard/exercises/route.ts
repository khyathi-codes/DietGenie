
import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getISTDateString } from "@/lib/date";

type NutritionContext = {
  todayCalories: number;
  yesterdayCalories: number;
  calorieTarget: number;
  yesterdayExcess: number;
};

type Exercise = {
  name: string;
  type: string;
  duration_seconds: number;
  repetitions: number;
  sets: number;
  rest_seconds: number;
  instructions: string;
  benefit: string;
};

type ExercisePlan = {
  title: string;
  goal: string;
  summary: string;
  duration_minutes: number;
  difficulty: string;
  exercises: Exercise[];
  adjustment_message?: string;
  nutrition_context?: NutritionContext;
};

async function getSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                cookieStore.set(
                  name,
                  value,
                  options
                );
              }
            );
          } catch {
            // Safe to ignore when cookies cannot be
            // modified from the current request context.
          }
        },
      },
    }
  );
}

async function getAuthenticatedUser() {
  const supabase = await getSupabase();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      user: null,
    };
  }

  return {
    supabase,
    user,
  };
}

function getToday() {
  return getISTDateString();
}

function getYesterday() {
  const today = getISTDateString();
  const date = new Date(`${today}T00:00:00+05:30`);

  date.setDate(date.getDate() - 1);
  return date.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

async function getNutritionContext(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  userId: string,
  calorieTarget: number
): Promise<NutritionContext> {
  const today = getToday();
  const yesterday = getYesterday();

  const { data: nutritionRows, error } =
    await supabase
      .from("daily_nutrition_summary")
      .select(
        "summary_date,total_calories"
      )
      .eq("user_id", userId)
      .in("summary_date", [
        today,
        yesterday,
      ]);

  if (error) {
    console.error(
      "Nutrition summary fetch error:",
      error
    );
  }

  let todayCalories = 0;
  let yesterdayCalories = 0;

  if (Array.isArray(nutritionRows)) {
    for (const row of nutritionRows) {
      const calories = Number(
        row?.total_calories ?? 0
      );

      if (
        row?.summary_date === today
      ) {
        todayCalories = calories;
      }

      if (
        row?.summary_date === yesterday
      ) {
        yesterdayCalories = calories;
      }
    }
  }

  const yesterdayExcess = Math.max(
    0,
    yesterdayCalories - calorieTarget
  );

  return {
    todayCalories,
    yesterdayCalories,
    calorieTarget,
    yesterdayExcess,
  };
}
async function calculateWorkoutStreak(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  userId: string
) {
  const { data: logs } =
    await supabase
      .from("exercise_daily_logs")
      .select(
        "exercise_date, plan, completed_indices"
      )
      .eq("user_id", userId)
      .order("exercise_date", {
        ascending: false,
      })
      .limit(60);

  if (
    !logs ||
    logs.length === 0
  ) {
    return 0;
  }

  let streak = 0;

  for (const log of logs) {
    const planExercises =
      Array.isArray(
        log?.plan?.exercises
      )
        ? log.plan.exercises
        : [];

    const completed =
      Array.isArray(
        log?.completed_indices
      )
        ? log.completed_indices
        : [];

    if (
      planExercises.length === 0 ||
      completed.length <
        planExercises.length
    ) {
      break;
    }

    streak++;
  }

  return streak;
}
async function generateExercisePlan(
  profile: {
    age?: number | string | null;
    gender?: string | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    activity_level?: string | null;
    fitness_goal?: string | null;
    bmi?: number | null;
    has_bp?: boolean | string | null;
    has_diabetes?: boolean | string | null;
    has_thyroid?: boolean | string | null;
  },
  nutritionContext: NutritionContext
): Promise<ExercisePlan> {
  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Check your .env.local file."
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const healthConsiderations: string[] =
    [];

  if (
    profile.has_bp === true ||
    profile.has_bp === "true"
  ) {
    healthConsiderations.push(
      "The user has a blood-pressure health flag. Avoid unnecessarily extreme intensity, maximal exertion, and unsafe breath-holding."
    );
  }

  if (
    profile.has_diabetes === true ||
    profile.has_diabetes === "true"
  ) {
    healthConsiderations.push(
      "The user has a diabetes health flag. Prefer practical moderate activities and include appropriate rest."
    );
  }

  if (
    profile.has_thyroid === true ||
    profile.has_thyroid === "true"
  ) {
    healthConsiderations.push(
      "The user has a thyroid health flag. Avoid unsupported medical claims and prefer sensible progressive exercise."
    );
  }

  if (
    healthConsiderations.length === 0
  ) {
    healthConsiderations.push(
      "No additional health flags were provided."
    );
  }

  const prompt = `
Your job is to generate today's personalized exercise routine.

IMPORTANT:
Today's workout should primarily be based on the user's profile.
Yesterday's completed calorie intake may be used as a gentle adjustment
signal for today's activity.

IMPORTANT:
The exercises MUST be generated based on the user's profile and nutrition context.
Do NOT assume a generic routine.
Do NOT return a hardcoded standard workout.
Do NOT give medical treatment or make medical claims.

========================
USER PROFILE
========================

Age:
${profile.age ?? "Not provided"}

Gender:
${profile.gender ?? "Not provided"}

Height:
${profile.height_cm ?? "Not provided"} cm

Weight:
${profile.weight_kg ?? "Not provided"} kg

Activity level:
${profile.activity_level ?? "Not provided"}

Fitness goal:
${profile.fitness_goal ?? "Maintain general fitness"}

BMI:
${profile.bmi ?? "Not provided"}

========================
NUTRITION CONTEXT
========================

Daily calorie target:
${nutritionContext.calorieTarget} kcal

Today's calories consumed:
${nutritionContext.todayCalories} kcal

Yesterday's calories consumed:
${nutritionContext.yesterdayCalories} kcal

Yesterday's calorie excess:
${nutritionContext.yesterdayExcess} kcal

========================
HEALTH FLAGS
========================

${healthConsiderations.join("\n")}

========================
TASK
========================

Generate ONE exercise routine for TODAY.

Generate exactly 5 exercises.

The routine should be appropriate for:

Fitness goal:
${profile.fitness_goal ?? "general fitness"}

Activity level:
${profile.activity_level ?? "moderate"}

========================
RULES
========================

1. Personalize the exercises to the user's fitness goal.

2. Consider the user's activity level.

3. Consider today's and yesterday's calorie intake as context, but do not let calorie intake override the user's overall fitness goal.

4. Keep the routine realistic for a normal person.

5. Do not assume gym equipment unless necessary.

6. Prefer exercises that can realistically be performed at home.

7. Beginners should receive beginner-friendly movements.

8. Higher activity levels can receive an appropriately greater challenge.

9. Do not prescribe extreme calorie-burning targets.

10. Use YESTERDAY'S calorie intake as the nutrition adjustment signal for TODAY'S workout.

11. If yesterday's calorie intake was within or below the user's calorie target, generate the normal profile-based workout.

12. If yesterday's calorie intake was approximately 300 kcal or more above the target, make a MODERATE adjustment to today's activity.

13. The adjustment may be a slightly longer workout, a few additional minutes of moderate activity, or one additional moderate exercise interval.

14. Do NOT try to make the user burn exactly the calories they consumed above their target.

15. Do NOT create extreme, exhausting, or punishment workouts.

16. Today's workout must still primarily follow the user's fitness goal, activity level, age, body details, and health considerations.

17. A single day's calorie excess must never override the user's overall fitness goal.

18. For weight gain or muscle gain goals, do NOT increase cardio simply because yesterday's calorie intake was higher.

19. If yesterday's calorie intake was significantly above target, the summary should gently explain that today's activity has been slightly adjusted to support the user's goal.

20. Never tell the user that they need to compensate for food through exercise.

21. Never recommend starvation, skipping meals, excessive exercise, or dangerous calorie-burning targets.

22. Do not claim that an exercise will cure or treat a disease.

23. Include rest periods where appropriate.

24. Every exercise must have simple beginner-friendly instructions.

25. The routine should have a realistic total duration.

26. Generate EXACTLY 5 exercises.

========================
IMPORTANT
========================

Do not generate dangerous or unnecessarily extreme exercises.

Do not use medical terminology unnecessarily.

Make instructions visually understandable.

Example:

"Stand with your feet shoulder-width apart. Bend your knees and lower your hips slowly. Keep your chest lifted. Stand back up."

NOT:

"Perform a controlled eccentric knee-dominant movement."

========================
OUTPUT
========================

Return ONLY valid JSON.

No markdown.
No code fences.
No explanation outside JSON.
`;

const response =
  await ai.models.generateContent({
    model: "gemini-3.6-flash",

    contents: prompt,

    config: {
      responseMimeType:
        "application/json",

      responseSchema: {
        type: Type.OBJECT,

        properties: {
          title: {
            type: Type.STRING,
          },

          goal: {
            type: Type.STRING,
          },

          summary: {
            type: Type.STRING,
          },

          duration_minutes: {
            type: Type.INTEGER,
          },

          difficulty: {
            type: Type.STRING,
          },

          exercises: {
            type: Type.ARRAY,

            items: {
              type: Type.OBJECT,

              properties: {
                name: {
                  type: Type.STRING,
                },

                type: {
                  type: Type.STRING,
                },

                duration_seconds: {
                  type: Type.INTEGER,
                },

                repetitions: {
                  type: Type.INTEGER,
                },

                sets: {
                  type: Type.INTEGER,
                },

                rest_seconds: {
                  type: Type.INTEGER,
                },

                instructions: {
                  type: Type.STRING,
                },

                benefit: {
                  type: Type.STRING,
                },
              },

              required: [
                "name",
                "type",
                "duration_seconds",
                "repetitions",
                "sets",
                "rest_seconds",
                "instructions",
                "benefit",
              ],
            },
          },
        },

        required: [
          "title",
          "goal",
          "summary",
          "duration_minutes",
          "difficulty",
          "exercises",
        ],
      },
    },
  });

  if (!response.text) {
    throw new Error(
      "Gemini returned an empty exercise plan."
    );
  }

  let plan: ExercisePlan;

  try {
    plan = JSON.parse(
      response.text
    );
  } catch {
    throw new Error(
      "Gemini returned invalid exercise JSON."
    );
  }

  if (
    !plan.exercises ||
    plan.exercises.length !== 5
  ) {
    throw new Error(
      "AI did not generate exactly 5 exercises. Please try again."
    );
  }

  /*
   * Keep the adjustment deterministic on the server.
   * This means the app does not depend entirely on
   * Gemini remembering the calorie-excess rule.
   */

  const goalText = String(
    profile.fitness_goal ?? ""
  ).toLowerCase();

  const shouldAdjust =
    nutritionContext.yesterdayExcess >=
      300 &&
    !goalText.includes("gain");

  if (shouldAdjust) {
    plan.adjustment_message =
      `Yesterday you consumed about ${Math.round(
        nutritionContext.yesterdayExcess
      )} kcal above your target. Today's activity has been slightly adjusted to support your goal. This is a moderate adjustment, not a requirement to burn those calories.`;
  }

  plan.nutrition_context =
    nutritionContext;

  return plan;
}

/* ================================
GET TODAY'S EXERCISE PLAN
================================ */

export async function GET() {
  try {
    const {
      supabase,
      user,
    } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Please log in again.",
        },
        { status: 401 }
      );
    }

    const today = getToday();

    /*
     * IMPORTANT:
     * If today's plan already exists,
     * return it exactly as saved.
     *
     * This prevents a new AI workout from
     * being generated every time the page
     * is refreshed.
     */

    const {
      data: existingLog,
      error: existingLogError,
    } = await supabase
      .from("exercise_daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq(
        "exercise_date",
        today
      )
      .maybeSingle();

    if (existingLogError) {
      console.error(
        "Existing exercise log error:",
        existingLogError
      );

      return NextResponse.json(
        {
          error:
            "Could not load today's exercise plan.",
        },
        { status: 500 }
      );
    }

    if (existingLog) {
      const streak =
        await calculateWorkoutStreak(
          supabase,
          user.id
        );

      return NextResponse.json({
        plan: existingLog.plan,
        completed_indices:
          existingLog.completed_indices ||
          [],
        streak,
        date: today,
      });
    }

    /*
     * Get the user's profile.
     */

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile
    ) {
      return NextResponse.json(
        {
          error:
            "Your profile could not be found. Please complete your profile first.",
        },
        { status: 404 }
      );
    }

    const calorieTarget =
      Number(
        profile.calorie_target ?? 0
      );

    /*
     * Get today's and yesterday's
     * nutrition information.
     */

    const nutritionContext =
      await getNutritionContext(
        supabase,
        user.id,
        calorieTarget
      );

    /*
     * THIS is the corrected call.
     *
     * generateExercisePlan requires:
     * 1. profile
     * 2. nutritionContext
     */

    const plan =
      await generateExercisePlan(
        profile,
        nutritionContext
      );

    /*
     * Save today's plan.
     */

    const {
      data: insertedLog,
      error: insertError,
    } = await supabase
      .from("exercise_daily_logs")
      .upsert(
        {
          user_id: user.id,
          exercise_date: today,
          plan,
          completed_indices: [],
        },
        {
          onConflict:
            "user_id,exercise_date",
        }
      )
      .select("*")
      .single();

    if (insertError) {
      console.error(
        "Exercise log insert error:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            insertError.message ||
            "The AI workout was created but could not be saved.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      plan,
      completed_indices:
        insertedLog.completed_indices ||
        [],
      streak: 0,
      date: today,
    });
  } catch (error: unknown) {
    console.error(
      "Exercise GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate today's exercise plan.",
      },
      { status: 500 }
    );
  }
}

/* ================================
POST COMPLETE / UNCOMPLETE
================================ */

export async function POST(
  req: Request
) {
  try {
    const {
      supabase,
      user,
    } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Please log in again.",
        },
        { status: 401 }
      );
    }

    const body =
      await req.json();

    const index = Number(
      body.exerciseIndex
    );

    const completed =
      body.completed !== false;

    if (
      !Number.isInteger(index) ||
      index < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid exercise index.",
        },
        { status: 400 }
      );
    }

    const today = getToday();

    /*
     * Get today's existing exercise log.
     */

    const {
      data: log,
      error: logError,
    } = await supabase
      .from("exercise_daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq(
        "exercise_date",
        today
      )
      .maybeSingle();

    if (logError) {
      console.error(
        "Exercise log fetch error:",
        logError
      );

      return NextResponse.json(
        {
          error:
            "Could not load today's exercise plan.",
        },
        { status: 500 }
      );
    }

    if (!log) {
      return NextResponse.json(
        {
          error:
            "Today's exercise plan was not found. Please refresh the page.",
        },
        { status: 404 }
      );
    }

    const planExercises =
      Array.isArray(
        log?.plan?.exercises
      )
        ? log.plan.exercises
        : [];

    if (
      index >=
      planExercises.length
    ) {
      return NextResponse.json(
        {
          error:
            "Exercise index is out of range.",
        },
        { status: 400 }
      );
    }

    let completedIndices =
      Array.isArray(
        log.completed_indices
      )
        ? log.completed_indices.map(
            Number
          )
        : [];

    if (completed) {
      if (
        !completedIndices.includes(
          index
        )
      ) {
        completedIndices.push(
          index
        );
      }
    } else {
      completedIndices =
        completedIndices.filter(
          (item: number) =>
            item !== index
        );
    }

    completedIndices.sort(
      (
        a: number,
        b: number
      ) => a - b
    );

    const {
      data: updatedLog,
      error: updateError,
    } = await supabase
      .from("exercise_daily_logs")
      .update({
        completed_indices:
          completedIndices,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", log.id)
      .select("*")
      .single();

    if (updateError) {
      console.error(
        "Exercise completion update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Could not update exercise progress.",
        },
        { status: 500 }
      );
    }

    const workoutComplete =
      completedIndices.length ===
      planExercises.length;

    const streak =
      await calculateWorkoutStreak(
        supabase,
        user.id
      );

    return NextResponse.json({
      completed_indices:
        updatedLog.completed_indices,
      workout_complete:
        workoutComplete,
      streak,
    });
  } catch (error: unknown) {
    console.error(
      "Exercise POST error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update exercise progress.",
      },
      { status: 500 }
    );
  }
}