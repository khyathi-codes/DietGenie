"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
type FoodItem = {
  name: string;
  estimated_weight_g: number;
  calories: number;
};

type FoodResult = {
  total_calories: number;
  total_protein: number;
  items: FoodItem[];
  healthy_insight: string;
};

export default function FoodScannerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FoodResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const analyzeFood = async () => {
    if (!preview) return;

    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/recognize-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: preview }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#04091c] text-white p-6 md:p-12 font-sans">
      <button onClick={() => router.push("/dashboard")} className="mb-8 text-gray-400 hover:text-white transition-colors">
        ← Back to Dashboard
      </button>

      <h1 className="text-4xl font-bold mb-8 text-purple-400">Food Scanner</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Scanner Input */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
          <input type="file" accept="image/*" onChange={handleFileChange} className="mb-4" />
{preview && (
  <Image
    src={preview}
    alt="Preview"
    width={800}
    height={400}
    unoptimized
    className="w-full h-64 object-cover rounded-2xl mb-4"
  />
)}
          <button 
            onClick={analyzeFood} 
            disabled={loading || !preview}
            className="w-full bg-purple-600 py-4 rounded-xl font-bold hover:bg-purple-500 transition-all disabled:opacity-50"
          >
            {loading ? "Scanning..." : "Scan Food"}
          </button>
        </div>

        {/* Analysis Output */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
          {result ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-purple-400">Analysis Results</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-xl">Calories: {result.total_calories} kcal</div>
                <div className="bg-white/10 p-4 rounded-xl">Protein: {result.total_protein} g</div>
              </div>
              <ul className="space-y-2">
                {result.items.map((item, i) => (
                  <li key={i} className="text-sm border-b border-white/10 pb-2">
                    {item.name} (~{item.estimated_weight_g}g) - {item.calories} kcal
                  </li>
                ))}
              </ul>
              <p className="text-purple-300 italic pt-4">{result.healthy_insight}</p>
            </div>
          ) : (
            <p className="text-gray-500 italic">Scan a plate to see nutritional breakdown...</p>
          )}
        </div>
      </div>
    </div>
  );
}