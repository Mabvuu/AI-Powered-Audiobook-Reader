import OpenAI from "openai";
import fs from "fs";
import path from "path";

const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.OPENAI_TTS_VOICE || "alloy";

function hasOpenAi() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getOpenAiClient() {
  if (!hasOpenAi()) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function generateAudio(text: string, filename: string) {
  const cleanText = text.trim();

  if (!cleanText) {
    throw new Error("Text is required for audio generation");
  }

  const openai = getOpenAiClient();

  if (!openai) {
    throw new Error("OpenAI is not configured for TTS");
  }

  const uploadDir = path.join(process.cwd(), "uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const response = await openai.audio.speech.create({
    model: TTS_MODEL,
    voice: TTS_VOICE,
    input: cleanText,
  });

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const filePath = path.join(uploadDir, filename);

  fs.writeFileSync(filePath, audioBuffer);

  return filePath;
}