"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

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
  animation_type?: string;
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

const animationEmoji: Record<string, string> = {
  squat: "🏋️",
  push: "💪",
  pull: "🤸",
  lunge: "🦵",
  hinge: "🙇",
  plank: "🧘",
  march: "🚶",
  jump: "🦘",
  stretch: "🧘‍♀️",
  bend: "🙆",
  raise: "🙋",
  rotate: "🔄",
  walk: "🚶",
  rest: "😌",
};

const actionLabel: Record<string, string> = {
  squat: "SQUAT",
  push: "PUSH",
  pull: "PULL",
  lunge: "LUNGE",
  hinge: "HINGE",
  plank: "PLANK",
  march: "MARCH",
  jump: "JUMP",
  stretch: "STRETCH",
  bend: "BEND",
  raise: "RAISE",
  rotate: "ROTATE",
  walk: "WALK",
  rest: "REST",
};

export default function ExercisesPage() {
  const router = useRouter();

  const [plan, setPlan] =
    useState<ExercisePlan | null>(null);

  const [
    completedIndices,
    setCompletedIndices,
  ] = useState<number[]>([]);

  const [activeExercise, setActiveExercise] =
    useState(0);

  const [streak, setStreak] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [isSpeaking, setIsSpeaking] =
    useState(false);

  /*
   * Prevent duplicate GET requests in
   * React StrictMode / development.
   */
  const hasLoadedWorkout =
    useRef(false);

  /*
   * Prevent multiple workout requests
   * while one request is already running.
   */
  const workoutRequestInFlight =
    useRef(false);

  const loadWorkout = async () => {
    if (workoutRequestInFlight.current) {
      return;
    }

    workoutRequestInFlight.current = true;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/dashboard/exercises",
        {
          method: "GET",
          cache: "no-store",
        }
      );

    let data: {
  error?: string;
  plan?: ExercisePlan;
  completed_indices?: number[];
  streak?: number;
} = {};
      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The exercise server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load today's workout."
        );
      }

      if (!data?.plan) {
        throw new Error(
          "Today's exercise plan was not returned."
        );
      }

      setPlan(data.plan);

      setCompletedIndices(
        Array.isArray(
          data.completed_indices
        )
          ? data.completed_indices
          : []
      );

      setStreak(
        Number(data.streak ?? 0)
      );

      /*
       * Make sure the active exercise
       * is always inside the plan.
       */
      const exercises = data.plan?.exercises;

if (exercises?.length) {
  setActiveExercise((current) =>
    Math.min(
      current,
      exercises.length - 1
    )
  );
}
    } catch (err: unknown) {
  console.error(err);

  setError(
    err instanceof Error
      ? err.message
      : "Unable to load today's workout."
  );
} finally {
      setLoading(false);
      workoutRequestInFlight.current =
        false;
    }
  };

  useEffect(() => {
    if (hasLoadedWorkout.current) {
      return;
    }

    hasLoadedWorkout.current = true;

    loadWorkout();
  }, []);

  const stopVoice = () => {
    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
  };

  const speakExercise = (
    instruction: string
  ) => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      setError(
        "Voice is not supported by this browser."
      );
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        instruction
      );

    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(
      utterance
    );
  };

  const toggleComplete = async (
    index: number
  ) => {
    const alreadyCompleted =
      completedIndices.includes(index);

    try {
      const response = await fetch(
        "/api/dashboard/exercises",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            exerciseIndex: index,
            completed:
              !alreadyCompleted,
          }),
        }
      );

let data: {
  error?: string;
  completed_indices?: number[];
  streak?: number;
} = {};
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
            "Could not update progress."
        );
      }

      setCompletedIndices(
        Array.isArray(
          data.completed_indices
        )
          ? data.completed_indices
          : []
      );

      setStreak(
        Number(data.streak ?? 0)
      );
    
  } catch (err: unknown) {
  console.error(err);

  setError(
    err instanceof Error
      ? err.message
      : "Could not update workout progress."
  );
}
  };

  const goToExercise = (
    index: number 
  ) => {
    if (!plan) return;

    const safeIndex = Math.max(
      0,
      Math.min(
        index,
        plan.exercises.length - 1
      )
    );

    stopVoice();

    setActiveExercise(
      safeIndex
    );
  };

  useEffect(() => {
    return () => {
      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const currentExercise =
    plan?.exercises?.[
      activeExercise
    ];

  const progress =
    plan &&
    plan.exercises.length > 0
      ? Math.round(
          (completedIndices.length /
            plan.exercises.length) *
            100
        )
      : 0;

  const workoutComplete =
    !!plan &&
    completedIndices.length ===
      plan.exercises.length;

  /*
   * Safely determine the emoji.
   *
   * Your updated API does not require
   * animation_type, so we first try it
   * and then fall back to exercise.type.
   */
  const getExerciseEmoji = (
    exercise: Exercise
  ) => {
    const key =
      String(
        exercise.animation_type ||
          exercise.type ||
          ""
      )
        .toLowerCase()
        .trim();

    return (
      animationEmoji[key] ||
      "🏃"
    );
  };

  /*
   * Get a readable exercise type.
   */
  const getExerciseType = (
    exercise: Exercise
  ) => {
    const key =
      String(
        exercise.animation_type ||
          exercise.type ||
          ""
      )
        .toLowerCase()
        .trim();

    return (
      actionLabel[key] ||
      String(
        exercise.type || "EXERCISE"
      ).toUpperCase()
    );
  };

  if (loading) {
    return (
      <main className="exercise-page">
        <div className="loading-screen">
          <div className="loading-character">
            🏃
          </div>

          <h2>
            Genie is preparing your workout...
          </h2>

          <p>
            Creating today&apos;s routine from
            your profile, goal and nutrition.
          </p>
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  if (error && !plan) {
    return (
      <main className="exercise-page">
        <div className="error-screen">
          <div className="error-icon">
            🧞
          </div>

          <h2>
            We couldn&apos;t prepare your workout
          </h2>

          <p>{error}</p>

          <button
            onClick={() => {
              /*
               * Allow another manual attempt
               * after an error.
               */
              hasLoadedWorkout.current =
                false;

              loadWorkout();
            }}
          >
            Try Again
          </button>

          <button
            className="secondary-button"
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
          >
            ← Dashboard
          </button>
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="exercise-page">
      <div className="background-glow" />

      <div className="page-container">

        <button
          className="back-button"
          onClick={() =>
            router.push(
              "/dashboard"
            )
          }
        >
          ← Dashboard
        </button>

        <section className="hero">

          <div className="hero-icon">
            🏃
          </div>

          <p className="eyebrow">
            DIET GENIE
          </p>

          <h1>
            Exercises
          </h1>

          <p className="subtitle">
            Your daily workout, created by AI
            <br />
            around your profile and fitness goal.
          </p>

        </section>

        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        {/*
         * Nutrition adjustment message.
         *
         * This appears only when the API
         * determines that yesterday's intake
         * was significantly above target.
         */}
        {plan?.adjustment_message && (
          <section className="nutrition-adjustment">
            <div className="adjustment-icon">
              💡
            </div>

            <div className="adjustment-content">
              <strong>
                Today&apos;s workout has been slightly adjusted
              </strong>

              <p>
                {plan.adjustment_message}
              </p>

              {plan.nutrition_context && (
                <div className="nutrition-mini-stats">
                  <span>
                    Yesterday:{" "}
                    <strong>
                      {Math.round(
                        plan.nutrition_context
                          .yesterdayCalories
                      )}{" "}
                      kcal
                    </strong>
                  </span>

                  <span>
                    Target:{" "}
                    <strong>
                      {Math.round(
                        plan.nutrition_context
                          .calorieTarget
                      )}{" "}
                      kcal
                    </strong>
                  </span>

                  <span>
                    Excess:{" "}
                    <strong>
                      {Math.round(
                        plan.nutrition_context
                          .yesterdayExcess
                      )}{" "}
                      kcal
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {plan &&
          currentExercise && (
            <>

              <section className="workout-summary">

                <div className="summary-main">

                  <p className="eyebrow">
                    TODAY&apos;S WORKOUT
                  </p>

                  <h2>
                    {plan.title}
                  </h2>

                  <p className="summary-text">
                    {plan.summary}
                  </p>

                  <div className="summary-tags">

                    <span>
                      🎯 {plan.goal}
                    </span>

                    <span>
                      ⏱ {plan.duration_minutes} min
                    </span>

                    <span>
                      ⚡ {plan.difficulty}
                    </span>

                  </div>

                </div>

                <div className="streak-box">

                  <span className="streak-fire">
                    🔥
                  </span>

                  <strong>
                    {streak}
                  </strong>

                  <span>
                    Day Workout Streak
                  </span>

                </div>

              </section>

              {/*
               * Today's nutrition information.
               * This is informational only.
               */}
              {plan.nutrition_context && (
                <section className="nutrition-context-card">

                  <div className="nutrition-context-title">
                    <span>
                      🍽️
                    </span>

                    <div>
                      <strong>
                        Today&apos;s Nutrition
                      </strong>

                      <p>
                        Your workout is planned with
                        today&apos;s intake in mind.
                      </p>
                    </div>
                  </div>

                  <div className="nutrition-context-values">

                    <div>
                      <span>
                        Consumed
                      </span>

                      <strong>
                        {Math.round(
                          plan.nutrition_context
                            .todayCalories
                        )}
                        <small>
                          {" "}kcal
                        </small>
                      </strong>
                    </div>

                    <div>
                      <span>
                        Daily Target
                      </span>

                      <strong>
                        {Math.round(
                          plan.nutrition_context
                            .calorieTarget
                        )}
                        <small>
                          {" "}kcal
                        </small>
                      </strong>
                    </div>

                    <div>
                      <span>
                        Yesterday
                      </span>

                      <strong>
                        {Math.round(
                          plan.nutrition_context
                            .yesterdayCalories
                        )}
                        <small>
                          {" "}kcal
                        </small>
                      </strong>
                    </div>

                  </div>

                </section>
              )}

              <section className="progress-card">

                <div className="progress-header">

                  <div>
                    <span>
                      Today&apos;s Progress
                    </span>

                    <strong>
                      {completedIndices.length}
                      {" / "}
                      {plan.exercises.length}
                      {" completed"}
                    </strong>
                  </div>

                  <strong>
                    {progress}%
                  </strong>

                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                {workoutComplete && (
                  <div className="complete-message">
                    🎉 Amazing! You completed
                    today&apos;s workout!
                  </div>
                )}

              </section>

              <section className="exercise-card">

                <div className="exercise-instruction">

                  <div className="instruction-left">

                    <span>
                      WHAT TO DO
                    </span>

                    <h3>
                      {currentExercise.name}
                    </h3>

                    <p>
                      {
                        currentExercise.instructions
                      }
                    </p>

                    <div className="exercise-type-label">
                      {getExerciseEmoji(
                        currentExercise
                      )}{" "}
                      {getExerciseType(
                        currentExercise
                      )}
                    </div>

                    <div className="exercise-details">

                      {currentExercise.repetitions >
                        0 && (
                        <div>
                          <strong>
                            {
                              currentExercise.repetitions
                            }
                          </strong>

                          <span>
                            Reps
                          </span>
                        </div>
                      )}

                      {currentExercise.sets >
                        0 && (
                        <div>
                          <strong>
                            {
                              currentExercise.sets
                            }
                          </strong>

                          <span>
                            Sets
                          </span>
                        </div>
                      )}

                      {currentExercise.duration_seconds >
                        0 && (
                        <div>
                          <strong>
                            {
                              currentExercise
                                .duration_seconds
                            }
                            s
                          </strong>

                          <span>
                            Duration
                          </span>
                        </div>
                      )}

                      <div>
                        <strong>
                          {
                            currentExercise
                              .rest_seconds
                          }
                          s
                        </strong>

                        <span>
                          Rest
                        </span>
                      </div>

                    </div>

                  </div>

                  <div className="instruction-actions">

                    <button
                      type="button"
                      className={`listen-button ${
                        isSpeaking
                          ? "speaking"
                          : ""
                      }`}
                      onClick={() =>
                        isSpeaking
                          ? stopVoice()
                          : speakExercise(
                              currentExercise.instructions
                            )
                      }
                    >
                      {isSpeaking
                        ? "⏹ Stop"
                        : "🔊 Listen"}
                    </button>

                    <button
                      type="button"
                      className={`complete-button ${
                        completedIndices.includes(
                          activeExercise
                        )
                          ? "completed"
                          : ""
                      }`}
                      onClick={() =>
                        toggleComplete(
                          activeExercise
                        )
                      }
                    >
                      {completedIndices.includes(
                        activeExercise
                      )
                        ? "✓ Completed"
                        : "Mark Complete"}
                    </button>

                  </div>

                </div>

                <div className="benefit-box">

                  <span>
                    ✨ Why this exercise?
                  </span>

                  <p>
                    {currentExercise.benefit}
                  </p>

                </div>

                <div className="controls">

                  <button
                    type="button"
                    disabled={
                      activeExercise === 0
                    }
                    onClick={() =>
                      goToExercise(
                        activeExercise - 1
                      )
                    }
                  >
                    ← Previous
                  </button>

                  <div className="dots">

                    {plan.exercises.map(
                      (_, index) => (
                        <button
                          type="button"
                          key={index}
                          aria-label={`Go to exercise ${
                            index + 1
                          }`}
                          className={
                            index ===
                            activeExercise
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            goToExercise(
                              index
                            )
                          }
                        />
                      )
                    )}

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      goToExercise(
                        activeExercise ===
                          plan.exercises.length - 1
                          ? 0
                          : activeExercise + 1
                      )
                    }
                  >
                    {activeExercise ===
                    plan.exercises.length - 1
                      ? "Start Again ↻"
                      : "Next →"}
                  </button>

                </div>

              </section>

              <section className="exercise-list">

                <div className="list-heading">

                  <div>
                    <p className="eyebrow">
                      TODAY&apos;S PLAN
                    </p>

                    <h2>
                      Your 5 Exercises
                    </h2>
                  </div>

                  <span>
                    {completedIndices.length}
                    /
                    {plan.exercises.length}
                  </span>

                </div>

                {plan.exercises.map(
                  (
                    exercise,
                    index
                  ) => {

                    const completed =
                      completedIndices.includes(
                        index
                      );

                    return (
                      <button
                        type="button"
                        key={index}
                        className={`exercise-row ${
                          index ===
                          activeExercise
                            ? "selected"
                            : ""
                        } ${
                          completed
                            ? "done"
                            : ""
                        }`}
                        onClick={() =>
                          goToExercise(
                            index
                          )
                        }
                      >

                        <div className="row-number">
                          {completed
                            ? "✓"
                            : index + 1}
                        </div>

                        <div className="row-icon">
                          {getExerciseEmoji(
                            exercise
                          )}
                        </div>

                        <div className="row-info">

                          <strong>
                            {exercise.name}
                          </strong>

                          <span>
                            {exercise.repetitions >
                            0
                              ? `${exercise.repetitions} reps`
                              : `${exercise.duration_seconds}s`}
                            {" • "}
                            {exercise.sets} sets
                          </span>

                        </div>

                        <div className="row-arrow">
                          →
                        </div>

                      </button>
                    );
                  }
                )}

              </section>

              <div className="safety-note">

                <span>
                  ℹ️
                </span>

                <p>
                  This workout is AI-generated
                  from your Diet Genie profile,
                  fitness goal and nutrition
                  context. Exercise only at a
                  level that feels appropriate for
                  you. Stop if you feel pain,
                  dizziness or unusual discomfort.
                </p>

              </div>

            </>
          )}

      </div>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  .exercise-page {
    min-height: 100vh;
    background: #020817;
    color: #e2e8f0;
    padding: 30px 20px 100px;
    position: relative;
    overflow-x: hidden;
    font-family: Arial, sans-serif;
  }

  .background-glow {
    position: fixed;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(
        ellipse 60% 50% at 10% 10%,
        rgba(59, 130, 246, .16),
        transparent 60%
      ),
      radial-gradient(
        ellipse 55% 45% at 90% 80%,
        rgba(16, 185, 129, .12),
        transparent 60%
      );
  }

  .page-container {
    max-width: 1050px;
    margin: auto;
    position: relative;
    z-index: 1;
  }

  .back-button {
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.04);
    color: #94a3b8;
    padding: 10px 15px;
    border-radius: 12px;
    cursor: pointer;
  }

  .hero {
    text-align: center;
    padding: 45px 20px 35px;
  }

  .hero-icon {
    font-size: 58px;
  }

  .eyebrow {
    color: #facc15;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 3px;
    margin: 8px 0;
  }

  h1 {
    margin: 0;
    font-size: clamp(42px, 7vw, 65px);
    font-weight: 900;
    background: linear-gradient(
      135deg,
      #facc15,
      #fff,
      #60a5fa
    );
    -webkit-background-clip: text;
    color: transparent;
  }

  .subtitle {
    color: #c4b5fd;
    line-height: 1.6;
    font-size: 18px;
  }

  .nutrition-adjustment {
    margin-bottom: 18px;
    display: flex;
    gap: 15px;
    padding: 18px;
    border-radius: 20px;
    background: rgba(250,204,21,.07);
    border: 1px solid rgba(250,204,21,.2);
  }

  .adjustment-icon {
    font-size: 25px;
    flex-shrink: 0;
  }

  .adjustment-content {
    flex: 1;
  }

  .adjustment-content > strong {
    color: #fde68a;
    font-size: 14px;
  }

  .adjustment-content p {
    margin: 6px 0 0;
    color: #cbd5e1;
    font-size: 12px;
    line-height: 1.6;
  }

  .nutrition-mini-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }

  .nutrition-mini-stats span {
    padding: 7px 10px;
    border-radius: 9px;
    background: rgba(255,255,255,.04);
    color: #94a3b8;
    font-size: 10px;
  }

  .nutrition-mini-stats strong {
    color: #fde68a;
  }

  .nutrition-context-card {
    margin-top: 18px;
    padding: 18px 20px;
    border-radius: 20px;
    background: rgba(96,165,250,.045);
    border: 1px solid rgba(96,165,250,.12);
  }

  .nutrition-context-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .nutrition-context-title > span {
    font-size: 25px;
  }

  .nutrition-context-title strong {
    color: #dbeafe;
    font-size: 13px;
  }

  .nutrition-context-title p {
    margin: 3px 0 0;
    color: #64748b;
    font-size: 10px;
  }

  .nutrition-context-values {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 14px;
  }

  .nutrition-context-values div {
    padding: 11px;
    border-radius: 11px;
    background: rgba(255,255,255,.025);
  }

  .nutrition-context-values span {
    display: block;
    color: #64748b;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .nutrition-context-values strong {
    display: block;
    margin-top: 4px;
    color: #c4b5fd;
    font-size: 16px;
  }

  .nutrition-context-values small {
    font-size: 9px;
    color: #64748b;
  }

  .workout-summary {
    display: grid;
    grid-template-columns: 1fr 190px;
    gap: 18px;
    padding: 24px;
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,.08);
    background: rgba(255,255,255,.035);
    backdrop-filter: blur(15px);
  }

  .summary-main h2 {
    font-size: 28px;
    margin: 5px 0 8px;
  }

  .summary-text {
    color: #94a3b8;
    font-size: 13px;
    line-height: 1.6;
  }

  .summary-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 15px;
  }

  .summary-tags span {
    background: rgba(250,204,21,.08);
    border: 1px solid rgba(250,204,21,.18);
    color: #fde68a;
    padding: 7px 11px;
    border-radius: 999px;
    font-size: 11px;
  }

  .streak-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    background: rgba(249,115,22,.08);
    border: 1px solid rgba(249,115,22,.2);
  }

  .streak-fire {
    font-size: 30px;
  }

  .streak-box strong {
    font-size: 30px;
    color: #fb923c;
  }

  .streak-box span:last-child {
    color: #94a3b8;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .progress-card {
    margin-top: 18px;
    padding: 20px;
    border-radius: 20px;
    background: rgba(255,255,255,.035);
    border: 1px solid rgba(255,255,255,.07);
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .progress-header div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .progress-header span {
    color: #94a3b8;
    font-size: 11px;
  }

  .progress-header strong:last-child {
    color: #facc15;
  }

  .progress-track {
    height: 9px;
    border-radius: 999px;
    background: #0f172a;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(
      90deg,
      #22c55e,
      #facc15
    );
    transition: width .5s ease;
  }

  .complete-message {
    margin-top: 12px;
    padding: 10px;
    border-radius: 10px;
    background: rgba(34,197,94,.08);
    color: #86efac;
    font-size: 12px;
    text-align: center;
  }

  .exercise-card {
    margin-top: 24px;
    padding: 25px;
    border-radius: 25px;
    background: rgba(255,255,255,.035);
    border: 1px solid rgba(255,255,255,.08);
  }

  .exercise-instruction {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    margin-top: 20px;
    padding: 20px;
    border-radius: 18px;
    background: rgba(255,255,255,.035);
    border: 1px solid rgba(255,255,255,.06);
  }

  .instruction-left {
    flex: 1;
  }

  .instruction-left > span {
    color: #facc15;
    font-size: 9px;
    letter-spacing: 2px;
    font-weight: 900;
  }

  .instruction-left h3 {
    margin: 5px 0;
    font-size: 24px;
  }

  .instruction-left p {
    color: #cbd5e1;
    font-size: 13px;
    line-height: 1.6;
    max-width: 650px;
  }

  .exercise-type-label {
    display: inline-block;
    margin-top: 5px;
    padding: 6px 9px;
    border-radius: 8px;
    background: rgba(167,139,250,.08);
    border: 1px solid rgba(167,139,250,.15);
    color: #c4b5fd;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 1px;
  }

  .exercise-details {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 15px;
  }

  .exercise-details div {
    min-width: 70px;
    text-align: center;
    padding: 8px 10px;
    border-radius: 10px;
    background: rgba(255,255,255,.04);
  }

  .exercise-details strong {
    display: block;
    color: #f8fafc;
    font-size: 15px;
  }

  .exercise-details span {
    color: #64748b;
    font-size: 9px;
    text-transform: uppercase;
  }

  .instruction-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .listen-button,
  .complete-button {
    border-radius: 11px;
    padding: 11px 14px;
    cursor: pointer;
    font-weight: 700;
    white-space: nowrap;
  }

  .listen-button {
    border: 1px solid rgba(167,139,250,.3);
    background: rgba(167,139,250,.08);
    color: #c4b5fd;
  }

  .listen-button.speaking {
    color: #86efac;
    border-color: rgba(34,197,94,.3);
  }

  .complete-button {
    border: 1px solid rgba(250,204,21,.25);
    background: rgba(250,204,21,.08);
    color: #fde68a;
  }

  .complete-button.completed {
    color: #86efac;
    background: rgba(34,197,94,.08);
    border-color: rgba(34,197,94,.3);
  }

  .benefit-box {
    margin-top: 15px;
    padding: 14px;
    border-radius: 13px;
    background: rgba(96,165,250,.05);
    border: 1px solid rgba(96,165,250,.12);
  }

  .benefit-box span {
    color: #93c5fd;
    font-size: 10px;
    font-weight: 800;
  }

  .benefit-box p {
    margin: 5px 0 0;
    color: #94a3b8;
    font-size: 11px;
  }

  .controls {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    margin-top: 18px;
  }

  .controls > button {
    padding: 11px 13px;
    border-radius: 11px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.035);
    color: #cbd5e1;
    cursor: pointer;
  }

  .controls > button:last-child {
    justify-self: end;
  }

  .controls > button:disabled {
    opacity: .3;
    cursor: not-allowed;
  }

  .dots {
    display: flex;
    gap: 6px;
  }

  .dots button {
    width: 7px;
    height: 7px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: #475569;
    cursor: pointer;
  }

  .dots button.active {
    width: 23px;
    background: #facc15;
  }

  .exercise-list {
    margin-top: 25px;
    padding: 24px;
    border-radius: 22px;
    background: rgba(255,255,255,.035);
    border: 1px solid rgba(255,255,255,.08);
  }

  .list-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 15px;
  }

  .list-heading h2 {
    margin: 4px 0 0;
    font-size: 25px;
  }

  .list-heading > span {
    color: #facc15;
    font-weight: 800;
  }

  .exercise-row {
    width: 100%;
    display: grid;
    grid-template-columns: 35px 45px 1fr 30px;
    align-items: center;
    gap: 10px;
    padding: 12px;
    margin-bottom: 7px;
    border-radius: 13px;
    border: 1px solid rgba(255,255,255,.06);
    background: rgba(255,255,255,.025);
    color: #e2e8f0;
    text-align: left;
    cursor: pointer;
  }

  .exercise-row.selected {
    border-color: rgba(250,204,21,.3);
    background: rgba(250,204,21,.05);
  }

  .exercise-row.done {
    border-color: rgba(34,197,94,.2);
  }

  .row-number {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(255,255,255,.06);
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 11px;
    font-weight: 800;
  }

  .done .row-number {
    color: #86efac;
    background: rgba(34,197,94,.1);
  }

  .row-icon {
    font-size: 25px;
  }

  .row-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .row-info strong {
    font-size: 13px;
  }

  .row-info span {
    color: #64748b;
    font-size: 10px;
  }

  .row-arrow {
    color: #64748b;
  }

  .safety-note {
    display: flex;
    gap: 9px;
    margin-top: 18px;
    padding: 12px;
    border-radius: 12px;
    background: rgba(255,255,255,.025);
    color: #64748b;
    font-size: 10px;
    line-height: 1.5;
  }

  .safety-note p {
    margin: 0;
  }

  .loading-screen,
  .error-screen {
    min-height: 80vh;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
    padding: 30px;
  }

  .loading-character {
    font-size: 65px;
  }

  .loading-screen h2,
  .error-screen h2 {
    color: #facc15;
  }

  .loading-screen p,
  .error-screen p {
    color: #64748b;
    max-width: 450px;
  }

  .error-icon {
    font-size: 60px;
  }

  .error-screen button {
    border: 0;
    padding: 12px 18px;
    border-radius: 12px;
    background: #facc15;
    color: #111827;
    font-weight: 800;
    cursor: pointer;
    margin-top: 10px;
  }

  .error-screen .secondary-button {
    background: rgba(255,255,255,.08);
    color: white;
    border: 1px solid rgba(255,255,255,.1);
  }

  .error-banner {
    margin-bottom: 15px;
    padding: 12px;
    border-radius: 12px;
    background: rgba(248,113,113,.08);
    border: 1px solid rgba(248,113,113,.18);
    color: #fca5a5;
    font-size: 12px;
  }

  @media (max-width: 700px) {

    .workout-summary {
      grid-template-columns: 1fr;
    }

    .streak-box {
      padding: 15px;
    }

    .nutrition-context-values {
      grid-template-columns: 1fr;
    }

    .nutrition-adjustment {
      align-items: flex-start;
    }

    .exercise-instruction {
      flex-direction: column;
      align-items: stretch;
    }

    .instruction-actions {
      flex-direction: row;
    }

    .instruction-actions button {
      flex: 1;
    }

    .controls {
      grid-template-columns: 1fr 1fr;
    }

    .dots {
      grid-column: 1 / -1;
      grid-row: 1;
      justify-content: center;
    }

    .controls > button:last-child {
      justify-self: stretch;
    }

    .exercise-row {
      grid-template-columns: 30px 35px 1fr 20px;
    }
  }
`;
