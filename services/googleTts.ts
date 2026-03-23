import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

type GoogleTtsOptions = {
  text: string;
  voiceName?: string;
  model?: string;
  stylePrompt?: string;
};

function createWavHeader(dataLength: number, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000) {
  const header = createWavHeader(pcmBuffer.length, sampleRate, 1, 16);
  return Buffer.concat([header, pcmBuffer]);
}

function cleanTextForTts(text: string) {
  return text
    .replace(/\r/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function synthesizeGoogleTts({
  text,
  voiceName = "Kore",
  model = "gemini-2.5-flash-preview-tts",
  stylePrompt = "Read this like a warm, natural audiobook narrator. Sound calm, expressive, smooth, and human. Do not sound robotic. Use gentle pauses at commas and full stops.",
}: GoogleTtsOptions) {
  const cleanedText = cleanTextForTts(text);

  if (!cleanedText) {
    throw new Error("No text provided for TTS");
  }

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          {
            text: `${stylePrompt}\n\nText:\n${cleanedText}`,
          },
        ],
      },
    ],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName,
          },
        },
      },
    },
  });

  const base64Audio =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!base64Audio) {
    throw new Error("Google TTS returned no audio data");
  }

  const pcmBuffer = Buffer.from(base64Audio, "base64");
  const wavBuffer = pcmToWav(pcmBuffer, 24000);

  return wavBuffer;
}