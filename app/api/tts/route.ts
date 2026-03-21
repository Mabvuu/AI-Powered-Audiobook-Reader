import { NextRequest } from "next/server";
import { Constants, EdgeTTS } from "@andresaya/edge-tts";

type TTSRequestBody = {
  text?: string;
  rate?: number;
  partOrder?: number;
  chapterId?: string;
  bookId?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TTSRequestBody;
    const text = body.text?.trim();

    if (!text) {
      return Response.json({ error: "Text is required" }, { status: 400 });
    }

    const safeRate = typeof body.rate === "number" ? body.rate : 1;
    const edgeRate = safeRate === 1 ? "0%" : `${Math.round((safeRate - 1) * 100)}%`;

    const tts = new EdgeTTS();

    await tts.synthesize(text.slice(0, 5000), "en-US-AriaNeural", {
      rate: edgeRate,
      volume: "0%",
      pitch: "0Hz",
      outputFormat: Constants.OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3,
    });

    const audioBuffer = tts.toBuffer();
    const audioBytes = new Uint8Array(audioBuffer);

    return new Response(audioBytes, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);

    return Response.json({ error: "Failed to generate audio" }, { status: 500 });
  }
}