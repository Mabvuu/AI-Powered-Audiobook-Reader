import fs from "fs";
import path from "path";
import EPub from "epub2";
import { extractText as extractPdfText, getDocumentProxy } from "unpdf";

export async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    const buffer = fs.readFileSync(filePath);
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractPdfText(pdf, { mergePages: true });
    return typeof text === "string" ? text.trim() : "";
  }

  if (ext === ".epub") {
    return new Promise((resolve, reject) => {
      const epub = new EPub(filePath);
      let text = "";

      epub.on("error", reject);

      epub.on("end", () => {
        resolve(text.trim());
      });

      epub.on("chapter", (chapterText: string) => {
        text += `${chapterText}\n`;
      });

      epub.parse();
    });
  }

  if (ext === ".txt") {
    return fs.readFileSync(filePath, "utf8").trim();
  }

  return "";
}