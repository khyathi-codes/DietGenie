"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type NutritionContext = {
  calorie_target: number;
  calories_consumed: number;
  protein_target: number;
  protein_consumed: number;
  reserved_for_remaining_meals: number;
  flexible_calories: number;
  remaining_planned_meals: string[];
};

export default function BuildMyPlatePage() {
  const router = useRouter();

  const [ingredients, setIngredients] = useState("");

  // Stores the user's ACTUAL profile goal.
  const [goal, setGoal] = useState("");
  const [goalLoading, setGoalLoading] = useState(true);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingNutrition, setLoadingNutrition] = useState(true);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [nutrition, setNutrition] =
    useState<NutritionContext | null>(null);

  /*
   * LOAD USER PROFILE GOAL + TODAY'S NUTRITION
   */
  useEffect(() => {
    const loadProfileAndNutrition = async () => {
      try {
        const response = await fetch(
          "/api/dashboard/build-my-plate"
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load your profile information."
          );
        }

        const data = await response.json();

        /*
         * Load the fitness goal saved in the user's profile.
         */
        setGoal(data?.fitness_goal || "");

        /*
         * Load today's nutrition context.
         */
        if (data?.nutritionContext) {
          const nutritionContextData =
            data.nutritionContext;

          const context: NutritionContext = {
            calorie_target: Number(
              nutritionContextData.calorie_target ?? 0
            ),

            calories_consumed: Number(
              nutritionContextData.calories_consumed ?? 0
            ),

            protein_target: Number(
              nutritionContextData.protein_target ?? 0
            ),

            protein_consumed: Number(
              nutritionContextData.protein_consumed ?? 0
            ),

            reserved_for_remaining_meals: Number(
              nutritionContextData
                .reserved_for_remaining_meals ?? 0
            ),

            flexible_calories: Number(
              nutritionContextData.flexible_calories ?? 0
            ),

            remaining_planned_meals:
              Array.isArray(
                nutritionContextData
                  .remaining_planned_meals
              )
                ? nutritionContextData
                    .remaining_planned_meals
                : [],
          };

          setNutrition(context);
        } else {
          setNutrition(null);
        }
      } catch (err: unknown) {
        console.error(
          "Build My Plate profile error:",
          err
        );

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(
            "Unable to load your profile information."
          );
        }
      } finally {
        setGoalLoading(false);
        setLoadingProfile(false);
        setLoadingNutrition(false);
      }
    };

    void loadProfileAndNutrition();
  }, []);

  /*
   * Convert database goal values into
   * user-friendly display text.
   *
   * Example:
   * weight_loss -> Weight Loss
   */
  const formatGoal = (value: string) => {
    if (!value) return "";

    return value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  /*
   * GENERATE DISHES
   */
  const generateDishes = async () => {
    if (!ingredients.trim()) {
      setError(
        "Please enter the ingredients you have."
      );
      return;
    }

    /*
     * Do not generate if the user's profile goal
     * has not loaded.
     */
    if (!goal) {
      setError(
        "Your profile goal could not be loaded. Please try again."
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/dashboard/build-my-plate",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            ingredients: ingredients.trim(),

            /*
             * Send the user's saved profile goal.
             */
            goal,
          }),
        }
      );

      let data: {
  error?: string;
  dishes?: unknown[];
  nutritionContext?: {
    calorie_target?: number;
    calories_consumed?: number;
    protein_target?: number;
    protein_consumed?: number;
    reserved_for_remaining_meals?: number;
    flexible_calories?: number;
    remaining_planned_meals?: string[];
  };
};

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to generate dishes. Please try again."
        );
      }

      const dishes = Array.isArray(data?.dishes)
        ? data.dishes
        : [];

      if (dishes.length === 0) {
        throw new Error(
          "No dishes could be created. Try different ingredients."
        );
      }

      /*
       * Save generated dishes.
       */
      sessionStorage.setItem(
        "dietgenie_dishes",
        JSON.stringify(dishes)
      );

      /*
       * Save the nutrition context returned
       * by the API.
       */
      if (data?.nutritionContext) {
        const nutritionContextData =
          data.nutritionContext;

        const nutritionContext: NutritionContext = {
          calorie_target: Number(
            nutritionContextData.calorie_target ?? 0
          ),

          calories_consumed: Number(
            nutritionContextData.calories_consumed ?? 0
          ),

          protein_target: Number(
            nutritionContextData.protein_target ?? 0
          ),

          protein_consumed: Number(
            nutritionContextData.protein_consumed ?? 0
          ),

          reserved_for_remaining_meals: Number(
            nutritionContextData
              .reserved_for_remaining_meals ?? 0
          ),

          flexible_calories: Number(
            nutritionContextData.flexible_calories ?? 0
          ),

          remaining_planned_meals:
            Array.isArray(
              nutritionContextData
                .remaining_planned_meals
            )
              ? nutritionContextData
                  .remaining_planned_meals
              : [],
        };

        sessionStorage.setItem(
          "dietgenie_plate_context",
          JSON.stringify(nutritionContext)
        );
      } else {
        sessionStorage.removeItem(
          "dietgenie_plate_context"
        );
      }

      /*
       * Save the user's profile goal.
       */
      sessionStorage.setItem(
        "dietgenie_plate_goal",
        goal
      );

      /*
       * Go to results page.
       */
      router.push(
        "/dashboard/build-my-plate/results"
      );
    } catch (err: unknown) {
      console.error(
        "Build My Plate error:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to generate dishes. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const displayGoal = formatGoal(goal);

  return (
    <main className="plate-page">
      <div className="background-glow" />

      <div className="page-container">
        <button
          className="back-button"
          onClick={() =>
            router.push("/dashboard")
          }
          type="button"
        >
          ← Dashboard
        </button>

        <section className="hero">
          <div className="magic-icon">
            🧞‍♂️
          </div>

          <p className="eyebrow">
            DIET GENIE
          </p>

          <h1>Build My Plate</h1>

          <p className="subtitle">
            Tell Genie what ingredients you have.
            <br />
            We&apos;ll turn them into meals made for you.
          </p>
        </section>

        <section className="input-card">
          <label htmlFor="ingredients">
            🥕 What ingredients do you have?
          </label>

          <textarea
            id="ingredients"
            value={ingredients}
            onChange={(e) => {
              setIngredients(e.target.value);

              if (error) {
                setError("");
              }
            }}
            placeholder="Example: rice, eggs, tomato, onion, spinach, paneer..."
            disabled={loading}
          />

          <div className="examples">
            <span>Try:</span>

            <button
              type="button"
              onClick={() =>
                setIngredients(
                  "rice, eggs, tomato, onion, spinach"
                )
              }
              disabled={loading}
            >
              Rice + Eggs
            </button>

            <button
              type="button"
              onClick={() =>
                setIngredients(
                  "paneer, tomato, onion, capsicum"
                )
              }
              disabled={loading}
            >
              Paneer
            </button>

            <button
              type="button"
              onClick={() =>
                setIngredients(
                  "oats, banana, milk, almonds"
                )
              }
              disabled={loading}
            >
              Oats
            </button>
          </div>

          {/* TODAY'S NUTRITION */}
          <div className="nutrition-card">
            <div className="nutrition-header">
              <span>📊 Today&apos;s Nutrition</span>

              {loadingNutrition && (
                <small>
                  Loading...
                </small>
              )}
            </div>

            {!loadingNutrition &&
              nutrition && (
                <div className="nutrition-grid">
                  <div>
                    <span>
                      Calories
                    </span>

                    <strong>
                      {Math.round(
                        nutrition.calories_consumed
                      )}{" "}
                      /{" "}
                      {Math.round(
                        nutrition.calorie_target
                      )}{" "}
                      kcal
                    </strong>
                  </div>

                  <div>
                    <span>
                      Protein
                    </span>

                    <strong>
                      {Math.round(
                        nutrition.protein_consumed
                      )}{" "}
                      /{" "}
                      {Math.round(
                        nutrition.protein_target
                      )}{" "}
                      g
                    </strong>
                  </div>

                  <div>
                    <span>
                      Reserved meals
                    </span>

                    <strong>
                      {Math.round(
                        nutrition.reserved_for_remaining_meals
                      )}{" "}
                      kcal
                    </strong>
                  </div>

                  <div className="flexible">
                    <span>
                      Build My Plate budget
                    </span>

                    <strong>
                      {Math.round(
                        nutrition.flexible_calories
                      )}{" "}
                      kcal
                    </strong>
                  </div>
                </div>
              )}
          </div>

          {/* PROFILE GOAL */}
          <div className="goal-row">
            <div className="goal-container">
              <span className="goal-label">
                🎯 Your Profile Goal
              </span>

              <div className="profile-goal">
                <span>
                  {goalLoading
                    ? "Loading..."
                    : displayGoal ||
                      "Profile goal not found"}
                </span>
              </div>
            </div>

            <button
              className="generate-button"
              onClick={generateDishes}
              disabled={
                loading ||
                loadingProfile ||
                goalLoading ||
                !goal
              }
              type="button"
            >
              {loading
                ? "✨ Creating..."
                : "✨ Build My Plate"}
            </button>
          </div>

          {nutrition &&
            nutrition.flexible_calories <= 0 && (
              <div className="budget-note">
                💡 You&apos;ve used your available
                calorie budget for today. Genie
                will focus on lighter,
                nutrient-dense options.
              </div>
            )}

          {nutrition &&
            nutrition.flexible_calories > 0 && (
              <div className="budget-note">
                ✨ Genie will keep your dishes
                around{" "}
                <strong>
                  {Math.round(
                    nutrition.flexible_calories
                  )}{" "}
                  kcal
                </strong>{" "}
                so your remaining planned meals
                are protected.
              </div>
            )}

          {error && (
            <p
              className="error"
              role="alert"
            >
              {error}
            </p>
          )}
        </section>

        {loading && (
          <div className="loading-box">
            <div className="loading-emoji">
              🍳
            </div>

            <p>
              Genie is creating meals from your
              ingredients...
            </p>

            <span>
              Checking your diet, goal and
              today&apos;s nutrition
            </span>
          </div>
        )}
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .plate-page {
          min-height: 100vh;
          background: #020817;
          color: #e2e8f0;
          font-family: "Raleway", sans-serif;
          padding: 30px 20px 120px;
          position: relative;
          overflow-x: hidden;
        }

        .background-glow {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(
              ellipse 70% 55% at 15% 8%,
              rgba(91, 33, 182, 0.22),
              transparent 60%
            ),
            radial-gradient(
              ellipse 55% 45% at 85% 85%,
              rgba(6, 78, 59, 0.18),
              transparent 55%
            ),
            radial-gradient(
              ellipse 45% 55% at 88% 8%,
              rgba(161, 128, 0, 0.1),
              transparent 55%
            );
        }

        .page-container {
          max-width: 1100px;
          margin: auto;
          position: relative;
          z-index: 1;
        }

        .back-button {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          padding: 10px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .back-button:hover {
          border-color: rgba(255, 215, 0, 0.35);
          color: #fff;
        }

        .hero {
          text-align: center;
          padding: 50px 20px 40px;
        }

        .magic-icon {
          font-size: 55px;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-10px);
          }
        }

        .eyebrow {
          color: #b8860b;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 4px;
          margin: 10px 0;
        }

        h1 {
          font-family: "Cinzel", serif;
          font-size: clamp(38px, 6vw, 64px);
          margin: 0;
          background: linear-gradient(
            135deg,
            #ffd700,
            #fffde7,
            #ffa500
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .subtitle {
          color: rgba(167, 139, 250, 0.75);
          font-family: "Cormorant Garamond", serif;
          font-size: 20px;
          font-style: italic;
          line-height: 1.5;
        }

        .input-card {
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 28px;
          backdrop-filter: blur(15px);
          margin-bottom: 25px;
        }

        .input-card label {
          display: block;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        textarea {
          width: 100%;
          min-height: 120px;
          resize: vertical;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.2);
          color: white;
          padding: 18px;
          font-size: 15px;
          outline: none;
          font-family: inherit;
        }

        textarea:focus {
          border-color: rgba(255, 215, 0, 0.5);
        }

        textarea:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .examples {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
          align-items: center;
        }

        .examples span {
          color: #64748b;
          font-size: 12px;
        }

        .examples button {
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: #cbd5e1;
          padding: 7px 12px;
          border-radius: 20px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .examples button:hover:not(:disabled) {
          border-color: rgba(255, 215, 0, 0.35);
          color: #fff;
        }

        .examples button:disabled {
          opacity: 0.5;
          cursor: wait;
        }

        .nutrition-card {
          margin-top: 22px;
          padding: 18px;
          border-radius: 16px;
          background: rgba(139, 92, 246, 0.07);
          border: 1px solid rgba(139, 92, 246, 0.16);
        }

        .nutrition-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          font-size: 13px;
          font-weight: 700;
        }

        .nutrition-header small {
          color: #64748b;
          font-weight: 400;
        }

        .nutrition-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .nutrition-grid > div {
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.035);
        }

        .nutrition-grid span {
          display: block;
          color: #64748b;
          font-size: 10px;
          margin-bottom: 6px;
        }

        .nutrition-grid strong {
          display: block;
          color: #e2e8f0;
          font-size: 13px;
        }

        .nutrition-grid .flexible {
          border-color: rgba(255, 215, 0, 0.2);
          background: rgba(255, 215, 0, 0.04);
        }

        .nutrition-grid .flexible strong {
          color: #fbbf24;
        }

        .goal-row {
          display: flex;
          gap: 20px;
          align-items: end;
          justify-content: space-between;
          margin-top: 25px;
        }

        .goal-container {
          flex: 1;
        }

        .goal-label {
          display: block;
          font-size: 11px;
          color: #94a3b8;
          margin-bottom: 8px;
        }

        .profile-goal {
          width: 100%;
          min-height: 50px;
          display: flex;
          align-items: center;
          padding: 0 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 215, 0, 0.4);
          background: rgba(255, 255, 255, 0.035);
        }

        .profile-goal span {
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
        }

        .generate-button {
          border: 0;
          padding: 15px 25px;
          border-radius: 14px;
          background: linear-gradient(
            135deg,
            #ffd700,
            #f59e0b
          );
          color: #171717;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .generate-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(245, 158, 11, 0.2);
        }

        .generate-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .budget-note {
          margin-top: 15px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.5;
        }

        .budget-note strong {
          color: #fbbf24;
        }

        .error {
          color: #fca5a5;
          margin-top: 15px;
          line-height: 1.5;
        }

        .loading-box {
          text-align: center;
          padding: 50px 20px;
        }

        .loading-emoji {
          font-size: 50px;
          animation: cook 1s infinite alternate;
        }

        @keyframes cook {
          from {
            transform: rotate(-8deg);
          }

          to {
            transform: rotate(8deg);
          }
        }

        .loading-box p {
          font-size: 18px;
        }

        .loading-box span {
          color: #64748b;
          font-size: 12px;
        }

        @media (max-width: 850px) {
          .nutrition-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 700px) {
          .goal-row {
            flex-direction: column;
            align-items: stretch;
          }

          .generate-button {
            width: 100%;
          }
        }

        @media (max-width: 450px) {
          .nutrition-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}