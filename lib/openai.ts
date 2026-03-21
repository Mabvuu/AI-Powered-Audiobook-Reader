import OpenAI from "openai";

function createOpenAiClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

export const openai = createOpenAiClient();

export function hasOpenAi() {
  return Boolean(process.env.OPENAI_API_KEY && openai);
}