import { NextRequest, NextResponse } from "next/server";
import { synthesizeGoogleTts } from "@/services/googleTts";

type TtsBody = {
  text?: string;
  voiceName?: string;
  model?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TtsBody;

    if (!body.text || !body.text.trim()) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const wavBuffer = await synthesizeGoogleTts({
      text: body.text,
      voiceName: body.voiceName ?? "Kore",
      model: "gemini-2.5-flash-preview-tts",
    });

    return new NextResponse(wavBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": 'inline; filename="speech.wav"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Google TTS error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate audio",
      },
      { status: 500 }
    );
  }
}