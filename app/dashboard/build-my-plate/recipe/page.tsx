"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CookingAnimation from "../CookingAnimation";

type Step = {
  step: number;
  instruction: string;
  animation_type: string;
};

type Dish = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  cooking_time: number;
  difficulty: string;
  goal_reason: string;
  ingredients: string[];
  steps: Step[];
};

const animationEmoji: Record<string, string> = {
  pour: "🫗",
  add: "🥕",
  sprinkle: "🧂",
  chop: "🔪",
  mix: "🥄",
  heat: "🔥",
  boil: "♨️",
  cook: "🍳",
  fry: "🍳",
  serve: "🍽️",
};

const actionLabel: Record<string, string> = {
  pour: "POUR",
  add: "ADD",
  sprinkle: "SPRINKLE",
  chop: "CHOP",
  mix: "MIX",
  heat: "HEAT",
  boil: "BOIL",
  cook: "COOK",
  fry: "FRY",
  serve: "SERVE",
};

export default function BuildMyPlateRecipePage() {
  const router = useRouter();

  const [dish, setDish] = useState<Dish | null>(null);
  const [eating, setEating] = useState(false);
const [ateThis, setAteThis] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
  const raw = sessionStorage.getItem("dietgenie_selected_dish");

  if (!raw) {
    router.replace("/dashboard/build-my-plate");
    return;
  }

  try {
    const parsedDish = JSON.parse(raw) as Dish;
    queueMicrotask(() => setDish(parsedDish));
  } catch {
    router.replace("/dashboard/build-my-plate");
  }
}, [router]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!dish || !autoPlay || dish.steps.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveStep((current) => {
        if (current >= dish.steps.length - 1) return 0;
        return current + 1;
      });
    }, 6000);

    return () => window.clearInterval(timer);
  }, [dish, autoPlay]);

  const stopVoice = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const speakStep = (instruction: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setError("Voice is not supported by this browser. The animation still works normally.");
      return;
    }

    window.speechSynthesis.cancel();
    if (!instruction.trim()) return;

    const utterance = new SpeechSynthesisUtterance(instruction);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };
  const handleAteThis = async () => {
  if (!dish || eating || ateThis) return;

  setEating(true);

  try {
    const response = await fetch(
      "/api/dashboard/track-build-my-plate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dish,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error || "Unable to save this meal."
      );
    }

    setAteThis(true);
  } catch (error) {
    console.error("I Ate This error:", error);

    alert(
      error instanceof Error
        ? error.message
        : "Unable to save this meal."
    );
  } finally {
    setEating(false);
  }
};

  const goToStep = (index: number) => {
    if (!dish) return;
    const nextIndex = Math.max(0, Math.min(index, dish.steps.length - 1));
    setActiveStep(nextIndex);
    stopVoice();
  };

  if (!dish) {
    return (
      <main className="plate-page">
        <div className="background-glow" />
        <div className="page-container">
          <div className="loading-box">
            <div className="loading-emoji">🍳</div>
            <p>Loading your recipe...</p>
          </div>
        </div>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  const currentStep = dish.steps[activeStep];

  return (
    <main className="plate-page">
      <div className="background-glow" />

      <div className="page-container">
        <section className="recipe-section">
          <div className="recipe-header">
            <button
              onClick={() => {
                stopVoice();
                router.push("/dashboard/build-my-plate/results");
              }}
              className="close-recipe"
              type="button"
            >
              ← Back to dishes
            </button>

            <p className="eyebrow">YOUR RECIPE</p>
            <h2>{dish.name}</h2>
            <p>{dish.goal_reason}</p>
          </div>

          <div className="recipe-stats">
            <div>
              🔥
              <strong>{dish.calories}</strong>
              <span>Calories</span>
            </div>
            <div>
              💪
              <strong>{dish.protein}g</strong>
              <span>Protein</span>
            </div>
            <div>
              🥑
              <strong>{dish.fats}g</strong>
              <span>Fats</span>
            </div>
            <div>
              🍞
              <strong>{dish.carbs}g</strong>
              <span>Carbs</span>
            </div>
          </div>
          <div style={{ textAlign: "center", margin: "20px 0" }}>
  <button
  type="button"
  onClick={handleAteThis}
  disabled={eating || ateThis}
  style={{
    padding: "14px 28px",
    borderRadius: "14px",
    border: "none",
    cursor: eating || ateThis ? "default" : "pointer",
    fontWeight: 700,
    fontSize: "15px",
    background: ateThis ? "#22c55e" : "#a78bfa",
    color: "#020817",
    opacity: eating ? 0.7 : 1,
  }}
>
  {ateThis
    ? "✓ Added to Today's Nutrition"
    : eating
    ? "Saving..."
    : "🍽️ I Ate This"}
</button>
</div>

          <div className="recipe-card">
            <h3>🛒 Ingredients</h3>
            <div className="ingredient-list">
              {dish.ingredients.map((item, index) => (
                <div key={`${item}-${index}`} className="ingredient">
                  <span>✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="recipe-card cooking-card">
            <div className="cooking-title">
              <div>
                <p className="eyebrow">VISUAL COOKING GUIDE</p>
                <h3>🍳 Watch & Cook</h3>
                <p className="cooking-subtitle">
                  Follow the cartoon animation step by step. Voice is completely optional.
                </p>
              </div>
            </div>

            <div className="animation-toolbar">
              <span>🎬 Cartoon guide</span>
              <button
                type="button"
                className={`autoplay-button ${autoPlay ? "enabled" : ""}`}
                onClick={() => setAutoPlay((value) => !value)}
              >
                {autoPlay ? "▶ Auto Play ON" : "⏸ Auto Play OFF"}
              </button>
            </div>

            {/* NEW cartoon animation — see CookingAnimation.tsx */}
            <CookingAnimation
              animationType={currentStep.animation_type}
              emoji={animationEmoji[currentStep.animation_type] || "🍳"}
            />

            <div className="visual-caption">
              <span className="action-pill">
                {actionLabel[currentStep.animation_type] || "COOK"}
              </span>
              <strong>
                Step {currentStep.step} of {dish.steps.length}
              </strong>
            </div>

            <div className="visual-instruction">
              <div className="instruction-content">
                <span className="instruction-label">WHAT TO DO</span>
                <p>{currentStep.instruction}</p>
              </div>

              <button
                className={`listen-button ${isSpeaking ? "speaking" : ""}`}
                onClick={() =>
                  isSpeaking ? stopVoice() : speakStep(currentStep.instruction)
                }
                type="button"
              >
                {isSpeaking ? "⏹ Stop Voice" : "🔊 Listen"}
              </button>
            </div>

            {error && <p className="error">{error}</p>}

            <div className="step-controls">
              <button
                type="button"
                onClick={() => goToStep(activeStep - 1)}
                disabled={activeStep === 0}
              >
                ← Previous
              </button>

              <div className="step-dots">
                {dish.steps.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Go to step ${index + 1}`}
                    className={index === activeStep ? "active" : ""}
                    onClick={() => goToStep(index)}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  goToStep(activeStep === dish.steps.length - 1 ? 0 : activeStep + 1)
                }
              >
                {activeStep === dish.steps.length - 1 ? "Start Again ↻" : "Next →"}
              </button>
            </div>

            <div className="accessibility-note">
              <span>👀</span>
              <span>
                You can follow the animation without reading the full recipe. Tap 🔊
                Listen whenever you want voice guidance.
              </span>
            </div>

            <div className="steps-list">
              {dish.steps.map((step, index) => (
                <button
                  type="button"
                  key={index}
                  className={`mini-step ${index === activeStep ? "selected" : ""}`}
                  onClick={() => goToStep(index)}
                >
                  <span className="mini-step-number">{step.step}</span>
                  <span className="mini-step-icon">
                    {animationEmoji[step.animation_type] || "🍳"}
                  </span>
                  <span className="mini-step-text">{step.instruction}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <style jsx>{pageStyles}</style>
    </main>
  );
}

const pageStyles = `
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
    background: radial-gradient(ellipse 70% 55% at 15% 8%, rgba(91, 33, 182, 0.22), transparent 60%),
      radial-gradient(ellipse 55% 45% at 85% 85%, rgba(6, 78, 59, 0.18), transparent 55%),
      radial-gradient(ellipse 45% 55% at 88% 8%, rgba(161, 128, 0, 0.1), transparent 55%);
  }

  .page-container {
    max-width: 1100px;
    margin: auto;
    position: relative;
    z-index: 1;
  }

  .eyebrow {
    color: #b8860b;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 4px;
    margin: 10px 0;
  }

  .loading-box {
    text-align: center;
    padding: 90px 20px;
  }

  .loading-emoji {
    font-size: 50px;
    animation: cook 1s infinite alternate;
  }

  @keyframes cook {
    from { transform: rotate(-8deg); }
    to { transform: rotate(8deg); }
  }

  .recipe-section {
    margin-top: 10px;
  }

  .recipe-header {
    text-align: center;
    margin-bottom: 30px;
  }

  .close-recipe {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    padding: 10px 16px;
    border-radius: 12px;
    cursor: pointer;
    margin-bottom: 30px;
  }

  .recipe-header h2 {
    font-family: "Cinzel", serif;
    font-size: 34px;
    margin: 5px 0;
  }

  .recipe-header p:not(.eyebrow) {
    color: #94a3b8;
  }

  .recipe-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 25px;
  }

  .recipe-stats div {
    padding: 18px;
    text-align: center;
    border-radius: 15px;
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(255, 255, 255, 0.07);
  }

  .recipe-stats strong {
    display: block;
    font-size: 22px;
    margin-top: 5px;
  }

  .recipe-stats span {
    display: block;
    color: #64748b;
    font-size: 10px;
    margin-top: 3px;
  }

  .recipe-card {
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: 28px;
    backdrop-filter: blur(15px);
    margin-bottom: 25px;
  }

  .recipe-card h3 {
    font-family: "Cinzel", serif;
    margin-top: 0;
  }

  .ingredient-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
  }

  .ingredient {
    padding: 12px;
    background: rgba(255, 255, 255, 0.035);
    border-radius: 10px;
    font-size: 13px;
  }

  .ingredient span {
    color: #facc15;
    margin-right: 8px;
  }

  .cooking-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
  }

  .cooking-subtitle {
    margin: -3px 0 0;
    color: #64748b;
    font-size: 12px;
  }

  .animation-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 18px 0 15px;
    padding: 10px 13px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.025);
    color: #94a3b8;
    font-size: 11px;
  }

  .autoplay-button {
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    color: #94a3b8;
    padding: 8px 11px;
    border-radius: 10px;
    cursor: pointer;
  }

  .autoplay-button.enabled {
    border-color: rgba(74, 222, 128, 0.35);
    color: #86efac;
    background: rgba(74, 222, 128, 0.08);
  }

  .visual-caption {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    margin-top: 14px;
  }

  .action-pill {
    padding: 5px 9px;
    border-radius: 999px;
    background: rgba(255, 215, 0, 0.12);
    color: #fcd34d;
    font-size: 9px;
    letter-spacing: 1.5px;
    font-weight: 800;
  }

  .visual-instruction {
    margin-top: 18px;
    display: flex;
    gap: 15px;
    align-items: center;
    justify-content: space-between;
    padding: 17px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .instruction-content {
    flex: 1;
  }

  .instruction-label {
    color: #b8860b;
    font-size: 9px;
    letter-spacing: 2px;
    font-weight: 800;
  }

  .visual-instruction p {
    margin: 6px 0 0;
    color: #e2e8f0;
    line-height: 1.5;
    font-size: 14px;
  }

  .listen-button {
    flex-shrink: 0;
    border: 1px solid rgba(167, 139, 250, 0.3);
    background: rgba(167, 139, 250, 0.08);
    color: #c4b5fd;
    border-radius: 12px;
    padding: 11px 14px;
    cursor: pointer;
    font-weight: 700;
  }

  .listen-button.speaking {
    background: rgba(74, 222, 128, 0.1);
    border-color: rgba(74, 222, 128, 0.35);
    color: #86efac;
  }

  .error {
    color: #fca5a5;
    margin-top: 12px;
  }

  .step-controls {
    margin-top: 18px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
  }

  .step-controls > button {
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.035);
    color: #cbd5e1;
    padding: 11px 13px;
    border-radius: 12px;
    cursor: pointer;
  }

  .step-controls > button:last-child {
    justify-self: end;
  }

  .step-controls > button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .step-dots {
    display: flex;
    gap: 6px;
    justify-content: center;
  }

  .step-dots button {
    width: 7px;
    height: 7px;
    border: 0;
    padding: 0;
    border-radius: 50%;
    background: #475569;
    cursor: pointer;
  }

  .step-dots button.active {
    width: 22px;
    border-radius: 999px;
    background: #fcd34d;
  }

  .accessibility-note {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 17px;
    padding: 11px 13px;
    border-radius: 12px;
    background: rgba(74, 222, 128, 0.05);
    color: #94a3b8;
    font-size: 11px;
    line-height: 1.4;
  }

  .steps-list {
    margin-top: 20px;
    display: grid;
    gap: 7px;
  }

  .mini-step {
    width: 100%;
    display: grid;
    grid-template-columns: 28px 34px 1fr;
    align-items: center;
    gap: 10px;
    text-align: left;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.025);
    color: #cbd5e1;
    padding: 9px;
    border-radius: 11px;
    cursor: pointer;
  }

  .mini-step.selected {
    border-color: rgba(255, 215, 0, 0.28);
    background: rgba(255, 215, 0, 0.05);
  }

  .mini-step-number {
    width: 25px;
    height: 25px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    font-size: 10px;
    font-weight: 800;
  }

  .mini-step-icon {
    font-size: 22px;
  }

  .mini-step-text {
    font-size: 11px;
    line-height: 1.35;
  }

  @media (max-width: 700px) {
    .animation-toolbar {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }
    .autoplay-button {
      width: 100%;
    }
    .visual-instruction {
      align-items: stretch;
      flex-direction: column;
    }
    .listen-button {
      width: 100%;
    }
    .step-controls {
      grid-template-columns: 1fr 1fr;
    }
    .step-dots {
      grid-column: 1 / -1;
      grid-row: 1;
    }
    .step-controls > button:last-child {
      justify-self: stretch;
    }
    .step-controls > button:first-child {
      width: 100%;
    }
    .recipe-stats {
      grid-template-columns: repeat(2, 1fr);
    }
    .cooking-title {
      align-items: flex-start;
    }
  }
`;
