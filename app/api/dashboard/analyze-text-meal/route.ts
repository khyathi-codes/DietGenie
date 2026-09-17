import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "No food text provided" }, { status: 400 });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Analyze this food description and estimate its nutritional values: "${text}". 
      Give realistic estimates based on standard Indian/common food portions. 
      Return ONLY a JSON object, no markdown.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            food_name:       { type: Type.STRING },
            calories:        { type: Type.INTEGER },
            protein:         { type: Type.INTEGER },
            healthy_insight: { type: Type.STRING },
          },
          required: ["food_name", "calories", "protein", "healthy_insight"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return NextResponse.json(parsed);
  } catch (err: unknown) {
  console.error("analyze-text-meal error:", err);

  const message = err instanceof Error ? err.message : "Unknown error";

  return NextResponse.json({ error: message }, { status: 500 });
}
}
