import { NextRequest, NextResponse } from "next/server";
import { transcribe, providerInfo } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

export async function POST(request: NextRequest) {
  const { provider, configured } = providerInfo();
  if (!configured) {
    return NextResponse.json(
      { error: "No AI provider key is configured. Add GROQ_API_KEY or OPENAI_API_KEY to .env.local for voice input." },
      { status: 503 }
    );
  }
  if (provider === "gemini") {
    return NextResponse.json(
      { error: "Gemini's simple API key can't transcribe audio. Set AI_PROVIDER=groq (or openai) for voice input." },
      { status: 503 }
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("audio");
    if (!(file instanceof Blob)) return NextResponse.json({ error: "No audio file." }, { status: 400 });

    const text = await transcribe(file);
    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription failed." },
      { status: 502 }
    );
  }
}