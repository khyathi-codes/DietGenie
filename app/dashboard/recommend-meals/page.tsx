"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Meal = {
  meal_type: string;
  meal_name: string;
  calories: number;
  protein: number;
  description: string;
};

type FoodAnalysis = {
  food_name?: string;
  calories: number;
  protein: number;
  healthy_insight: string;
  items?: {
    name: string;
    estimated_weight_g: number;
    calories: number;
    protein: number;
  }[];
  total_calories?: number;
  total_protein?: number;
};

type MealAnalysis = {
  type: "text" | "image";
  result: FoodAnalysis;
  preview?: string;
  foodText?: string;
};

const MEAL_EMOJIS: Record<string, string> = {
  Breakfast: "🥣",
  breakfast: "🥣",
  Lunch: "🍱",
  lunch: "🍱",
  Dinner: "🌙",
  dinner: "🌙",
};

export default function RecommendMealsPage() {
  const router = useRouter();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [eaten, setEaten] = useState<Set<string>>(new Set());
  const [swapping, setSwapping] = useState<string | null>(null);

  // Per-meal states
  const [cardTextInput, setCardTextInput] = useState<
    Record<string, string>
  >({});
  const [cardAnalysis, setCardAnalysis] = useState<
    Record<string, MealAnalysis | null>
  >({});
  const [cardAnalyzing, setCardAnalyzing] = useState<
    Record<string, boolean>
  >({});
  const [cardImagePreview, setCardImagePreview] = useState<
    Record<string, string>
  >({});
  const [cardImageData, setCardImageData] = useState<
    Record<string, string>
  >({});

  // Extra food states
  const [showExtra, setShowExtra] = useState(false);
  const [extraText, setExtraText] = useState("");
  const [extraAnalysis, setExtraAnalysis] = useState<MealAnalysis[]>([]);
  const [extraAnalyzing, setExtraAnalyzing] = useState(false);
  const [extraImagePreview, setExtraImagePreview] = useState("");
  const [extraImageData, setExtraImageData] = useState("");

  // Today's nutrition
  const [totalCalories, setTotalCalories] = useState(0);
  const [totalProtein, setTotalProtein] = useState(0);

  // Extra food file input
  const extraFileRef = useRef<HTMLInputElement>(null);

  // ------------------------------------------------------------
  // Safely parse saved analysis
  // ------------------------------------------------------------
const parseAnalysis = (
  analysis: unknown
): FoodAnalysis | null => {
  if (!analysis) return null;

  if (typeof analysis === "string") {
    try {
      return JSON.parse(analysis) as FoodAnalysis;
    } catch {
      return null;
    }
  }

  if (typeof analysis === "object") {
    return analysis as FoodAnalysis;
  }

  return null;
};

  // ------------------------------------------------------------
  // Fetch meals
  // ------------------------------------------------------------

  const fetchMeals = useCallback(async () => {
  setLoading(true);

  try {
    const res = await fetch("/api/dashboard/recommend-meals");

    if (!res.ok) {
      setMeals([]);
      return;
    }

    const data = await res.json();

    setMeals(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Failed to fetch meals:", error);
    setMeals([]);
  } finally {
    setLoading(false);
  }
}, []);

  // ------------------------------------------------------------
  // Generate completely fresh plan
  // ------------------------------------------------------------

  const generateFreshPlan = async () => {
    setGenerating(true);

    try {
      await fetch("/api/dashboard/recommend-meals/reset", {
        method: "POST",
      });

      await fetchMeals();

      // Reset only current meal-card UI states.
      setEaten(new Set());
      setCardAnalysis({});
      setCardTextInput({});
      setCardImagePreview({});
      setCardImageData({});
    } catch (error) {
      console.error("Failed to generate fresh plan:", error);
    } finally {
      setGenerating(false);
    }
  };

  // ------------------------------------------------------------
  // Load today's nutrition
  // ------------------------------------------------------------

  const loadNutrition = async () => {
    try {
      const res = await fetch("/api/dashboard/get-nutrition");

      if (!res.ok) return;

      const data = await res.json();

      setTotalCalories(data.total_calories || 0);
      setTotalProtein(data.total_protein || 0);
    } catch (error) {
      console.error("Failed to load nutrition:", error);
    }
  };

  // ------------------------------------------------------------
  // Load eaten meals
  // ------------------------------------------------------------

  const loadEatenMeals = async () => {
    try {
      const res = await fetch("/api/dashboard/get-eaten-meals");

      if (!res.ok) return;

      const data = await res.json();

      setEaten(new Set(data.meals || []));
    } catch (error) {
      console.error("Failed to load eaten meals:", error);
    }
  };

  // ------------------------------------------------------------
  // Load saved analyses for meal cards
  // ------------------------------------------------------------

  const loadSavedAnalyses = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/get-food-analyses");

      if (!res.ok) return;

      const data = await res.json();

      const records = Array.isArray(data.records)
        ? data.records
        : [];

      const cardData: Record<string, MealAnalysis | null> = {};

      records.forEach((record: {
  action_type?: string;
  meal_type?: string;
  food_text?: string | null;
  analysis?: unknown;
}) => {
        if (
          record.action_type === "replacement_meal" &&
          record.meal_type !== "extra"
        ) {
          const parsed = parseAnalysis(record.analysis);

          if (!parsed) return;

          if (!record.meal_type) return;

cardData[record.meal_type] = {
  type: record.food_text ? "text" : "image",
  result: parsed,
  foodText: record.food_text || undefined
};
        }
      });

      setCardAnalysis(cardData);
    } catch (error) {
      console.error("Failed to load saved analyses:", error);
    }
  }, []);
  // ------------------------------------------------------------
  // Load ALL saved extra foods
  // ------------------------------------------------------------

  const loadExtraFoods = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/get-food-analyses");

      if (!res.ok) return;

      const data = await res.json();

      const records = Array.isArray(data.records)
        ? data.records
        : [];

      const extras = records.filter(
  (record: {
    action_type?: string;
  }) => record.action_type === "extra_food"
);

      if (extras.length === 0) {
        return;
      }

      const restoredExtras: MealAnalysis[] = [];

      extras.forEach((extra: {
  food_text?: string | null;
  analysis?: unknown;
}) => {
        const parsed = parseAnalysis(extra.analysis);

        if (!parsed) return;

        restoredExtras.push({
          type: extra.food_text ? "text" : "image",
          result: parsed,
          foodText: extra.food_text || undefined,
        });
      });

      if (restoredExtras.length > 0) {
        setShowExtra(true);
        setExtraAnalysis(restoredExtras);
      }
    } catch (error) {
      console.error("Failed to load extra foods:", error);
    }
  },[]);

  // ------------------------------------------------------------
  // Initial loading
  // ------------------------------------------------------------

   useEffect(() => {
  const loadPageData = async () => {
    await Promise.resolve();

    await Promise.all([
      fetchMeals(),
      loadNutrition(),
      loadEatenMeals(),
      loadSavedAnalyses(),
      loadExtraFoods(),
    ]);
  };

  void loadPageData();
}, [fetchMeals, loadSavedAnalyses, loadExtraFoods]);

  // ------------------------------------------------------------
  // Swap meal
  // ------------------------------------------------------------

  const swapMeal = async (mealType: string) => {
    setSwapping(mealType);

    try {
      const res = await fetch("/api/dashboard/recommend-meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meal_type: mealType,
        }),
      });

      if (!res.ok) {
  const errorData = await res.json().catch(() => null);

  throw new Error(
    errorData?.error || "Failed to swap meal"
  );
}

      const newMeal = await res.json();

      if (newMeal?.meal_name && !newMeal.error) {
        newMeal.meal_type = mealType;

        setMeals((prev) =>
          prev.map((meal) =>
            meal.meal_type === mealType
              ? newMeal
              : meal
          )
        );

        setCardAnalysis((prev) => ({
          ...prev,
          [mealType]: null,
        }));

        setCardTextInput((prev) => ({
          ...prev,
          [mealType]: "",
        }));

        setCardImagePreview((prev) => ({
          ...prev,
          [mealType]: "",
        }));

        setCardImageData((prev) => ({
          ...prev,
          [mealType]: "",
        }));

        setEaten((prev) => {
          const updated = new Set(prev);
          updated.delete(mealType);
          return updated;
        });
      }
    } catch (error) {
      console.error("Swap meal error:", error);
    } finally {
      setSwapping(null);
    }
  };

  // ------------------------------------------------------------
  // Ate this meal
  // ------------------------------------------------------------

  const handleAte = async (meal: Meal) => {
    if (eaten.has(meal.meal_type)) {
      return;
    }

    setEaten((prev) => {
      const updated = new Set(prev);
      updated.add(meal.meal_type);
      return updated;
    });

    setTotalCalories((prev) => prev + meal.calories);
    setTotalProtein((prev) => prev + meal.protein);

    try {
      await fetch("/api/dashboard/track-meal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meal_type: meal.meal_type,
          calories: meal.calories,
          protein: meal.protein,
          eaten: true,
        }),
      });

      await loadNutrition();
    } catch (error) {
      console.error("Track meal error:", error);
    }
  };

  // ------------------------------------------------------------
  // Convert image to Base64
  // ------------------------------------------------------------

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result as string);
      };

      reader.onerror = reject;

      reader.readAsDataURL(file);
    });

  // ------------------------------------------------------------
  // Per-card image
  // ------------------------------------------------------------

  const handleCardImage = async (
    mealType: string,
    file: File
  ) => {
    try {
      const base64 = await toBase64(file);

      setCardImagePreview((prev) => ({
        ...prev,
        [mealType]: base64,
      }));

      setCardImageData((prev) => ({
        ...prev,
        [mealType]: base64,
      }));
    } catch (error) {
      console.error("Image conversion error:", error);
    }
  };

  // ------------------------------------------------------------
  // Analyze replacement meal
  // ------------------------------------------------------------

  const analyzeCard = async (mealType: string) => {
    const text = cardTextInput[mealType] || "";
    const image = cardImageData[mealType] || "";

    if (!text && !image) {
      return;
    }

    setCardAnalyzing((prev) => ({
      ...prev,
      [mealType]: true,
    }));

    try {
      if (image) {
        const res = await fetch(
          "/api/dashboard/recognize-food",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageBase64: image,
            }),
          }
        );

        if (!res.ok) {
          throw new Error("Image food analysis failed");
        }

        const data: FoodAnalysis = await res.json();

        const calories =
          data.total_calories ??
          data.calories ??
          0;

        const protein =
          data.total_protein ??
          data.protein ??
          0;

        setCardAnalysis((prev) => ({
          ...prev,
          [mealType]: {
            type: "image",
            result: data,
            preview: image,
          },
        }));

        await fetch(
          "/api/dashboard/save-food-analysis",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              meal_type: mealType,
              action_type: "replacement_meal",
              food_text: null,
              calories,
              protein,
              analysis: data,
            }),
          }
        );

        setTotalCalories(
          (prev) => prev + calories
        );

        setTotalProtein(
          (prev) => prev + protein
        );
      } else {
        const res = await fetch(
          "/api/dashboard/analyze-text-meal",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
            }),
          }
        );

        if (!res.ok) {
          throw new Error("Text food analysis failed");
        }

        const data: FoodAnalysis = await res.json();

        setCardAnalysis((prev) => ({
          ...prev,
          [mealType]: {
            type: "text",
            result: data,
            foodText: text,
          },
        }));

        await fetch(
          "/api/dashboard/save-food-analysis",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              meal_type: mealType,
              action_type: "replacement_meal",
              food_text: text,
              calories: data.calories ?? 0,
              protein: data.protein ?? 0,
              analysis: data,
            }),
          }
        );

        setTotalCalories(
          (prev) => prev + (data.calories ?? 0)
        );

        setTotalProtein(
          (prev) => prev + (data.protein ?? 0)
        );
      }

      await loadNutrition();
    } catch (error) {
      console.error(
        "Meal analysis error:",
        error
      );
    } finally {
      setCardAnalyzing((prev) => ({
        ...prev,
        [mealType]: false,
      }));
    }
  };

  // ------------------------------------------------------------
  // Extra food image
  // ------------------------------------------------------------

  const handleExtraImage = async (file: File) => {
    try {
      const base64 = await toBase64(file);

      setExtraImagePreview(base64);
      setExtraImageData(base64);
    } catch (error) {
      console.error(
        "Extra image conversion error:",
        error
      );
    }
  };

  // ------------------------------------------------------------
  // Analyze extra food
  // ------------------------------------------------------------

  const analyzeExtra = async () => {
    if (!extraText && !extraImageData) {
      return;
    }

    setExtraAnalyzing(true);

    try {
      // IMAGE EXTRA FOOD
      if (extraImageData) {
        const res = await fetch(
          "/api/dashboard/recognize-food",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageBase64: extraImageData,
            }),
          }
        );

        if (!res.ok) {
          throw new Error(
            "Unable to analyze extra food image"
          );
        }

        const data: FoodAnalysis = await res.json();

        const calories =
          data.total_calories ??
          data.calories ??
          0;

        const protein =
          data.total_protein ??
          data.protein ??
          0;

        // IMPORTANT:
        // ADD to the existing array.
        // DO NOT replace it.
        setExtraAnalysis((prev) => [
          ...prev,
          {
            type: "image",
            result: data,
            preview: extraImageData,
          },
        ]);

        await fetch(
          "/api/dashboard/save-food-analysis",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              meal_type: "extra",
              action_type: "extra_food",
              food_text: null,
              calories,
              protein,
              analysis: data,
            }),
          }
        );

        setTotalCalories(
          (prev) => prev + calories
        );

        setTotalProtein(
          (prev) => prev + protein
        );
      }

      // TEXT EXTRA FOOD
      else {
        const textToSave = extraText.trim();

        const res = await fetch(
          "/api/dashboard/analyze-text-meal",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: textToSave,
            }),
          }
        );

        if (!res.ok) {
          throw new Error(
            "Unable to analyze extra food"
          );
        }

        const data: FoodAnalysis = await res.json();

        const calories = data.calories ?? 0;
        const protein = data.protein ?? 0;

        // IMPORTANT:
        // ADD to existing foods.
        setExtraAnalysis((prev) => [
          ...prev,
          {
            type: "text",
            result: data,
            foodText: textToSave,
          },
        ]);

        await fetch(
          "/api/dashboard/save-food-analysis",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              meal_type: "extra",
              action_type: "extra_food",
              food_text: textToSave,
              calories,
              protein,
              analysis: data,
            }),
          }
        );

        setTotalCalories(
          (prev) => prev + calories
        );

        setTotalProtein(
          (prev) => prev + protein
        );
      }

      // Clear only the CURRENT input.
      // Previously analyzed foods remain.
      setExtraText("");
      setExtraImagePreview("");
      setExtraImageData("");

      await loadNutrition();
    } catch (error) {
      console.error(
        "Extra food analysis error:",
        error
      );
    } finally {
      setExtraAnalyzing(false);
    }
  };

  // ------------------------------------------------------------
  // PAGE
  // ------------------------------------------------------------

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Raleway:wght@300;400;500;600;700&display=swap');

        .mp-wrap {
          min-height:100vh;
          background:#020817;
          color:#e2e8f0;
          font-family:'Raleway',sans-serif;
          padding:40px 24px 160px;
        }

        .mp-bg {
          position:fixed;
          inset:0;
          z-index:0;
          pointer-events:none;
          background:
            radial-gradient(
              ellipse 70% 50% at 15% 8%,
              rgba(91,33,182,0.2) 0%,
              transparent 60%
            ),
            radial-gradient(
              ellipse 55% 45% at 85% 85%,
              rgba(6,78,59,0.16) 0%,
              transparent 55%
            ),
            radial-gradient(
              ellipse 45% 55% at 88% 8%,
              rgba(161,128,0,0.08) 0%,
              transparent 55%
            );
        }

        .mp-inner {
          position:relative;
          z-index:1;
          max-width:1100px;
          margin:0 auto;
        }

        .mp-title {
          font-family:'Cinzel',serif;
          font-size:clamp(24px,3.5vw,38px);
          font-weight:700;
          background:
            linear-gradient(
              135deg,
              #ffd700 0%,
              #fff8dc 40%,
              #daa520 70%,
              #ffd700 100%
            );
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          background-clip:text;
          margin-bottom:6px;
        }

        .mp-sub {
          font-size:14px;
          color:rgba(148,163,184,0.7);
          margin-bottom:36px;
        }

        .mp-topbar {
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom:32px;
          flex-wrap:wrap;
          gap:12px;
        }

        .meals-grid {
          display:grid;
          grid-template-columns:
            repeat(auto-fit,minmax(300px,1fr));
          gap:20px;
          margin-bottom:36px;
        }

        .meal-card {
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,215,0,0.12);
          border-radius:20px;
          padding:24px;
          position:relative;
          overflow:hidden;
          backdrop-filter:blur(12px);
          transition:
            border-color 0.25s,
            box-shadow 0.25s;
        }

        .meal-card:hover {
          border-color:rgba(255,215,0,0.28);
          box-shadow:
            0 0 32px rgba(255,215,0,0.07);
        }

        .meal-card::before {
          content:'';
          position:absolute;
          top:0;
          left:0;
          right:0;
          height:1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255,215,0,0.4),
              transparent
            );
        }

        .meal-type-badge {
          font-family:'Cinzel',serif;
          font-size:10px;
          font-weight:600;
          letter-spacing:3px;
          text-transform:uppercase;
          color:rgba(255,215,0,0.6);
          margin-bottom:8px;
        }

        .meal-name {
          font-size:18px;
          font-weight:700;
          color:#f1f5f9;
          margin-bottom:8px;
        }

        .meal-desc {
          font-size:12px;
          color:rgba(148,163,184,0.6);
          line-height:1.6;
          margin-bottom:14px;
        }

        .meal-stats {
          display:flex;
          gap:16px;
          margin-bottom:16px;
        }

        .meal-stat {
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:10px;
          padding:8px 14px;
          text-align:center;
        }

        .meal-stat-val {
          font-family:'Cinzel',serif;
          font-size:16px;
          font-weight:600;
        }

        .meal-stat-lbl {
          font-size:10px;
          color:rgba(148,163,184,0.55);
          letter-spacing:1.5px;
          text-transform:uppercase;
        }

        .btn-gold {
          font-family:'Raleway',sans-serif;
          font-size:12px;
          font-weight:600;
          letter-spacing:1px;
          background:
            linear-gradient(135deg,#ffd700,#ffa500);
          color:#160800;
          border:none;
          border-radius:10px;
          padding:10px 18px;
          cursor:pointer;
          transition:
            opacity 0.2s,
            transform 0.15s;
          white-space:nowrap;
        }

        .btn-gold:hover {
          opacity:0.9;
          transform:translateY(-1px);
        }

        .btn-gold:disabled {
          opacity:0.5;
          cursor:default;
          transform:none;
        }

        .btn-ghost {
          font-family:'Raleway',sans-serif;
          font-size:12px;
          font-weight:500;
          background:rgba(255,255,255,0.05);
          color:rgba(200,185,255,0.8);
          border:1px solid rgba(255,255,255,0.1);
          border-radius:10px;
          padding:10px 18px;
          cursor:pointer;
          transition:background 0.2s;
          white-space:nowrap;
        }

        .btn-ghost:hover {
          background:rgba(255,255,255,0.09);
        }

        .btn-eaten {
          font-family:'Raleway',sans-serif;
          font-size:12px;
          font-weight:600;
          background:rgba(74,222,128,0.12);
          color:#4ade80;
          border:1px solid rgba(74,222,128,0.3);
          border-radius:10px;
          padding:10px 18px;
          cursor:default;
          white-space:nowrap;
        }

        .btn-swap {
          font-family:'Raleway',sans-serif;
          font-size:12px;
          font-weight:500;
          background:rgba(56,189,248,0.08);
          color:#38bdf8;
          border:1px solid rgba(56,189,248,0.25);
          border-radius:10px;
          padding:10px 18px;
          cursor:pointer;
          transition:background 0.2s;
          white-space:nowrap;
        }

        .btn-swap:hover {
          background:rgba(56,189,248,0.15);
        }

        .btn-swap:disabled {
          opacity:0.4;
          cursor:default;
        }

        .didnt-eat-section {
          margin-top:16px;
          padding-top:14px;
          border-top:
            1px solid rgba(255,255,255,0.06);
        }

        .didnt-eat-label {
          font-size:11px;
          color:rgba(148,163,184,0.5);
          margin-bottom:10px;
        }

        .food-input {
          width:100%;
          padding:10px 14px;
          border-radius:10px;
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.1);
          color:#f1f5f9;
          font-family:'Raleway',sans-serif;
          font-size:13px;
          outline:none;
          box-sizing:border-box;
          margin-bottom:10px;
          transition:border-color 0.2s;
        }

        .food-input:focus {
          border-color:rgba(255,215,0,0.4);
        }

        .food-input::placeholder {
          color:rgba(148,163,184,0.35);
        }

        .image-upload-area {
          border:
            1px dashed rgba(255,255,255,0.15);
          border-radius:10px;
          padding:12px;
          text-align:center;
          cursor:pointer;
          margin-bottom:10px;
          transition:border-color 0.2s;
          font-size:12px;
          color:rgba(148,163,184,0.5);
        }

        .image-upload-area:hover {
          border-color:rgba(255,215,0,0.3);
          color:rgba(255,215,0,0.6);
        }

        .img-preview {
          width:100%;
          border-radius:10px;
          margin-bottom:10px;
          max-height:140px;
          object-fit:cover;
        }

        .analysis-box {
          background:rgba(255,215,0,0.04);
          border:
            1px solid rgba(255,215,0,0.15);
          border-radius:12px;
          padding:14px;
          margin-top:12px;
        }

        .analysis-title {
          font-family:'Cinzel',serif;
          font-size:11px;
          letter-spacing:2px;
          color:rgba(255,215,0,0.7);
          margin-bottom:8px;
          text-transform:uppercase;
        }

        .analysis-food {
          font-size:14px;
          font-weight:600;
          color:#f1f5f9;
          margin-bottom:6px;
        }

        .analysis-stats {
          display:flex;
          gap:10px;
          margin-bottom:8px;
          flex-wrap:wrap;
        }

        .analysis-stat {
          background:rgba(255,255,255,0.04);
          border-radius:8px;
          padding:6px 12px;
          font-size:12px;
          color:#a78bfa;
        }

        .analysis-insight {
          font-size:11px;
          color:rgba(148,163,184,0.6);
          line-height:1.5;
          font-style:italic;
        }

        .img-item {
          font-size:12px;
          color:rgba(200,185,255,0.75);
          padding:4px 0;
          border-bottom:
            1px solid rgba(255,255,255,0.05);
        }

        .img-item:last-child {
          border-bottom:none;
        }

        .extra-section {
          background:rgba(255,255,255,0.025);
          border:
            1px dashed rgba(255,215,0,0.2);
          border-radius:20px;
          padding:24px;
          margin-bottom:32px;
        }

        .extra-title {
          font-family:'Cinzel',serif;
          font-size:15px;
          color:rgba(255,215,0,0.8);
          margin-bottom:16px;
        }

        .gen-btn {
          font-family:'Cinzel',serif;
          font-size:12px;
          font-weight:700;
          letter-spacing:2px;
          background:
            linear-gradient(135deg,#ffd700,#ffa500);
          color:#160800;
          border:none;
          border-radius:50px;
          padding:12px 28px;
          cursor:pointer;
          box-shadow:
            0 0 20px rgba(255,180,0,0.4);
          transition:
            opacity 0.2s,
            transform 0.15s;
        }

        .gen-btn:hover {
          opacity:0.9;
          transform:translateY(-2px);
        }

        .gen-btn:disabled {
          opacity:0.5;
          cursor:default;
          transform:none;
        }

        .sticky-bottom {
          position:fixed;
          bottom:0;
          left:0;
          right:0;
          z-index:50;
          background:rgba(2,8,23,0.92);
          backdrop-filter:blur(20px);
          border-top:
            1px solid rgba(255,215,0,0.12);
          padding:16px 32px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
        }

        .bottom-label {
          font-size:10px;
          letter-spacing:2px;
          text-transform:uppercase;
          color:rgba(148,163,184,0.5);
          margin-bottom:4px;
        }

        .bottom-stats {
          font-family:'Cinzel',serif;
          font-size:18px;
          font-weight:600;
          color:#ffd700;
        }

        .bottom-stats span {
          color:rgba(167,139,250,0.9);
          margin-left:12px;
        }

        .spinner {
          display:inline-block;
          width:16px;
          height:16px;
          border:
            2px solid rgba(255,215,0,0.2);
          border-top-color:#ffd700;
          border-radius:50%;
          animation:spin 0.7s linear infinite;
          vertical-align:middle;
        }

        @keyframes spin {
          to {
            transform:rotate(360deg);
          }
        }

        .gold-divider {
          height:1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255,215,0,0.2),
              transparent
            );
          margin:28px 0;
        }

        .back-btn {
          display:inline-flex;
          align-items:center;
          gap:6px;
          font-size:13px;
          color:rgba(148,163,184,0.55);
          background:none;
          border:none;
          cursor:pointer;
          font-family:'Raleway',sans-serif;
          padding:0;
          transition:color 0.2s;
          margin-bottom:40px;
        }

        .back-btn:hover {
          color:rgba(255,215,0,0.7);
        }

        @media (max-width:600px) {
          .mp-wrap {
            padding-left:14px;
            padding-right:14px;
          }

          .sticky-bottom {
            padding:12px 16px;
          }

          .bottom-stats {
            font-size:14px;
          }

          .bottom-label {
            font-size:8px;
          }

          .gen-btn {
            padding:10px 16px;
          }
        }
      `}</style>

      <div className="mp-wrap">
        <div className="mp-bg" />

        <div className="mp-inner">

          {/* HEADER */}

          <h1 className="mp-title">
            🍽️ Meal Planner For You!!
          </h1>

          <p className="mp-sub">
            Personalised meals crafted for your goals
            & preferences
          </p>

          {/* TOP BAR */}

          <div className="mp-topbar">
            <div
              style={{
                fontSize:13,
                color:"rgba(148,163,184,0.6)",
              }}
            >
              {!loading &&
                meals.length > 0 &&
                `${meals.length} meals planned for today`}
            </div>

            <button
              className="gen-btn"
              onClick={generateFreshPlan}
              disabled={generating}
            >
              {generating ? (
                <>
                  <span
                    className="spinner"
                    style={{ marginRight:8 }}
                  />
                  Generating…
                </>
              ) : (
                "✨ Generate New Plan"
              )}
            </button>
          </div>

          {/* MEAL CARDS */}

          {loading ? (
            <div
              style={{
                textAlign:"center",
                padding:"60px 0",
                color:"rgba(148,163,184,0.5)",
              }}
            >
              <div
                className="spinner"
                style={{
                  width:36,
                  height:36,
                  borderWidth:3,
                  margin:"0 auto 16px",
                }}
              />

              <p
                style={{
                  fontFamily:"'Cinzel',serif",
                  fontSize:12,
                  letterSpacing:3,
                }}
              >
                Crafting your perfect plan…
              </p>
            </div>
          ) : meals.length === 0 ? (
            <div
              style={{
                textAlign:"center",
                padding:"60px 0",
                color:"rgba(148,163,184,0.5)",
              }}
            >
              <p style={{ marginBottom:16 }}>
                No meals generated yet.
              </p>

              <button
                className="gen-btn"
                onClick={generateFreshPlan}
              >
                ✨ Generate Plan
              </button>
            </div>
          ) : (
            <div className="meals-grid">
              {meals.map((meal) => {
                const isEaten =
                  eaten.has(meal.meal_type);

                const isSwapping =
                  swapping === meal.meal_type;

                const analysis =
                  cardAnalysis[meal.meal_type] ?? null;

                const analyzing =
                  cardAnalyzing[meal.meal_type] ?? false;

                const preview =
                  cardImagePreview[meal.meal_type] ?? "";

                const textVal =
                  cardTextInput[meal.meal_type] ?? "";

                const emoji =
                  MEAL_EMOJIS[meal.meal_type] ??
                  "🍽️";

                const inputId =
                  `img-${meal.meal_type}`;

                return (
                  <div
                    key={meal.meal_type}
                    className="meal-card"
                  >
                    <p className="meal-type-badge">
                      {emoji} {meal.meal_type}
                    </p>

                    <p className="meal-name">
                      {meal.meal_name}
                    </p>

                    <p className="meal-desc">
                      {meal.description}
                    </p>

                    <div className="meal-stats">
                      <div className="meal-stat">
                        <div
                          className="meal-stat-val"
                          style={{ color:"#a78bfa" }}
                        >
                          {meal.calories}
                        </div>

                        <div className="meal-stat-lbl">
                          kcal
                        </div>
                      </div>

                      <div className="meal-stat">
                        <div
                          className="meal-stat-val"
                          style={{ color:"#4ade80" }}
                        >
                          {meal.protein}g
                        </div>

                        <div className="meal-stat-lbl">
                          protein
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display:"flex",
                        gap:8,
                        flexWrap:"wrap",
                      }}
                    >
                      {isEaten ? (
                        <span className="btn-eaten">
                          ✓ Eaten
                        </span>
                      ) : (
                        <button
                          className="btn-gold"
                          onClick={() =>
                            handleAte(meal)
                          }
                        >
                          ✓ Ate This
                        </button>
                      )}

                      <button
                        className="btn-swap"
                        onClick={() =>
                          swapMeal(
                            meal.meal_type
                          )
                        }
                        disabled={isSwapping}
                      >
                        {isSwapping ? (
                          <>
                            <span
                              className="spinner"
                              style={{
                                marginRight:6,
                              }}
                            />
                            Swapping…
                          </>
                        ) : (
                          "🔄 Swap Meal"
                        )}
                      </button>
                    </div>

                    {/* DIDN'T EAT */}

                    <div className="didnt-eat-section">
                      <p className="didnt-eat-label">
                        Didn&apos;t eat this? Tell us
                        what you had:
                      </p>

                      <input
                        className="food-input"
                        placeholder="e.g. 2 Masala Dosas…"
                        value={textVal}
                        onChange={(e) =>
                          setCardTextInput(
                            (prev) => ({
                              ...prev,
                              [meal.meal_type]:
                                e.target.value,
                            })
                          )
                        }
                      />

                      <input
                        type="file"
                        accept="image/*"
                        id={inputId}
                        style={{ display:"none" }}
                        onChange={async (e) => {
                          const file =
                            e.target.files?.[0];

                          if (file) {
                            await handleCardImage(
                              meal.meal_type,
                              file
                            );
                          }
                        }}
                      />

                      {preview ? (
  <Image
    src={preview}
    width={800}
    height={400}
    unoptimized
    className="img-preview"
    alt="Food preview"
  />
) : (
                        <label
                          htmlFor={inputId}
                          className="image-upload-area"
                          style={{
                            display:"block",
                          }}
                        >
                          📸 Upload Food Photo
                        </label>
                      )}

                      <div
                        style={{
                          display:"flex",
                          gap:8,
                        }}
                      >
                        <button
                          className="btn-gold"
                          disabled={
                            analyzing ||
                            (!textVal &&
                              !cardImageData[
                                meal.meal_type
                              ])
                          }
                          onClick={() =>
                            analyzeCard(
                              meal.meal_type
                            )
                          }
                          style={{ flex:1 }}
                        >
                          {analyzing ? (
                            <>
                              <span
                                className="spinner"
                                style={{
                                  marginRight:6,
                                }}
                              />
                              Analyzing…
                            </>
                          ) : (
                            "🔍 Analyze"
                          )}
                        </button>

                        {(preview || textVal) && (
                          <button
                            className="btn-ghost"
                            onClick={() => {
                              setCardTextInput(
                                (prev) => ({
                                  ...prev,
                                  [meal.meal_type]:
                                    "",
                                })
                              );

                              setCardImagePreview(
                                (prev) => ({
                                  ...prev,
                                  [meal.meal_type]:
                                    "",
                                })
                              );

                              setCardImageData(
                                (prev) => ({
                                  ...prev,
                                  [meal.meal_type]:
                                    "",
                                })
                              );

                              setCardAnalysis(
                                (prev) => ({
                                  ...prev,
                                  [meal.meal_type]:
                                    null,
                                })
                              );
                            }}
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {analysis && (
                        <div className="analysis-box">
                          <p className="analysis-title">
                            Analysis Result
                          </p>

                          {analysis.type ===
                            "image" &&
                          analysis.result.items ? (
                            <>
                              {analysis.result.items.map(
                                (item, index) => (
                                  <div
                                    key={index}
                                    className="img-item"
                                  >
                                    {item.name} —{" "}
                                    {
                                      item.estimated_weight_g
                                    }g —{" "}
                                    {item.calories} kcal —{" "}
                                    {item.protein}g protein
                                  </div>
                                )
                              )}

                              <div
                                className="analysis-stats"
                                style={{
                                  marginTop:8,
                                }}
                              >
                                <span className="analysis-stat">
                                  ⚡{" "}
                                  {analysis.result
                                    .total_calories ??
                                    analysis.result
                                      .calories ??
                                    0}{" "}
                                  kcal
                                </span>

                                <span className="analysis-stat">
                                  💪{" "}
                                  {analysis.result
                                    .total_protein ??
                                    analysis.result
                                      .protein ??
                                    0}
                                  g protein
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="analysis-food">
                                {analysis.foodText ||
                                  analysis.result
                                    .food_name ||
                                  "Food"}
                              </p>

                              <div className="analysis-stats">
                                <span className="analysis-stat">
                                  ⚡{" "}
                                  {analysis.result
                                    .calories ??
                                    0}{" "}
                                  kcal
                                </span>

                                <span className="analysis-stat">
                                  💪{" "}
                                  {analysis.result
                                    .protein ??
                                    0}
                                  g protein
                                </span>
                              </div>
                            </>
                          )}

                          {analysis.result
                            .healthy_insight && (
                            <p className="analysis-insight">
                              {
                                analysis.result
                                  .healthy_insight
                              }
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="gold-divider" />

          {/* =====================================================
              EXTRA FOOD
          ===================================================== */}

          <div className="extra-section">
            <p className="extra-title">
              🍴 Ate Anything Extra Today?
            </p>

            <div
              style={{
                display:"flex",
                gap:10,
                marginBottom:
                  showExtra ? 20 : 0,
              }}
            >
              <button
                className="btn-gold"
                onClick={() =>
                  setShowExtra(true)
                }
              >
                Yes
              </button>

              <button
                className="btn-ghost"
                onClick={() => {
                  setShowExtra(false);
                  setExtraText("");
                  setExtraImagePreview("");
                  setExtraImageData("");

                  // Array must be cleared with [].
                  setExtraAnalysis([]);
                }}
              >
                No
              </button>
            </div>

            {showExtra && (
              <div>
                <input
                  className="food-input"
                  placeholder="e.g. Paneer Butter Masala + 3 Rotis…"
                  value={extraText}
                  onChange={(e) =>
                    setExtraText(e.target.value)
                  }
                />

                {/* EXTRA FOOD IMAGE */}

                <input
                  type="file"
                  accept="image/*"
                  ref={extraFileRef}
                  style={{ display:"none" }}
                  onChange={async (e) => {
                    const file =
                      e.target.files?.[0];

                    if (file) {
                      await handleExtraImage(file);
                    }

                    // Allow selecting same file again.
                    e.currentTarget.value = "";
                  }}
                />

                {extraImagePreview ? (
  <Image
    src={extraImagePreview}
    width={800}
    height={400}
    unoptimized
    className="img-preview"
    alt="Extra food"
  />
) : (
                  <div
                    className="image-upload-area"
                    onClick={() =>
                      extraFileRef.current?.click()
                    }
                  >
                    📸 Upload Food Photo
                  </div>
                )}

                <div
                  style={{
                    display:"flex",
                    gap:8,
                  }}
                >
                  <button
                    className="btn-gold"
                    disabled={
                      extraAnalyzing ||
                      (!extraText &&
                        !extraImageData)
                    }
                    onClick={analyzeExtra}
                    style={{ flex:1 }}
                  >
                    {extraAnalyzing ? (
                      <>
                        <span
                          className="spinner"
                          style={{
                            marginRight:6,
                          }}
                        />
                        Analyzing…
                      </>
                    ) : (
                      "🔍 Analyze"
                    )}
                  </button>

                  {/* CLEAR ONLY CURRENT INPUT */}

                  {(extraImagePreview ||
                    extraText) && (
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        setExtraText("");
                        setExtraImagePreview("");
                        setExtraImageData("");
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* =================================================
                    ALL SAVED EXTRA FOODS
                ================================================= */}

                {extraAnalysis.length > 0 && (
                  <div
                    className="analysis-box"
                    style={{ marginTop:14 }}
                  >
                    <p className="analysis-title">
                      Extra Food Analysis
                    </p>

                    {extraAnalysis.map(
                      (extra, index) => (
                        <div
                          key={index}
                          style={{
                            padding:"12px 0",
                            borderBottom:
                              index !==
                              extraAnalysis.length - 1
                                ? "1px solid rgba(255,255,255,0.08)"
                                : "none",
                          }}
                        >
                          {/* IMAGE FOOD */}

                          {extra.type === "image" &&
                          extra.result.items ? (
                            <>
                              {extra.result.items.map(
                                (
                                  item,
                                  itemIndex
                                ) => (
                                  <div
                                    key={itemIndex}
                                    className="img-item"
                                  >
                                    {item.name} —{" "}
                                    {
                                      item.estimated_weight_g
                                    }g —{" "}
                                    {item.calories} kcal —{" "}
                                    {item.protein}g
                                    protein
                                  </div>
                                )
                              )}

                              <div
                                className="analysis-stats"
                                style={{
                                  marginTop:8,
                                }}
                              >
                                <span className="analysis-stat">
                                  ⚡{" "}
                                  {extra.result
                                    .total_calories ??
                                    extra.result
                                      .calories ??
                                    0}{" "}
                                  kcal
                                </span>

                                <span className="analysis-stat">
                                  💪{" "}
                                  {extra.result
                                    .total_protein ??
                                    extra.result
                                      .protein ??
                                    0}{" "}
                                  g protein
                                </span>
                              </div>
                            </>
                          ) : (
                            /* TEXT FOOD */

                            <>
                              <p className="analysis-food">
                                {extra.foodText ||
                                  extra.result
                                    .food_name ||
                                  "Extra food"}
                              </p>

                              <div className="analysis-stats">
                                <span className="analysis-stat">
                                  ⚡{" "}
                                  {extra.result
                                    .calories ??
                                    0}{" "}
                                  kcal
                                </span>

                                <span className="analysis-stat">
                                  💪{" "}
                                  {extra.result
                                    .protein ??
                                    0}
                                  g protein
                                </span>
                              </div>
                            </>
                          )}

                          {extra.result
                            .healthy_insight && (
                            <p className="analysis-insight">
                              {
                                extra.result
                                  .healthy_insight
                              }
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BACK BUTTON */}

          <button
            className="back-btn"
            onClick={() =>
              router.push("/dashboard")
            }
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* STICKY BOTTOM */}

        <div className="sticky-bottom">
          <div>
            <p className="bottom-label">
              📊 Today&apos;s Consumption
            </p>

            <p className="bottom-stats">
              {totalCalories} kcal

              <span>
                {totalProtein}g Protein
              </span>
            </p>
          </div>

          <button
            className="gen-btn"
            onClick={fetchMeals}
            disabled={generating}
            style={{
              fontSize:11,
              padding:"10px 20px",
            }}
          >
            {generating ? (
              <span className="spinner" />
            ) : (
              "✨ New Plan"
            )}
          </button>
        </div>
      </div>
    </>
  );
}