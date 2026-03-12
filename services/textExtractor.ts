import fs from "fs"
import path from "path"
import { createRequire } from "module"
import EPub from "epub2"

const require = createRequire(import.meta.url)
const pdfParse = require("pdf-parse")

export async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === ".pdf") {
    const buffer = fs.readFileSync(filePath)
    const data = await pdfParse(buffer)
    return data.text
  }

  if (ext === ".epub") {
    return new Promise((resolve, reject) => {
      const epub = new EPub(filePath)

      let text = ""

      epub.on("error", reject)

      epub.on("end", () => {
        resolve(text)
      })

      epub.on("chapter", (chapterText: string) => {
        text += chapterText + "\n"
      })

      epub.parse()
    })
  }

  if (ext === ".txt") {
    return fs.readFileSync(filePath, "utf8")
  }

  return ""
}