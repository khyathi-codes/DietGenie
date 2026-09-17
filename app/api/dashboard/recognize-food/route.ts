import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    // Clean up base64 prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = "Analyze this image of a food item or complete plate. Identify all items present, estimate weights, calculate calorie and protein metrics, and provide a constructive health insight.";

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  estimated_weight_g: { type: Type.INTEGER },
                  calories: { type: Type.INTEGER },
                  protein: { type: Type.INTEGER }
                },
                required: ["name", "estimated_weight_g", "calories", "protein"]
              }
            },
            total_calories: { type: Type.INTEGER },
            total_protein: { type: Type.INTEGER },
            healthy_insight: { type: Type.STRING }
          },
          required: ["items", "total_calories", "total_protein", "healthy_insight"]
        }
      }
    });

    return NextResponse.json(JSON.parse(response.text || "{}"));
  } catch (error: unknown) {
  const message =
    error instanceof Error ? error.message : "Something went wrong";

  return NextResponse.json({ error: message }, { status: 500 });
}
}