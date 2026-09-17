"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";

const supabase = createBrowserClient();
const TOTAL_STEPS = 5;

type Gender        = "male" | "female" | "other";
type ActivityLevel = "inactive" | "lightly_active" | "moderately_active" | "very_active";
type DietType      = "veg" | "non_veg" | "both" | "eggetarian" | "vegan";
type Region        = "north_indian" | "south_indian" | "other";
type Budget        = "budget" | "balanced" | "premium";
type FitnessGoal   = "maintain_weight" | "weight_loss" | "weight_gain";
type SpecialTrack  = "gym" | "pcos/pmos" | "pregnancy" | "senior";

interface FormData {
  name: string;
  age: string;
  gender: Gender | "";
  fitness_goal: FitnessGoal | "";
  special_track: SpecialTrack | "";
  height: string;
  heightUnit: "cm" | "ft";
  weight: string;
  bp: boolean;
  sugar: boolean;
  thyroid: boolean;
  activity_level: ActivityLevel | "";
  diet_type: DietType | "";
  region: Region | "";
  budget: Budget | "";
}

type UpdateField = <K extends keyof FormData>(
  key: K,
  value: FormData[K]
) => void;

interface Metrics {
  bmi: number;
  bmi_category: string;
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  health_goal: string;
}

function convertFeetToCm(feetStr: string): number {
  const num = parseFloat(feetStr);
  if (isNaN(num)) return 170;
  if (feetStr.includes(".") || feetStr.includes("'")) {
    const parts = feetStr.replace("'", ".").split(".");
    const ft = parseInt(parts[0]) || 0;
    const inch = parseInt(parts[1]) || 0;
    return Math.round((ft * 12 + inch) * 2.54);
  }
  return Math.round(num * 30.48);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "'Cinzel', serif", fontSize: ".6rem", letterSpacing: ".4em",
      color: "rgba(255,200,80,.45)", textTransform: "uppercase", marginBottom: ".85rem",
    }}>{children}</p>
  );
}

function TextInput({ label, type = "text", value, onChange, unit, placeholder, disabled }: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; unit?: string; placeholder?: string; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div style={{ position: "relative", flex: 1 }}>
      <div style={{
        position: "relative", borderRadius: 11,
        border: `1px solid ${focused ? "rgba(255,200,80,.58)" : "rgba(255,255,255,.09)"}`,
        background: focused ? "rgba(255,200,80,.032)" : "rgba(255,255,255,.025)",
        boxShadow: focused ? "0 0 0 1px rgba(255,200,80,.11), 0 0 20px rgba(255,180,0,.06)" : "none",
        transition: "all .2s", opacity: disabled ? .5 : 1,
      }}>
        <label style={{
          position: "absolute", left: 14, top: lifted ? 6 : "50%",
          transform: lifted ? "translateY(0) scale(.72)" : "translateY(-50%)",
          transformOrigin: "left center", fontFamily: "'Raleway', sans-serif", fontSize: ".88rem",
          color: focused ? "rgba(255,200,80,.85)" : "rgba(180,160,255,.45)",
          transition: "all .2s cubic-bezier(.4,0,.2,1)", pointerEvents: "none",
          letterSpacing: ".04em", zIndex: 10,
        }}>{label}</label>
        <input
          suppressHydrationWarning
          type={type} value={value} disabled={disabled}
          placeholder={placeholder || ""}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            display: "block", width: "100%", paddingTop: 24, paddingBottom: 8,
            paddingLeft: 14, paddingRight: unit ? 38 : 14,
            background: "transparent", border: "none", outline: "none",
            fontFamily: "'Raleway', sans-serif", fontSize: ".92rem",
            color: disabled ? "rgba(228,218,255,.5)" : "#FFFFFF",
            letterSpacing: ".03em", boxSizing: "border-box", opacity: 1,
          }}
        />
        {unit && (
          <span style={{
            position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)",
            fontFamily: "'Raleway', sans-serif", fontSize: ".72rem",
            color: "rgba(160,140,220,.45)", letterSpacing: ".06em",
          }}>{unit}</span>
        )}
      </div>
    </div>
  );
}

function PillSelector<T extends string>({ options, value, onChange, disabled }: {
  options: { value: T; label: string; icon?: string }[];
  value: T | ""; onChange: (v: T | "") => void; disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <button key={o.value} type="button" disabled={disabled}
            onClick={() => { if (!disabled) onChange(active ? "" : o.value); }}
            style={{
              fontFamily: "'Raleway', sans-serif", fontSize: ".78rem",
              fontWeight: active ? 600 : 400, letterSpacing: ".06em",
              color: active ? (disabled ? "rgba(22,8,0,.6)" : "#160800") : "rgba(200,185,255,.7)",
              background: active ? "linear-gradient(135deg,#FFD700,#FFA500)" : "rgba(255,255,255,.04)",
              border: active ? "1px solid rgba(255,200,80,.6)" : "1px solid rgba(255,255,255,.09)",
              padding: ".48rem 1.1rem", borderRadius: 50,
              cursor: disabled ? "not-allowed" : "pointer",
              boxShadow: active && !disabled ? "0 0 14px rgba(255,180,0,.45)" : "none",
              transition: "all .2s ease", whiteSpace: "nowrap", outline: "none",
              opacity: disabled && !active ? .35 : 1,
            }}>
            {o.icon && <span style={{ marginRight: ".32rem" }}>{o.icon}</span>}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleChip({ label, icon, checked, onChange, disabled }: {
  label: string; icon: string; checked: boolean;
  onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!checked)} style={{
      display: "flex", alignItems: "center", gap: ".42rem",
      fontFamily: "'Raleway', sans-serif", fontSize: ".78rem",
      fontWeight: checked ? 600 : 400, letterSpacing: ".06em",
      color: checked ? "#160800" : "rgba(200,185,255,.65)",
      background: checked ? "linear-gradient(135deg,rgba(255,200,80,.9),rgba(255,140,0,.9))" : "rgba(255,255,255,.04)",
      border: checked ? "1px solid rgba(255,200,80,.6)" : "1px solid rgba(255,255,255,.09)",
      padding: ".48rem 1rem", borderRadius: 50,
      cursor: disabled ? "default" : "pointer",
      boxShadow: checked ? "0 0 14px rgba(255,180,0,.4)" : "none",
      transition: "all .2s ease", outline: "none", opacity: disabled ? .55 : 1,
    }}>
      <span>{icon}</span>
      {label}
      {checked && (
        <svg width="11" height="11" viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
          <path d="M2 6l3 3 5-5" stroke="#160800" strokeWidth="2" fill="none"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".55rem" }}>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: ".58rem", letterSpacing: ".35em", color: "rgba(255,200,80,.45)" }}>
          STEP {step} OF {total}
        </span>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: ".58rem", letterSpacing: ".25em", color: "rgba(255,200,80,.4)" }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 3, borderRadius: 4, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 4, width: `${pct}%`,
          background: "linear-gradient(90deg,#FFD700,#FFA500)",
          boxShadow: "0 0 8px rgba(255,180,0,.6)",
          transition: "width .5s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
    </div>
  );
}

function GoldButton({ loading, disabled, children, onClick }: {
  loading?: boolean; disabled?: boolean; children: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <div style={{
        position: "absolute", inset: -2, borderRadius: 54,
        background: "conic-gradient(from 0deg,transparent 0%,#FFD700 25%,transparent 50%,#00FFFF 75%,transparent 100%)",
        animation: "btn-spin 3s linear infinite", opacity: .48, zIndex: 0,
      }} />
      <button type="button" disabled={disabled || loading} onClick={onClick} style={{
        position: "relative", zIndex: 1, width: "100%",
        display: "flex", alignItems: "center", justifyContent: "center", gap: ".6rem",
        fontFamily: "'Cinzel', serif", fontSize: ".9rem", fontWeight: 700, letterSpacing: ".22em",
        color: disabled || loading ? "rgba(22,8,0,.5)" : "#160800",
        background: "linear-gradient(135deg,#FFD700 0%,#FFF8DC 28%,#FFD700 52%,#FFA500 78%,#FFD700 100%)",
        backgroundSize: "260% 260%", border: "none", padding: "1rem", borderRadius: 52,
        cursor: disabled || loading ? "default" : "pointer",
        boxShadow: "0 0 26px rgba(255,180,0,.65), 0 0 60px rgba(255,130,0,.38), inset 0 1px 0 rgba(255,255,200,.5)",
        opacity: disabled || loading ? .72 : 1, transition: "opacity .2s",
      }}>
        {loading ? "Saving parameters..." : children}
      </button>
    </div>
  );
}

function NavButtons({ step, onPrev, onNext, canNext, aiLoading }: {
  step: number; onPrev: () => void; onNext: () => void; canNext: boolean; aiLoading?: boolean;
}) {
  return (
    <div style={{
      display: "flex", gap: ".75rem", marginTop: "2rem",
      justifyContent: step === 1 ? "flex-end" : "space-between",
    }}>
      {step > 1 && !aiLoading && (
        <button type="button" onClick={onPrev} style={{
          fontFamily: "'Cinzel', serif", fontSize: ".72rem", letterSpacing: ".2em",
          color: "rgba(200,180,255,.55)", background: "rgba(255,255,255,.04)",
          border: "1px solid rgba(255,255,255,.09)", padding: ".72rem 1.6rem",
          borderRadius: 50, cursor: "pointer", outline: "none", transition: "all .2s",
        }}>Back</button>
      )}
      {step < TOTAL_STEPS && (
        <button type="button" onClick={onNext} disabled={!canNext} style={{
          fontFamily: "'Cinzel', serif", fontSize: ".72rem", letterSpacing: ".2em",
          color: canNext ? "#160800" : "rgba(160,140,200,.4)",
          background: canNext ? "linear-gradient(135deg,#FFD700,#FFA500)" : "rgba(255,255,255,.04)",
          border: "none", padding: ".72rem 2rem", borderRadius: 50,
          cursor: canNext ? "pointer" : "default", outline: "none",
          boxShadow: canNext ? "0 0 18px rgba(255,180,0,.5)" : "none",
          transition: "all .2s ease",
        }}>Continue</button>
      )}
    </div>
  );
}

function Step1({ data, update, isExistingUser }: {
  data: FormData; update: UpdateField; isExistingUser: boolean;
}) {
  const currentAge = parseInt(data.age) || 0;
  const trackOptions: { value: SpecialTrack; label: string; icon: string }[] = [];
  if (currentAge >= 60) {
    trackOptions.push({ value: "senior", label: "Senior Citizen Track", icon: "🧘" });
  } else {
    trackOptions.push({ value: "gym", label: "Gym Training", icon: "💪" });
    if (data.gender === "female") {
      trackOptions.push({ value: "pcos/pmos", label: "PCOS Management", icon: "🌸" });
      trackOptions.push({ value: "pregnancy", label: "Pregnancy Care", icon: "🤰" });
    }
  }
  useEffect(() => {
  if (currentAge >= 60 && data.special_track !== "senior") {
    update("special_track", "senior");
  } else if (currentAge < 60 && data.special_track === "senior") {
    update("special_track", "");
  }
}, [currentAge, data.special_track, update]);
  return (
    <div>
      <SectionLabel>Basic Information</SectionLabel>
      <div style={{ marginBottom: "1.2rem" }}>
        <TextInput label="Your full name" value={data.name} onChange={v => update("name", v)}
          placeholder="e.g. Priya Sharma" disabled={isExistingUser} />
      </div>
      <div style={{ display: "flex", gap: ".75rem", marginBottom: "1.2rem" }}>
        <TextInput label="Age" type="number" value={data.age} onChange={v => update("age", v)}
          unit="yrs" placeholder="25" disabled={isExistingUser} />
      </div>
      <div style={{ marginBottom: "1.4rem" }}>
        <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: ".75rem", color: "rgba(180,160,255,.5)", letterSpacing: ".06em", marginBottom: ".6rem" }}>Gender</p>
        <PillSelector<Gender>
          value={data.gender} disabled={isExistingUser}
          onChange={v => {
            update("gender", v);
            if (v !== "female" && (data.special_track === "pcos/pmos" || data.special_track === "pregnancy"))
              update("special_track", "");
          }}
          options={[
            { value: "male", label: "Male", icon: "♂" },
            { value: "female", label: "Female", icon: "♀" },
            { value: "other", label: "Other", icon: "⚧" },
          ]}
        />
      </div>
      <div style={{ marginBottom: "1.4rem" }}>
        <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: ".75rem", color: "rgba(180,160,255,.5)", letterSpacing: ".06em", marginBottom: ".6rem" }}>Core Focus Target</p>
        <PillSelector<FitnessGoal>
          value={data.fitness_goal} onChange={v => update("fitness_goal", v)}
          options={[
            { value: "weight_loss", label: "Weight Loss", icon: "📉" },
            { value: "maintain_weight", label: "Maintain Weight", icon: "⚖️" },
            { value: "weight_gain", label: "Weight Gain", icon: "📈" },
          ]}
        />
      </div>
      {trackOptions.length > 0 && (
        <div style={{ marginBottom: "1.4rem" }}>
          <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: ".75rem", color: "rgba(180,160,255,.5)", letterSpacing: ".06em", marginBottom: ".6rem" }}>Tailored Track</p>
          <PillSelector<SpecialTrack>
            value={data.special_track} onChange={v => update("special_track", v)}
            options={trackOptions} disabled={currentAge >= 60}
          />
        </div>
      )}
    </div>
  );
}
function Step2({ data, update }: { data: FormData; update: UpdateField }) {
  return (
    <div>
      <SectionLabel>Body Measurements</SectionLabel>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: ".5rem" }}>
        <button type="button"
          onClick={() => update("heightUnit", data.heightUnit === "cm" ? "ft" : "cm")}
          style={{
            background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,200,80,.3)",
            borderRadius: "6px", color: "#FFD700", padding: ".2rem .6rem",
            fontSize: ".7rem", fontFamily: "'Raleway', sans-serif", cursor: "pointer",
          }}>
          Unit: {data.heightUnit.toUpperCase()} (Switch)
        </button>
      </div>
      <div style={{ display: "flex", gap: ".75rem", marginBottom: "1.2rem" }}>
        <TextInput
          label={
  data.heightUnit === "cm"
    ? "Height"
    : "Height (e.g. 5'7)"
}
          type="text" value={data.height} onChange={v => update("height", v)}
          unit={data.heightUnit} placeholder={
  data.heightUnit === "cm"
    ? "170"
    : "5'7"
}
        />
        <TextInput label="Weight" type="number" value={data.weight}
          onChange={v => update("weight", v)} unit="kg" placeholder="70" />
      </div>
    </div>
  );
}
function Step3({ data, update }: { data: FormData; update: UpdateField }) {

  return (
    <div>
      <SectionLabel>Medical Factors</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem", marginBottom: "1.8rem" }}>
        <ToggleChip label="High Blood Pressure" icon="🩺" checked={data.bp} onChange={v => update("bp", v)} />
        <ToggleChip label="Diabetes / Sugar" icon="🍬" checked={data.sugar} onChange={v => update("sugar", v)} />
        <ToggleChip label="Thyroid Imbalance" icon="🦋" checked={data.thyroid} onChange={v => update("thyroid", v)} />
      </div>
      <SectionLabel>Activity Level</SectionLabel>
      <PillSelector<ActivityLevel>
        value={data.activity_level} onChange={v => update("activity_level", v)}
        options={[
          { value: "inactive", label: "Inactive", icon: "🛋" },
          { value: "lightly_active", label: "Light (1-3 days/wk)", icon: "🚶" },
          { value: "moderately_active", label: "Moderate (3-5 days/wk)", icon: "🏃" },
          { value: "very_active", label: "Very Active (6+ days/wk)", icon: "🏋️" },
        ]}
      />
    </div>
  );
}
function Step4({ data, update }: { data: FormData; update: UpdateField }) {
  return (
    <div>
      <SectionLabel>Dietary Profile</SectionLabel>
      <div style={{ marginBottom: "1.6rem" }}>
        <PillSelector<DietType>
          value={data.diet_type} onChange={v => update("diet_type", v)}
          options={[
  { value: "veg", label: "Vegetarian", icon: "🥦" },
  { value: "non_veg", label: "Non-Veg", icon: "🍗" },
  { value: "both", label: "Both", icon: "🍽" },
  { value: "eggetarian", label: "Eggetarian", icon: "🥚" },
  { value: "vegan", label: "Vegan", icon: "🌱" },
]}
        />
      </div>
      <SectionLabel>Regional Cuisine</SectionLabel>
      <div style={{ marginBottom: "1.6rem" }}>
        <PillSelector<Region>
          value={data.region} onChange={v => update("region", v)}
          options={[
            { value: "north_indian", label: "North Indian", icon: "🫓" },
            { value: "south_indian", label: "South Indian", icon: "🍛" },
            { value: "other", label: "Other / Global", icon: "🌏" },
          ]}
        />
      </div>
      <SectionLabel>Monthly Budget</SectionLabel>
      <PillSelector<Budget>
        value={data.budget} onChange={v => update("budget", v)}
        options={[
          { value: "budget", label: "Budget", icon: "💰" },
          { value: "balanced", label: "Standard", icon: "💳" },
          { value: "premium", label: "Premium", icon: "💎" },
        ]}
      />
    </div>
  );
}

function Step5({ data, metrics, onSubmit, loading, aiLoading }: {
  data: FormData; metrics: Metrics | null;
  onSubmit: () => void; loading: boolean; aiLoading: boolean;
}) {
  const displayHeight = data.heightUnit === "ft" ? `${data.height} ft` : `${data.height} cm`;
  if (aiLoading || !metrics) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
        <span style={{ fontSize: "2.5rem", display: "inline-block" }}>🤖</span>
        <h3 style={{ fontFamily: "'Cinzel', serif", color: "#FFD700", marginTop: "1rem", fontSize: "1rem", letterSpacing: ".15em" }}>
          Consulting DietGenie AI…
        </h3>
        <p style={{ fontFamily: "'Raleway', sans-serif", color: "rgba(200,185,255,.6)", fontSize: ".82rem", marginTop: ".5rem" }}>
          Calculating your personalised blueprint…
        </p>
      </div>
    );
  }
  const rows: [string, string][] = [
  ["Name", data.name],
  ["Age / Gender", `${data.age} yrs · ${data.gender}`],
  ["Goal", data.fitness_goal.replace(/_/g, " ")],
  ["Special Track", data.special_track || "None"],
  ["Height / Weight", `${displayHeight} · ${data.weight} kg`],
  ["BMI", `${metrics.bmi} (${metrics.bmi_category})`],
  ["Activity Level", data.activity_level.replace(/_/g, " ")],
  ["Diet Type", data.diet_type],
  ["Regional Cuisine", data.region.replace(/_/g, " ")],
  ["Budget", data.budget],
  [
    "Health Conditions",
    [
      data.bp ? "High BP" : "",
      data.sugar ? "Diabetes" : "",
      data.thyroid ? "Thyroid" : "",
    ]
      .filter(Boolean)
      .join(", ") || "None",
  ],
  ["Calorie Target", `${metrics.daily_calories} kcal / day`],
  ["Protein Target", `${metrics.protein_g} g / day`],
  ["Carbohydrate Target", `${metrics.carbs_g} g / day`],
  ["Fat Target", `${metrics.fats_g} g / day`],
];
  return (
    <div>
      <SectionLabel>Your AI Health Blueprint</SectionLabel>
      <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", overflow: "hidden", marginBottom: "1.5rem" }}>
        {rows.map(([k, v], i) => (
          <div key={k} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: ".6rem 1rem",
            borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none",
            background: i % 2 === 0 ? "rgba(255,255,255,.018)" : "transparent",
          }}>
            <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: ".72rem", color: "rgba(160,140,220,.52)", textTransform: "uppercase" }}>{k}</span>
            <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: ".8rem", fontWeight: 500, color: "rgba(220,210,255,.85)", textTransform: "capitalize" }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ background: "linear-gradient(135deg,rgba(255,200,80,.08),rgba(255,130,0,.06))", border: "1px solid rgba(255,200,80,.2)", borderRadius: 12, padding: "1rem 1.2rem", marginBottom: "1.8rem", display: "flex", alignItems: "center", gap: ".75rem" }}>
        <span style={{ fontSize: "1.5rem" }}>🧞</span>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: ".98rem", fontStyle: "italic", color: "rgba(255,200,80,.88)", margin: 0 }}>
          {metrics.health_goal}
        </p>
      </div>
      <GoldButton loading={loading} disabled={loading} onClick={onSubmit}>
        Let&apos;s Go!
      </GoldButton>
    </div>
  );
}

function canProceed(step: number, data: FormData): boolean {
  if (step === 1) return data.name.trim().length >= 2 && !!data.age && !!data.gender && !!data.fitness_goal;
  if (step === 2) return !!data.height && !!data.weight;
  if (step === 3) return !!data.activity_level;
  if (step === 4) return !!data.diet_type && !!data.region && !!data.budget;
  return true;
}

function StarCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    type S = { x: number; y: number; r: number; a: number; da: number };
    let stars: S[] = [], raf: number;
    const build = (w: number, h: number) => {
      stars = Array.from({ length: 120 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.3 + .1, a: Math.random(),
        da: (Math.random() * .004 + .001) * (Math.random() > .5 ? 1 : -1),
      }));
    };
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; build(c.width, c.height); };
    resize(); window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const s of stars) {
        s.a += s.da; if (s.a > 1 || s.a < .04) s.da *= -1;
        ctx.save(); ctx.globalAlpha = Math.max(.04, s.a);
        ctx.fillStyle = "#fff"; ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep]                     = useState(1);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [loading, setLoading]               = useState(false);
  const [aiLoading, setAiLoading]           = useState(false);
  const [aiMetrics, setAiMetrics]           = useState<Metrics | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "", age: "", gender: "", fitness_goal: "", special_track: "",
    height: "", heightUnit: "cm", weight: "", bp: false, sugar: false, thyroid: false,
    activity_level: "", diet_type: "", region: "", budget: "",
  });
  useEffect(() => {
    const fetchExistingProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (!profile) return;

        setFormData({
          name: profile.full_name || "", age: profile.age ? String(profile.age) : "",
          gender: profile.gender || "", fitness_goal: profile.fitness_goal || "",
          special_track: profile.special_track || "", height: profile.height_cm ? String(profile.height_cm) : "",
          heightUnit: "cm", weight: profile.weight_kg ? String(profile.weight_kg) : "",
          bp: profile.has_bp || false, sugar: profile.has_diabetes || false,
          thyroid: profile.has_thyroid || false, activity_level: profile.activity_level || "",
          diet_type: profile.diet_type || "", region: profile.cuisine_preference || "",
          budget: profile.budget_tier || "",
        });

        // ✅ FIX 1: If onboarding is already completed, go straight to dashboard
        if (profile.onboarding_completed) {
          router.push("/dashboard");
          return;
        }

        if (profile.bmi && profile.calorie_target && profile.protein_target) {
          setAiMetrics({
  bmi: profile.bmi,
  bmi_category:
    profile.bmi >= 30
      ? "Obese"
      : profile.bmi >= 25
      ? "Overweight"
      : profile.bmi < 18.5
      ? "Underweight"
      : "Normal",

  daily_calories: profile.calorie_target,
  protein_g: profile.protein_target,
  carbs_g: profile.carbs_target,
  fats_g: profile.fats_target,

  health_goal: profile.fitness_goal
    ? `Focusing on ${profile.fitness_goal.replace(/_/g, " ")}.`
    : "",
});
        }

        if (profile.full_name) {
          setIsExistingUser(true);
          setStep(5);
        } else {
          const stepParam = searchParams.get("step");
          if (stepParam) setStep(parseInt(stepParam, 10));
        }
      } catch (e) { console.error(e); }
    };
    fetchExistingProfile();
    }, [router, searchParams]);
  useEffect(() => {
    if (step === 5 && !aiMetrics) {
      const run = async () => {
        setAiLoading(true);

        try {
          const heightCm =
            formData.heightUnit === "ft"
              ? convertFeetToCm(formData.height)
              : parseFloat(formData.height);

          const res = await fetch("/api/calculate-metrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              age: formData.age,
              gender: formData.gender,
              weight: formData.weight,
              heightCm,
              activity: formData.activity_level,
              goal: formData.fitness_goal,
              bp: formData.bp,
              sugar: formData.sugar,
              thyroid: formData.thyroid,
            }),
          });

          if (!res.ok) throw new Error("API error");

          setAiMetrics(await res.json());
        } catch {
          alert("Could not calculate metrics. Please go back and try again.");
          setStep(4);
        } finally {
          setAiLoading(false);
        }
      };

      run();
    }
  }, [
    step,
    aiMetrics,
    formData.heightUnit,
    formData.height,
    formData.age,
    formData.gender,
    formData.weight,
    formData.activity_level,
    formData.fitness_goal,
    formData.bp,
    formData.sugar,
    formData.thyroid,
  ]);
  const updateField: UpdateField = (key, value) =>
  setFormData(prev => ({ ...prev, [key]: value }));

  const handleNext = () => { if (canProceed(step, formData)) setStep(p => p + 1); };
  const handlePrev = () => { if (step === 5) setAiMetrics(null); setStep(p => Math.max(1, p - 1)); };

  const handleSubmit = async () => {
    if (!aiMetrics) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const rawHeightCm = formData.heightUnit === "ft"
        ? convertFeetToCm(formData.height)
        : parseFloat(formData.height);

      // ✅ FIX 2: upsert instead of update — works even if row has no data yet
       const { error } = await supabase.from("profiles").upsert({
  id: user.id,
  full_name: formData.name,
  age: parseInt(formData.age),
  gender: formData.gender,
  fitness_goal: formData.fitness_goal,
  special_track: formData.special_track || null,
  height_cm: rawHeightCm,
  weight_kg: parseFloat(formData.weight),
  has_bp: formData.bp,
  has_diabetes: formData.sugar,
  has_thyroid: formData.thyroid,
  activity_level: formData.activity_level,
  diet_type: formData.diet_type,
  cuisine_preference: formData.region,
  budget_tier: formData.budget,
  bmi: aiMetrics.bmi,
  calorie_target: aiMetrics.daily_calories,
  protein_target: aiMetrics.protein_g,
  carbs_target: aiMetrics.carbs_g,
  fats_target: aiMetrics.fats_g,
  onboarding_completed: true,
}, { onConflict: "id" });

      if (error) {
        console.error("Supabase upsert error:", error);
        throw error;
      }

      // ✅ FIX 3: replace=false to not overwrite other columns like created_at
      router.push("/dashboard");
    } catch (err: unknown) {
  const message =
    err instanceof Error ? err.message : "Error saving profile.";
  alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@1,400&family=Raleway:wght@300;400;500;600&display=swap');
        @keyframes btn-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        html,body { margin:0; padding:0; background:#020817; }
      `}</style>

      <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", boxSizing: "border-box" }}>
        <StarCanvas />
        <div style={{
          position: "relative", zIndex: 1, width: "100%", maxWidth: 460,
          background: "rgba(4,9,28,.82)", border: "1px solid rgba(255,255,255,.06)",
          borderRadius: 24, padding: "2.2rem 2rem", boxSizing: "border-box",
          backdropFilter: "blur(20px)",
          boxShadow: "0 24px 60px rgba(0,0,0,.7), inset 0 1px 1px rgba(255,255,255,.05)",
        }}>
          <ProgressBar step={step} total={TOTAL_STEPS} />
          <form onSubmit={e => e.preventDefault()}>
            {step === 1 && <Step1 data={formData} update={updateField} isExistingUser={isExistingUser} />}
            {step === 2 && <Step2 data={formData} update={updateField} />}
            {step === 3 && <Step3 data={formData} update={updateField} />}
            {step === 4 && <Step4 data={formData} update={updateField} />}
            {step === 5 && <Step5 data={formData} metrics={aiMetrics} onSubmit={handleSubmit} loading={loading} aiLoading={aiLoading} />}
          </form>
          <NavButtons step={step} onPrev={handlePrev} onNext={handleNext} canNext={canProceed(step, formData)} aiLoading={aiLoading} />
        </div>
      </div>
    </>
  );
}
export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingPageContent />
    </Suspense>
  );
}

