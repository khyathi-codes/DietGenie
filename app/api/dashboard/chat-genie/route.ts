import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

type ChatMessage = {
  role: string;
  content: string;
};

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

   const contents = messages.map((msg: ChatMessage) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const response = await ai.models.generateContent({
     model: "gemini-3.5-flash-lite",
      contents,
      config: {
        systemInstruction: `
You are Chat Genie, an AI health assistant.

Rules:
- Keep replies under 80 words.
- Give direct answers.
- Use short bullet points when needed.
- Never write long paragraphs.
- Be friendly and conversational.
- Focus on fitness, nutrition and wellness.
`,
      },
    });

    return NextResponse.json({
      text: response.text,
    });
  } catch (error: unknown) {
  console.error("Chat Genie Error:", error);

  const message =
    error instanceof Error ? error.message : "Something went wrong";

  return NextResponse.json(
    {
      error: message,
    },
    { status: 500 }
  );
  }
}