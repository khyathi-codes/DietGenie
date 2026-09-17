"use client";

import { useState, useEffect} from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Profile = {
  full_name: string;
  weight_kg: number;
  calorie_target: number;
  protein_target: number;
  carbs_target: number;
  fats_target: number;
  bmi: number;
  fitness_goal: string;
};

type DailyLog = {
  id?: number;
  user_id?: string;
  log_date: string;
  water_liters: number;
  streak_count: number;
  calories_consumed?: number;
};

type Meal = {
  meal_type?: string;
  calories?: number;
};

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

import { getISTDateString } from "@/lib/date";

function todayISO() {
  return getISTDateString();
}

function getGreeting() {
  const h = new Date().getHours();

  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";

  return "Good Evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
 const [, setLog] = useState<DailyLog | null>(null);

  const [loading, setLoading] = useState(true);

  const [streak, setStreak] = useState(0);

  const [nutrition, setNutrition] = useState({
    total_calories: 0,
    total_protein: 0,
  });

  /*
   * CALORIE INFORMATION
   */
  const [remainingMealCalories, setRemainingMealCalories] =
    useState(0);

  const [buildMyPlateCalories, setBuildMyPlateCalories] =
    useState(0);


  /*
   * LOAD STREAK
   */
  const loadStreak = async () => {
    try {
      const res = await fetch(
        "/api/dashboard/streak",
        { cache: "no-store" }
      );

      const data = await res.json();

      setStreak(
        Number(data.streak_count) || 0
      );
    } catch (error) {
      console.error(
        "Streak fetch error:",
        error
      );
    }
  };

  /*
   * LOAD DASHBOARD DATA
   */
  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/auth/login");
          return;
        }


        await loadStreak();

        const today = todayISO();

        /*
         * PROFILE
         */
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(`
            full_name,
            weight_kg,
            calorie_target,
            protein_target,
            carbs_target,
            fats_target,
            bmi,
            fitness_goal
          `)
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error(
            "Profile fetch error:",
            profileError.message
          );
        }

        if (profileData) {
          setProfile(profileData);
        }

        /*
         * DAILY LOG
         */
        const { data: logData } =
          await supabase
            .from("daily_logs")
            .select(
              "id, log_date, water_liters, streak_count, calories_consumed"
            )
            .eq("user_id", user.id)
            .eq("log_date", today)
            .maybeSingle();

        setLog(
          logData ?? {
            log_date: today,
            water_liters: 0,
            streak_count: 0,
          }
        );

        /*
         * TODAY'S ACTUAL NUTRITION
         *
         * This is the source of truth for
         * calories/protein already consumed.
         */
        const {
          data: nutritionData,
          error: nutritionError,
        } = await supabase
          .from("daily_nutrition_summary")
          .select(
            "total_calories, total_protein"
          )
          .eq("user_id", user.id)
          .eq("summary_date", today)
          .maybeSingle();

        if (nutritionError) {
          console.error(
            "Nutrition fetch error:",
            nutritionError.message
          );
        }

        const consumedCalories =
          Number(
            nutritionData?.total_calories
          ) || 0;

        const consumedProtein =
          Number(
            nutritionData?.total_protein
          ) || 0;

        setNutrition({
          total_calories:
            consumedCalories,

          total_protein:
            consumedProtein,
        });

        /*
         * TODAY'S MEAL PLAN
         */
        const {
          data: mealPlan,
          error: mealPlanError,
        } = await supabase
          .from("daily_meal_plans")
          .select("meals")
          .eq("user_id", user.id)
          .eq("plan_date", today)
          .maybeSingle();

        if (mealPlanError) {
          console.error(
            "Meal plan fetch error:",
            mealPlanError.message
          );
        }

        /*
         * MEALS ALREADY EATEN
         */
        const {
          data: eatenMeals,
          error: eatenMealsError,
        } = await supabase
          .from("meal_tracking")
          .select("meal_type")
          .eq("user_id", user.id)
          .eq("tracking_date", today)
          .eq("action_type", "ate_meal");

        if (eatenMealsError) {
          console.error(
            "Meal tracking fetch error:",
            eatenMealsError.message
          );
        }

        const eatenMealTypes =
          new Set(
            (eatenMeals || []).map(
  (meal: { meal_type: string }) =>
    String(
      meal.meal_type
    ).toLowerCase()
)
          );

        /*
         * CALCULATE CALORIES RESERVED
         * FOR MEALS NOT YET EATEN.
         */
        const meals = Array.isArray(
          mealPlan?.meals
        )
          ? (mealPlan.meals as Meal[])
          : [];

        const remainingMeals =
          meals.filter(
            (meal) =>
              !eatenMealTypes.has(
                String(
                  meal.meal_type || ""
                ).toLowerCase()
              )
          );

        const reservedCalories =
          remainingMeals.reduce(
            (
              total,
              meal
            ) =>
              total +
              (Number(
                meal.calories
              ) || 0),
            0
          );

        setRemainingMealCalories(
          reservedCalories
        );

        /*
         * BUILD MY PLATE CALORIE BUDGET
         *
         * Target
         * - already consumed
         * - remaining planned meals
         *
         * Never allow a negative value.
         */
        const calorieTarget =
          Number(
            profileData?.calorie_target
          ) || 0;

        const flexibleCalories =
          Math.max(
            0,
            calorieTarget -
              consumedCalories -
              reservedCalories
          );

        setBuildMyPlateCalories(
          flexibleCalories
        );
      } catch (error) {
        console.error(
          "Dashboard initialization error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);
   
  
  const firstName =
    profile?.full_name
      ?.split(" ")[0] ?? "";

  /*
   * CALORIE STATUS
   */
  const calorieTarget =
    Number(
      profile?.calorie_target
    ) || 0;

  const consumedCalories =
    Number(
      nutrition.total_calories
    ) || 0;

  const consumedProtein =
    Number(
      nutrition.total_protein
    ) || 0;

  const caloriesRemaining =
    Math.max(
      0,
      calorieTarget -
        consumedCalories
    );

  const caloriesOver =
    Math.max(
      0,
      consumedCalories -
        calorieTarget
    );

  const targetReached =
    calorieTarget > 0 &&
    consumedCalories >=
      calorieTarget;

  /*
   * TOOLS
   */
  const tools = [
    {
      title: "Meal Planner",
      desc: "AI-curated meals crafted for your body & goals",
      emoji: "🍽️",
      route: "/dashboard/recommend-meals",
      color: "#fb923c",
      border:
        "rgba(251,146,60,0.4)",
      bg:
        "rgba(251,146,60,0.08)",
      glow:
        "rgba(251,146,60,0.3)",
    },

    {
      title: "Build My Plate",
      desc: "Turn your ingredients into healthy meals",
      emoji: "🥗",
      route: "/dashboard/build-my-plate",
      color: "#4ade80",
      border:
        "rgba(74,222,128,0.4)",
      bg:
        "rgba(74,222,128,0.08)",
      glow:
        "rgba(74,222,128,0.25)",
    },

    {
      title: "Exercises",
      desc: "Daily workouts tailored to your goal",
      emoji: "🏃",
      route: "/dashboard/exercises",
      color: "#a78bfa",
      border:
        "rgba(167,139,250,0.4)",
      bg:
        "rgba(167,139,250,0.08)",
      glow:
        "rgba(167,139,250,0.3)",
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020817",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 52,
              marginBottom: 16,
              animation:
                "bounce 1s infinite",
              filter:
                "drop-shadow(0 0 20px rgba(255,215,0,0.7))",
            }}
          >
            🧞
          </div>

          <p
            style={{
              fontFamily:
                "'Cinzel', serif",
              fontSize: 11,
              letterSpacing: "4px",
              color:
                "rgba(255,215,0,0.7)",
              textTransform:
                "uppercase",
            }}
          >
            Summoning your genie…
          </p>

          <style>{`
            @keyframes bounce {
              0%,100% {
                transform:translateY(0)
              }
              50% {
                transform:translateY(-12px)
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@1,400;1,500&family=Raleway:wght@300;400;500;600;700&display=swap');

        * {
          box-sizing: border-box;
        }

        .db-wrap {
          min-height: 100vh;
          background: #020817;
          font-family: 'Raleway', sans-serif;
          color: #e2e8f0;
          position: relative;
          overflow-x: hidden;
        }

        .db-wrap::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;

          background-image:
            radial-gradient(
              1px 1px at 12% 18%,
              rgba(255,255,255,0.5) 0%,
              transparent 100%
            ),
            radial-gradient(
              1px 1px at 35% 8%,
              rgba(255,255,255,0.35) 0%,
              transparent 100%
            ),
            radial-gradient(
              1.5px 1.5px at 62% 22%,
              rgba(255,215,0,0.5) 0%,
              transparent 100%
            ),
            radial-gradient(
              1px 1px at 80% 12%,
              rgba(255,255,255,0.4) 0%,
              transparent 100%
            ),
            radial-gradient(
              1px 1px at 90% 45%,
              rgba(255,255,255,0.3) 0%,
              transparent 100%
            ),
            radial-gradient(
              1.5px 1.5px at 5% 70%,
              rgba(255,215,0,0.35) 0%,
              transparent 100%
            ),
            radial-gradient(
              1px 1px at 50% 88%,
              rgba(255,255,255,0.3) 0%,
              transparent 100%
            ),
            radial-gradient(
              1px 1px at 75% 78%,
              rgba(255,255,255,0.25) 0%,
              transparent 100%
            ),
            radial-gradient(
              1px 1px at 20% 92%,
              rgba(255,255,255,0.2) 0%,
              transparent 100%
            ),
            radial-gradient(
              1.5px 1.5px at 95% 88%,
              rgba(255,215,0,0.3) 0%,
              transparent 100%
            );
        }

        .db-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;

          background:
            radial-gradient(
              ellipse 70% 55% at 15% 8%,
              rgba(91,33,182,0.22) 0%,
              transparent 60%
            ),
            radial-gradient(
              ellipse 55% 45% at 85% 85%,
              rgba(6,78,59,0.18) 0%,
              transparent 55%
            ),
            radial-gradient(
              ellipse 45% 55% at 88% 8%,
              rgba(161,128,0,0.1) 0%,
              transparent 55%
            ),
            radial-gradient(
              ellipse 60% 40% at 50% 50%,
              rgba(30,10,80,0.12) 0%,
              transparent 70%
            );
        }

        .db-inner {
          position: relative;
          z-index: 1;
          max-width: 1100px;
          margin: 0 auto;
          padding: 52px 32px 140px;
        }

        .db-eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 5px;
          text-transform: uppercase;
          color: #b8860b;
          opacity: 0.8;
          margin-bottom: 10px;
        }

        .db-name {
          font-family: 'Cinzel', serif;
          font-size: clamp(34px, 5vw, 54px);
          font-weight: 700;
          background: linear-gradient(
            135deg,
            #ffd700 0%,
            #fffde7 40%,
            #ffa500 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 12px;
          line-height: 1.15;
        }

        .db-tagline {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(16px, 2.2vw, 22px);
          font-style: italic;
          color: rgba(167,139,250,0.75);
          margin: 0;
          letter-spacing: 0.3px;
        }

        .stat-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 0;
        }

        .stat-card {
          border-radius: 20px;
          padding: 26px 24px 22px;
          border:
            1px solid rgba(255,255,255,0.07);
          background:
            rgba(255,255,255,0.025);
          backdrop-filter: blur(12px);
          position: relative;
          overflow: hidden;
        }

        .stat-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255,255,255,0.12),
              transparent
            );
        }

        .stat-emoji {
          font-size: 26px;
          display: block;
          margin-bottom: 12px;
          filter:
            drop-shadow(0 0 8px currentColor);
        }

        .stat-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 4px;
          text-transform: uppercase;
          color:
            rgba(148,163,184,0.6);
          margin: 0 0 8px;
        }

        .stat-value {
          font-family: 'Cinzel', serif;
          font-size: clamp(28px, 4vw, 38px);
          font-weight: 700;
          margin: 0 0 4px;
          line-height: 1;
        }

        .stat-sub {
          font-size: 11px;
          color:
            rgba(148,163,184,0.5);
          margin: 0;
        }

        .calorie-status {
          margin-top: 12px;
          padding: 8px 10px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .calorie-normal {
          color: #86efac;
          background:
            rgba(74,222,128,0.08);
          border:
            1px solid rgba(74,222,128,0.18);
        }

        .calorie-reached {
          color: #fbbf24;
          background:
            rgba(251,191,36,0.08);
          border:
            1px solid rgba(251,191,36,0.2);
        }

        .calorie-over {
          color: #fca5a5;
          background:
            rgba(239,68,68,0.08);
          border:
            1px solid rgba(239,68,68,0.2);
        }

        .plate-budget {
          margin-top: 10px;
          padding-top: 10px;
          border-top:
            1px solid rgba(255,255,255,0.06);
        }

        .plate-budget-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color:
            rgba(148,163,184,0.55);
          margin-bottom: 4px;
        }

        .plate-budget-value {
          font-size: 13px;
          font-weight: 700;
          color: #4ade80;
        }

        .plate-budget-zero {
          color: #fbbf24;
        }

        .gold-line {
          height: 1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255,215,0,0.3),
              transparent
            );
          margin: 44px 0 36px;
        }

        .tools-heading {
          font-family: 'Cinzel', serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 5px;
          text-transform: uppercase;
          color:
            rgba(255,215,0,0.65);
          margin: 0 0 24px;
        }

        .tools-grid {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 14px;
        }

        .tool-card {
          border-radius: 22px;
          padding: 28px 20px 22px;
          position: relative;
          overflow: hidden;
          border:
            1px solid rgba(255,255,255,0.07);
          background:
            rgba(255,255,255,0.025);
          backdrop-filter: blur(10px);
          cursor: pointer;
          text-align: left;
          transition:
            transform 0.25s ease,
            border-color 0.25s ease,
            background 0.25s ease,
            box-shadow 0.25s ease;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .tool-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255,255,255,0.15),
              transparent
            );
        }

        .tool-emoji-wrap {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 16px;
          transition:
            box-shadow 0.25s ease;
        }

        .tool-title {
          font-family: 'Raleway', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 6px;
          letter-spacing: 0.2px;
        }

        .tool-desc {
          font-size: 12px;
          color:
            rgba(226,232,240,0.9);
          line-height: 1.55;
          flex: 1;
          text-shadow:
            0 0 12px
            rgba(167,139,250,0.25);
        }

        .tool-arrow {
          position: absolute;
          bottom: 18px;
          right: 18px;
          font-size: 15px;
          opacity: 0.3;
          transition:
            opacity 0.2s ease,
            transform 0.2s ease;
        }

        .tool-card:hover .tool-arrow {
          opacity: 0.85;
          transform: translateX(4px);
        }

        .profile-float {
          position: fixed;
          bottom: 32px;
          left: 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          z-index: 100;
          background: none;
          border: none;
        }

        .profile-orb {
          width: 74px;
          height: 74px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          background:
            radial-gradient(
              circle at 35% 35%,
              rgba(255,215,0,0.18),
              rgba(255,140,0,0.22) 60%,
              rgba(139,92,246,0.12)
            );
          border:
            1.5px solid
            rgba(255,215,0,0.45);
          transition:
            transform 0.22s ease;
          animation:
            profilePulse 3.5s ease-in-out infinite;
        }

        .profile-float:hover
        .profile-orb {
          transform: scale(1.1);
        }

        @keyframes profilePulse {
          0%,100% {
            box-shadow:
              0 0 20px
              rgba(255,215,0,0.18),
              0 0 40px
              rgba(255,140,0,0.08);
          }

          50% {
            box-shadow:
              0 0 36px
              rgba(255,215,0,0.42),
              0 0 72px
              rgba(255,140,0,0.2);
          }
        }

        .profile-label {
          font-family: 'Cinzel', serif;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #ffd700;
          animation:
            labelGlow 2.5s ease-in-out infinite;
        }

        .genie-float {
          position: fixed;
          bottom: 32px;
          right: 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          z-index: 100;
          background: none;
          border: none;
        }

        .genie-orb {
          width: 74px;
          height: 74px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          background:
            radial-gradient(
              circle at 35% 35%,
              rgba(255,215,0,0.22),
              rgba(139,92,246,0.28) 60%,
              rgba(6,78,59,0.15)
            );
          border:
            1.5px solid
            rgba(255,215,0,0.4);
          transition:
            transform 0.22s ease;
          animation:
            orbPulse 3s ease-in-out infinite;
        }

        .genie-float:hover
        .genie-orb {
          transform: scale(1.1);
        }

        @keyframes orbPulse {
          0%,100% {
            box-shadow:
              0 0 20px
              rgba(255,215,0,0.2),
              0 0 40px
              rgba(139,92,246,0.1);
          }

          50% {
            box-shadow:
              0 0 36px
              rgba(255,215,0,0.45),
              0 0 72px
              rgba(139,92,246,0.25);
          }
        }

        .genie-label {
          font-family: 'Cinzel', serif;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #ffd700;
          animation:
            labelGlow 2.5s ease-in-out infinite;
        }

        @keyframes labelGlow {
          0%,100% {
            text-shadow:
              0 0 8px
              rgba(255,215,0,0.8),
              0 0 16px
              rgba(255,215,0,0.35);
          }

          50% {
            text-shadow:
              0 0 16px
              rgba(255,215,0,1),
              0 0 32px
              rgba(255,215,0,0.7),
              0 0 48px
              rgba(255,215,0,0.3);
          }
        }

        @keyframes calorieAlert {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }

          50% {
            opacity: 0.45;
            transform: scale(1.04);
          }
        }

        @media (max-width: 700px) {
          .db-inner {
            padding:
              52px 18px 140px;
          }

          .tools-grid {
            grid-template-columns: 1fr;
          }

          .profile-float {
            left: 18px;
            bottom: 20px;
          }

          .genie-float {
            right: 18px;
            bottom: 20px;
          }

          .profile-orb,
          .genie-orb {
            width: 62px;
            height: 62px;
          }
        }
      `}</style>

      <div className="db-wrap">
        <div className="db-bg" />

        <div className="db-inner">

          {/* SIGN OUT */}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push(
                "/auth/login"
              );
            }}
            style={{
              position: "fixed",
              top: 16,
              left: 16,
              zIndex: 9999,
              background:
                "rgba(255,50,50,0.15)",
              border:
                "1px solid rgba(255,50,50,0.4)",
              color: "#f87171",
              padding:
                "8px 18px",
              borderRadius: 10,
              fontFamily:
                "'Raleway', sans-serif",
              fontSize: 12,
              cursor: "pointer",
              letterSpacing: 1,
            }}
          >
            Sign Out
          </button>

          {/* HEADER */}
          <header
            style={{
              marginBottom: 52,
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
            }}
          >
            <div>
              <p className="db-eyebrow">
                ✦ Welcome back
              </p>

              <h1 className="db-name">
                {getGreeting()}
                {firstName
                  ? `, ${firstName}`
                  : ""}
              </h1>

              <p className="db-tagline">
                Healthy choices made easy ✦
              </p>
            </div>

            <div
              style={{
                background:
                  "rgba(255,140,0,0.15)",
                border:
                  "1px solid rgba(255,140,0,0.4)",
                color: "#fbbf24",
                padding:
                  "10px 18px",
                borderRadius:
                  "999px",
                fontWeight: 700,
                fontSize: "14px",
                display: "flex",
                alignItems:
                  "center",
                gap: "6px",
              }}
            >
              🔥 {streak}-Day Login Streak
            </div>
          </header>

          {/* STAT CARDS */}
          <div
            className="stat-grid"
            style={{
              marginBottom: 0,
            }}
          >

            {/* WEIGHT */}
            <div className="stat-card">
              <span className="stat-emoji">
                ⚖️
              </span>

              <p className="stat-label">
                Current Weight
              </p>

              <p
                className="stat-value"
                style={{
                  color: "#4ade80",
                }}
              >
                {profile?.weight_kg ??
                  "—"}{" "}

                <span
                  style={{
                    fontSize:
                      "0.45em",
                    color:
                      "rgba(74,222,128,0.7)",
                  }}
                >
                  kg
                </span>
              </p>

              <p className="stat-sub">
                Goal:{" "}
                {profile?.fitness_goal
                  ?.replace(
                    /_/g,
                    " "
                  ) ?? "—"}
              </p>
            </div>

            {/* CALORIES */}
            <div className="stat-card">
              <span className="stat-emoji">
                ⚡
              </span>

              <p className="stat-label">
                Daily Calorie Target
              </p>

              <p
                className="stat-value"
                style={{
                  color:
                    caloriesOver > 0
                      ? "#ef4444"
                      : targetReached
                      ? "#fbbf24"
                      : "#a78bfa",

                  animation:
                    caloriesOver > 0
                      ? "calorieAlert 1s ease-in-out infinite"
                      : "none",
                }}
              >
                <span
                  style={{
                    fontSize:
                      "0.75em",
                  }}
                >
                  {consumedCalories}
                </span>

                <span
                  style={{
                    fontSize:
                      "0.35em",
                    color:
                      "rgba(167,139,250,0.5)",
                    margin:
                      "0 4px",
                  }}
                >
                  /
                </span>

                {profile?.calorie_target ??
                  "—"}{" "}

                <span
                  style={{
                    fontSize:
                      "0.45em",
                    color:
                      "rgba(167,139,250,0.7)",
                  }}
                >
                  kcal
                </span>
              </p>

              <p className="stat-sub">
                Protein:{" "}
                {consumedProtein} /{" "}
                {profile?.protein_target ??
                  "—"}{" "}
                g/day
              </p>

              {/* CALORIE STATUS */}
              {calorieTarget > 0 && (
                <div
                  className={`calorie-status ${
                    caloriesOver > 0
                      ? "calorie-over"
                      : targetReached
                      ? "calorie-reached"
                      : "calorie-normal"
                  }`}
                >
                  {caloriesOver > 0
                    ? `${Math.round(
                        caloriesOver
                      )} kcal over target`
                    : targetReached
                    ? "Daily calorie target reached"
                    : `${Math.round(
                        caloriesRemaining
                      )} kcal remaining`}
                </div>
              )}

              {/* BUILD MY PLATE BUDGET */}
              <div className="plate-budget">
                <div className="plate-budget-label">
                  Build My Plate
                  budget
                </div>

                <div
                  className={`plate-budget-value ${
                    buildMyPlateCalories <=
                    0
                      ? "plate-budget-zero"
                      : ""
                  }`}
                >
                  {buildMyPlateCalories >
                  0
                    ? `${Math.round(
                        buildMyPlateCalories
                      )} kcal available`
                    : "0 kcal available"}
                </div>

                {remainingMealCalories >
                  0 && (
                  <p
                    style={{
                      margin:
                        "5px 0 0",
                      fontSize:
                        "9px",
                      color:
                        "rgba(148,163,184,0.5)",
                      lineHeight:
                        1.4,
                    }}
                  >
                    {Math.round(
                      remainingMealCalories
                    )} kcal reserved
                    for remaining
                    meals
                  </p>
                )}
              </div>
            </div>

            {/* BMI */}
            <div className="stat-card">
              <span className="stat-emoji">
                📊
              </span>

              <p className="stat-label">
                BMI
              </p>

              <p
                className="stat-value"
                style={{
                  color: "#ffd700",
                }}
              >
                {profile?.bmi ??
                  "—"}
              </p>

              <p className="stat-sub">
                {profile?.bmi
                  ? profile.bmi <
                    18.5
                    ? "Underweight"
                    : profile.bmi <
                      25
                    ? "Normal weight"
                    : profile.bmi <
                      30
                    ? "Overweight"
                    : "Obese"
                  : "—"}
              </p>
            </div>
          </div>

          <div className="gold-line" />

          {/* TOOLS */}
          <p className="tools-heading">
            ✦ Your Magical Tools
          </p>

          <div className="tools-grid">
            {tools.map((t) => (
              <button
                key={t.title}
                className="tool-card"
                onClick={() =>
                  router.push(
                    t.route
                  )
                }
                onMouseEnter={(e) => {
                  const el =
                    e.currentTarget;

                  el.style.transform =
                    "translateY(-6px)";

                  el.style.background =
                    t.bg;

                  el.style.borderColor =
                    t.border;

                  el.style.boxShadow =
                    `0 0 32px ${t.glow}`;

                  const wrap =
                    el.querySelector(
                      ".tool-emoji-wrap"
                    ) as HTMLElement;

                  if (wrap) {
                    wrap.style.boxShadow =
                      `0 0 18px ${t.glow}`;
                  }
                }}
                onMouseLeave={(e) => {
                  const el =
                    e.currentTarget;

                  el.style.transform =
                    "translateY(0)";

                  el.style.background =
                    "rgba(255,255,255,0.025)";

                  el.style.borderColor =
                    "rgba(255,255,255,0.07)";

                  el.style.boxShadow =
                    "none";

                  const wrap =
                    el.querySelector(
                      ".tool-emoji-wrap"
                    ) as HTMLElement;

                  if (wrap) {
                    wrap.style.boxShadow =
                      "none";
                  }
                }}
              >
                <div
                  className="tool-emoji-wrap"
                  style={{
                    background: t.bg,
                    border:
                      `1px solid ${t.border}`,
                  }}
                >
                  {t.emoji}
                </div>

                <p className="tool-title">
                  {t.title}
                </p>

                <p className="tool-desc">
                  {t.desc}
                </p>

                <span
                  className="tool-arrow"
                  style={{
                    color: t.color,
                  }}
                >
                  →
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* FLOATING MY PROFILE */}
        <button
          className="profile-float"
          onClick={() =>
            router.push(
              "/dashboard/user-data"
            )
          }
        >
          <div className="profile-orb">
            ✨
          </div>

          <span className="profile-label">
            My Profile
          </span>
        </button>

        {/* FLOATING GENIE */}
        <button
          className="genie-float"
          onClick={() =>
            router.push(
              "/dashboard/chat-genie"
            )
          }
        >
          <div className="genie-orb">
            🧞
          </div>

          <span className="genie-label">
            Chat with me
          </span>
        </button>
      </div>
    </>
  );
}
