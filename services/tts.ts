import OpenAI from "openai"
import fs from "fs"
import path from "path"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function generateAudio(text: string, filename: string) {
  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text
  })

  const audioBuffer = Buffer.from(await response.arrayBuffer())

  const filePath = path.join(process.cwd(), "uploads", filename)

  fs.writeFileSync(filePath, audioBuffer)

  return filePath
}