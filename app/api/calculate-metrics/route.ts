import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      age,
      gender,
      weight,
      heightCm,
      activity,
      goal,
    } = body;

    // Convert values to numbers
    const ageNum = Number(age);
    const weightKg = Number(weight);
    const height = Number(heightCm);

    // Validate input
    if (
      !Number.isFinite(ageNum) ||
      !Number.isFinite(weightKg) ||
      !Number.isFinite(height) ||
      ageNum <= 0 ||
      weightKg <= 0 ||
      height <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid profile data." },
        { status: 400 }
      );
    }

    // 1. BMI

    const heightM = height / 100;

    const bmi = Number(
      (weightKg / (heightM * heightM)).toFixed(1)
    );

    let bmi_category: string;

    if (bmi < 18.5) {
      bmi_category = "Underweight";
    } else if (bmi < 25) {
      bmi_category = "Normal";
    } else if (bmi < 30) {
      bmi_category = "Overweight";
    } else {
      bmi_category = "Obese";
    }

    // 2. BMR - Mifflin-St Jeor Equation  

    let bmr: number;

    if (gender === "male") {
      bmr =
        10 * weightKg +
        6.25 * height -
        5 * ageNum +
        5;
    } else if (gender === "female") {
      bmr =
        10 * weightKg +
        6.25 * height -
        5 * ageNum -
        161;
    } else {
      // For "other", use average of male and female equations
      const maleBmr =
        10 * weightKg +
        6.25 * height -
        5 * ageNum +
        5;

      const femaleBmr =
        10 * weightKg +
        6.25 * height -
        5 * ageNum -
        161;

      bmr = (maleBmr + femaleBmr) / 2;
    }

    // 3. Activity Multiplier

    const activityFactors: Record<string, number> = {
      inactive: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
    };

    const activityFactor =
      activityFactors[activity] ?? 1.2;

    const maintenanceCalories =
      bmr * activityFactor;

    // 4. Goal-based Calories

    let dailyCalories: number;

    if (goal === "weight_loss") {
      dailyCalories = maintenanceCalories - 500;
    } else if (goal === "weight_gain") {
      dailyCalories = maintenanceCalories + 300;
    } else {
      dailyCalories = maintenanceCalories;
    }

    dailyCalories = Math.max(
      Math.round(dailyCalories),
      gender === "male" ? 1500 : 1200
    );

    // 5. Protein

    let proteinPerKg: number;

    if (goal === "weight_loss") {
      proteinPerKg = 1.6;
    } else if (goal === "weight_gain") {
      proteinPerKg = 1.6;
    } else {
      proteinPerKg = 1.2;
    }

    const protein_g = Math.round(
      weightKg * proteinPerKg
    );

    // 6. Fat
    // 30% of daily calories

    const fatCalories =
      dailyCalories * 0.30;

    const fats_g = Math.round(
      fatCalories / 9
    );

    // 7. Carbohydrates
    // Remaining calories

    const proteinCalories =
      protein_g * 4;

    const fatCaloriesActual =
      fats_g * 9;

    const carbCalories =
      dailyCalories -
      proteinCalories -
      fatCaloriesActual;

    const carbs_g = Math.max(
      0,
      Math.round(carbCalories / 4)
    );

    // 8. Health Goal Message


    let health_goal: string;

    if (goal === "weight_loss") {
      health_goal =
        "Your blueprint focuses on sustainable weight loss while preserving muscle.";
    } else if (goal === "weight_gain") {
      health_goal =
        "Your blueprint focuses on healthy weight gain with adequate protein and calories.";
    } else {
      health_goal =
        "Your blueprint focuses on maintaining your current weight and supporting overall health.";
    }
  
    // 9. Return results
  
    return NextResponse.json({
      bmi,
      bmi_category,
      daily_calories: dailyCalories,
      protein_g,
      carbs_g,
      fats_g,
      health_goal,
    });

  } catch (error) {
    console.error(
      "Metrics calculation error:",
      error
    );

    return NextResponse.json(
      {
        error: "Could not calculate health metrics.",
      },
      {
        status: 500,
      }
    );
  }
}