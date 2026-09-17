"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";

const supabase = createBrowserClient();

type Profile = {
  id: string;
  full_name: string | null;
  age: number | null;
  gender: string | null;

  fitness_goal: string | null;
  special_track: string | null;

  height_cm: number | null;
  weight_kg: number | null;

  has_bp: boolean;
  has_diabetes: boolean;
  has_thyroid: boolean;

  activity_level: string | null;
  diet_type: string | null;
  cuisine_preference: string | null;
  budget_tier: string | null;

  bmi: number | null;
  calorie_target: number | null;
  protein_target: number | null;
  carbs_target: number | null;
  fats_target: number | null;
};

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const fitnessGoalOptions = [
  { value: "maintain_weight", label: "Maintain Weight" },
  { value: "weight_loss", label: "Weight Loss" },
  { value: "weight_gain", label: "Weight Gain" },
];

const activityOptions = [
  { value: "inactive", label: "Inactive" },
  { value: "lightly_active", label: "Lightly Active" },
  { value: "moderately_active", label: "Moderately Active" },
  { value: "very_active", label: "Very Active" },
];

const dietOptions = [
  { value: "veg", label: "Vegetarian" },
  { value: "non_veg", label: "Non-Vegetarian" },
  { value: "both", label: "Vegetarian + Non-Vegetarian" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "vegan", label: "Vegan" },
];

const regionOptions = [
  { value: "north_indian", label: "North Indian" },
  { value: "south_indian", label: "South Indian" },
  { value: "other", label: "Other" },
];

const budgetOptions = [
  { value: "budget", label: "Budget" },
  { value: "balanced", label: "Balanced" },
  { value: "premium", label: "Premium" },
];

const specialTrackOptions = [
  { value: "gym", label: "Gym & Fitness" },
  { value: "pcos/pmos", label: "PCOS / PMOS" },
  { value: "pregnancy", label: "Pregnancy" },
  { value: "senior", label: "Senior" },
];

export default function UserProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [originalProfile, setOriginalProfile] =
    useState<Profile | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      };
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setProfile(data);
        setOriginalProfile(data);
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
  const loadProfile = async () => {
    await fetchProfile();
  };

  loadProfile();
}, []);

 const updateField = <K extends keyof Profile>(
  field: K,
  value: Profile[K]
) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            [field]: value,
          }
        : prev
    );
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You are not logged in.");
      }

      const heightCm = Number(profile.height_cm);
      const weightKg = Number(profile.weight_kg);
      const age = Number(profile.age);

      if (!age || age <= 0) {
        throw new Error("Please enter a valid age.");
      }

      if (!heightCm || heightCm <= 0) {
        throw new Error("Please enter a valid height.");
      }

      if (!weightKg || weightKg <= 0) {
        throw new Error("Please enter a valid weight.");
      }

      if (!profile.gender) {
        throw new Error("Please select your gender.");
      }

      if (!profile.fitness_goal) {
        throw new Error("Please select your fitness goal.");
      }

      if (!profile.activity_level) {
        throw new Error("Please select your activity level.");
      }

      if (!profile.diet_type) {
        throw new Error("Please select your diet type.");
      }

      if (!profile.cuisine_preference) {
        throw new Error("Please select your regional cuisine.");
      }

      if (!profile.budget_tier) {
        throw new Error("Please select your budget tier.");
      }

      /*
       * Recalculate BMI and nutrition targets
       */
      const response = await fetch(
        "/api/calculate-metrics",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            age,
            gender: profile.gender,
            weight: weightKg,
            heightCm,
            activity: profile.activity_level,
            goal: profile.fitness_goal,
            bp: profile.has_bp,
            sugar: profile.has_diabetes,
            thyroid: profile.has_thyroid,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Could not recalculate your health metrics."
        );
      }

      const metrics = await response.json();

      const updates = {
        full_name: profile.full_name || null,
        age,
        gender: profile.gender,

        fitness_goal: profile.fitness_goal,
        special_track:
          profile.special_track || null,

        height_cm: heightCm,
        weight_kg: weightKg,

        has_bp: profile.has_bp,
        has_diabetes: profile.has_diabetes,
        has_thyroid: profile.has_thyroid,

        activity_level: profile.activity_level,
        diet_type: profile.diet_type,
        cuisine_preference:
          profile.cuisine_preference,
        budget_tier: profile.budget_tier,

        bmi: metrics.bmi,
        calorie_target:
          metrics.daily_calories,
        protein_target:
          metrics.protein_g,
        carbs_target:
          metrics.carbs_g,
        fats_target:
          metrics.fats_g,
      };

      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error(
          "SUPABASE UPDATE ERROR:",
          error
        );

        throw new Error(error.message);
      }

      setProfile(data);
      setOriginalProfile(data);
      setEditMode(false);

      alert(
        "Profile updated successfully! 🎉"
      );
    } catch (error: unknown) {
  console.error(
    "SAVE PROFILE ERROR:",
    error
  );

  alert(
    error instanceof Error
      ? error.message
      : "Could not update your profile."
  );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (originalProfile) {
      setProfile(originalProfile);
    }

    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="p-10 text-white">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-10 text-white">
        Profile not found. Please complete onboarding.
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10 text-white">
      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold">
              My Profile
            </h1>

            <p className="text-gray-400 mt-1">
              View and manage your Diet Genie information
            </p>
          </div>

          {!editMode ? (
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 transition"
            >
              ✏️ Edit Profile
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="px-5 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 transition disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "💾 Save Changes"}
              </button>
            </div>
          )}
        </div>

        {/* PERSONAL */}
        <ProfileSection title="👤 Personal Information">

          <ProfileField
            label="Full Name"
            value={profile.full_name}
            editing={editMode}
            onChange={(value) =>
              updateField("full_name", value)
            }
          />

          <ProfileField
            label="Age"
            value={profile.age}
            editing={editMode}
            type="number"
            onChange={(value) =>
              updateField(
                "age",
                value === ""
                  ? null
                  : Number(value)
              )
            }
          />

          <SelectField
            label="Gender"
            value={profile.gender}
            editing={editMode}
            options={genderOptions}
            onChange={(value) =>
              updateField("gender", value)
            }
          />

        </ProfileSection>

        {/* FITNESS */}
        <ProfileSection title="🎯 Fitness">

          <SelectField
            label="Fitness Goal"
            value={profile.fitness_goal}
            editing={editMode}
            options={fitnessGoalOptions}
            onChange={(value) =>
              updateField(
                "fitness_goal",
                value
              )
            }
          />

          <SelectField
            label="Special Track"
            value={profile.special_track}
            editing={editMode}
            options={specialTrackOptions}
            allowEmpty
            onChange={(value) =>
              updateField(
                "special_track",
                value || null
              )
            }
          />

        </ProfileSection>

        {/* BODY */}
        <ProfileSection title="📏 Body Measurements">

          <ProfileField
            label="Height (cm)"
            value={profile.height_cm}
            editing={editMode}
            type="number"
            onChange={(value) =>
              updateField(
                "height_cm",
                value === ""
                  ? null
                  : Number(value)
              )
            }
          />

          <ProfileField
            label="Weight (kg)"
            value={profile.weight_kg}
            editing={editMode}
            type="number"
            onChange={(value) =>
              updateField(
                "weight_kg",
                value === ""
                  ? null
                  : Number(value)
              )
            }
          />

          <ProfileField
            label="BMI"
            value={
              profile.bmi
                ? Number(profile.bmi).toFixed(1)
                : null
            }
            editing={false}
          />

        </ProfileSection>

        {/* HEALTH */}
        <ProfileSection title="🩺 Health Information">

          <ToggleField
            label="High Blood Pressure"
            value={Boolean(profile.has_bp)}
            editing={editMode}
            onChange={(value) =>
              updateField(
                "has_bp",
                value
              )
            }
          />

          <ToggleField
            label="Diabetes / Sugar"
            value={Boolean(
              profile.has_diabetes
            )}
            editing={editMode}
            onChange={(value) =>
              updateField(
                "has_diabetes",
                value
              )
            }
          />

          <ToggleField
            label="Thyroid"
            value={Boolean(
              profile.has_thyroid
            )}
            editing={editMode}
            onChange={(value) =>
              updateField(
                "has_thyroid",
                value
              )
            }
          />

        </ProfileSection>

        {/* LIFESTYLE */}
        <ProfileSection title="🏃 Lifestyle & Diet">

          <SelectField
            label="Activity Level"
            value={profile.activity_level}
            editing={editMode}
            options={activityOptions}
            onChange={(value) =>
              updateField(
                "activity_level",
                value
              )
            }
          />

          <SelectField
            label="Diet Type"
            value={profile.diet_type}
            editing={editMode}
            options={dietOptions}
            onChange={(value) =>
              updateField(
                "diet_type",
                value
              )
            }
          />

          <SelectField
            label="Regional Cuisine"
            value={
              profile.cuisine_preference
            }
            editing={editMode}
            options={regionOptions}
            onChange={(value) =>
              updateField(
                "cuisine_preference",
                value
              )
            }
          />

          <SelectField
            label="Budget Tier"
            value={profile.budget_tier}
            editing={editMode}
            options={budgetOptions}
            onChange={(value) =>
              updateField(
                "budget_tier",
                value
              )
            }
          />

        </ProfileSection>

        {/* NUTRITION */}
        <ProfileSection title="🧮 Nutrition Targets">

          <ProfileField
            label="Daily Calories"
            value={
              profile.calorie_target
                ? `${Math.round(
                    Number(
                      profile.calorie_target
                    )
                  )} kcal`
                : null
            }
            editing={false}
          />

          <ProfileField
            label="Protein Target"
            value={
              profile.protein_target
                ? `${Math.round(
                    Number(
                      profile.protein_target
                    )
                  )} g`
                : null
            }
            editing={false}
          />

          <ProfileField
            label="Carbohydrate Target"
            value={
              profile.carbs_target
                ? `${Math.round(
                    Number(
                      profile.carbs_target
                    )
                  )} g`
                : null
            }
            editing={false}
          />

          <ProfileField
            label="Fat Target"
            value={
              profile.fats_target
                ? `${Math.round(
                    Number(
                      profile.fats_target
                    )
                  )} g`
                : null
            }
            editing={false}
          />

        </ProfileSection>

      </div>
    </div>
  );
}


/* =========================================================
   COMPONENTS
========================================================= */

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6">

      <h2 className="text-xl font-semibold mb-5">
        {title}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {children}
      </div>

    </div>
  );
}


function ProfileField({
  label,
  value,
  editing,
  type = "text",
  onChange,
}: {
  label: string;
  value: string | number | null;
  editing: boolean;
  type?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">
        {label}
      </label>

      {editing && onChange ? (
        <input
          type={type}
          value={
            value === null ||
            value === undefined
              ? ""
              : value
          }
          onChange={(e) =>
            onChange(e.target.value)
          }
          className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-white outline-none focus:border-purple-500"
        />
      ) : (
        <div className="rounded-xl bg-black/20 border border-white/5 px-4 py-3">
          {value !== null &&
          value !== undefined &&
          value !== ""
            ? value
            : "Not provided"}
        </div>
      )}
    </div>
  );
}


function SelectField({
  label,
  value,
  editing,
  options,
  onChange,
  allowEmpty = false,
}: {
  label: string;
  value: string | null;
  editing: boolean;
  options: {
    value: string;
    label: string;
  }[];
  onChange: (value: string) => void;
  allowEmpty?: boolean;
}) {
  const displayValue =
    options.find(
      (option) =>
        option.value === value
    )?.label ||
    value ||
    "Not provided";

  if (!editing) {
    return (
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          {label}
        </label>

        <div className="rounded-xl bg-black/20 border border-white/5 px-4 py-3">
          {displayValue}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">
        {label}
      </label>

      <select
        value={value || ""}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-white outline-none focus:border-purple-500"
      >
        {allowEmpty && (
          <option value="">
            None
          </option>
        )}

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-gray-900"
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}


function ToggleField({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: boolean;
  editing: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">
        {label}
      </label>

      {editing ? (
        <button
          type="button"
          onClick={() =>
            onChange(!value)
          }
          className={`w-full rounded-xl px-4 py-3 text-left border transition ${
            value
              ? "bg-purple-600/20 border-purple-500"
              : "bg-black/20 border-white/10"
          }`}
        >
          {value ? "Yes" : "No"}
        </button>
      ) : (
        <div className="rounded-xl bg-black/20 border border-white/5 px-4 py-3">
          {value ? "Yes" : "No"}
        </div>
      )}
    </div>
  );
}