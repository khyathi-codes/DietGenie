"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function BuildMyPlateResultsPage() {
  const router = useRouter();
  const [dishes, setDishes] = useState<Dish[] | null>(null);

  useEffect(() => {
  const raw = sessionStorage.getItem("dietgenie_dishes");

  if (!raw) {
    // Nobody generated dishes in this session — send them back to start.
    router.replace("/dashboard/build-my-plate");
    return;
  }

  try {
    const parsedDishes = JSON.parse(raw) as Dish[];
    queueMicrotask(() => setDishes(parsedDishes));
  } catch {
    router.replace("/dashboard/build-my-plate");
  }
}, [router]);

  const openDish = (dish: Dish) => {
    sessionStorage.setItem("dietgenie_selected_dish", JSON.stringify(dish));
    router.push("/dashboard/build-my-plate/recipe");
  };

  if (!dishes) {
    return (
      <main className="plate-page">
        <div className="background-glow" />
        <div className="page-container">
          <div className="loading-box">
            <div className="loading-emoji">🍳</div>
            <p>Loading your meals...</p>
          </div>
        </div>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  return (
    <main className="plate-page">
      <div className="background-glow" />

      <div className="page-container">
        <button
          className="back-button"
          onClick={() => router.push("/dashboard/build-my-plate")}
          type="button"
        >
          ← Change ingredients
        </button>

        <section className="results">
          <div className="section-heading">
            <p className="eyebrow">YOUR INGREDIENTS → YOUR MEALS</p>
            <h2>Choose your dish</h2>
          </div>

          <div className="dish-grid">
            {dishes.map((dish, index) => (
              <article className="dish-card" key={`${dish.name}-${index}`}>
                <div className="dish-image">
                  {index === 0 ? "🍛" : index === 1 ? "🥘" : index === 2 ? "🍳" : "🥗"}
                </div>

                <div className="dish-content">
                  <h3>{dish.name}</h3>
                  <p className="goal-reason">✨ {dish.goal_reason}</p>

                  <div className="nutrition">
                    <div>
                      <strong>{dish.calories}</strong>
                      <span>kcal</span>
                    </div>
                    <div>
                      <strong>{dish.protein}g</strong>
                      <span>protein</span>
                    </div>
                    <div>
                      <strong>{dish.carbs}g</strong>
                      <span>carbs</span>
                    </div>
                  </div>

                  <div className="dish-meta">
                    ⏱ {dish.cooking_time} min
                    <span>•</span>
                    {dish.difficulty}
                  </div>

                  <button
                    className="view-button"
                    onClick={() => openDish(dish)}
                    type="button"
                  >
                    View Recipe →
                  </button>
                </div>
              </article>
            ))}
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

  .back-button {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    padding: 10px 16px;
    border-radius: 12px;
    cursor: pointer;
    margin-bottom: 20px;
  }

  .eyebrow {
    color: #b8860b;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 4px;
    margin: 10px 0;
  }

  .section-heading {
    margin: 20px 0 25px;
  }

  .section-heading h2 {
    font-family: "Cinzel", serif;
    font-size: 34px;
    margin: 5px 0;
  }

  .dish-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 18px;
  }

  .dish-card {
    overflow: hidden;
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: transform 0.25s ease;
  }

  .dish-card:hover {
    transform: translateY(-5px);
  }

  .dish-image {
    height: 130px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 65px;
    background: radial-gradient(circle, rgba(255, 215, 0, 0.12), transparent 65%);
  }

  .dish-content {
    padding: 20px;
  }

  .dish-content h3 {
    margin: 0 0 8px;
    font-size: 19px;
  }

  .goal-reason {
    color: #a78bfa;
    font-size: 12px;
    line-height: 1.5;
    min-height: 38px;
  }

  .nutrition {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 18px 0;
  }

  .nutrition div {
    background: rgba(255, 255, 255, 0.04);
    border-radius: 10px;
    padding: 10px;
    text-align: center;
  }

  .nutrition strong {
    display: block;
    font-size: 16px;
  }

  .nutrition span {
    color: #64748b;
    font-size: 9px;
    text-transform: uppercase;
  }

  .dish-meta {
    color: #94a3b8;
    font-size: 11px;
    margin-bottom: 15px;
  }

  .dish-meta span {
    margin: 0 5px;
  }

  .view-button {
    width: 100%;
    border: 1px solid rgba(255, 215, 0, 0.3);
    background: rgba(255, 215, 0, 0.06);
    color: #fcd34d;
    padding: 12px;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 700;
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
    from {
      transform: rotate(-8deg);
    }
    to {
      transform: rotate(8deg);
    }
  }
`;
