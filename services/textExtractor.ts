import fs from "fs";
import path from "path";
import EPub from "epub2";
import { extractText as extractPdfText, getDocumentProxy } from "unpdf";

type ExtractedPdfPage = {
  pageNumber: number;
  text: string;
  skipped: boolean;
  reason?: string;
};

type ExtractedDocument = {
  text: string;
  pages: ExtractedPdfPage[];
  startPage: number;
  totalPages: number;
};

const FRONT_MATTER_PATTERNS: RegExp[] = [
  /\bcontents\b/i,
  /\btable of contents\b/i,
  /\bcopyright\b/i,
  /\ball rights reserved\b/i,
  /\bdedication\b/i,
  /\backnowledg(e)?ments?\b/i,
  /\bpraise for\b/i,
  /\balso by\b/i,
  /\babout the author\b/i,
  /\btitle page\b/i,
  /\bpublished by\b/i,
  /\bisbn\b/i,
];

const CHAPTER_PATTERNS: RegExp[] = [
  /^\s*chapter\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/im,
  /^\s*(?:prologue|epilogue)\b/im,
  /^\s*(?:part)\s+(?:\d+|one|two|three|four|five)\b/im,
];

function normalizeText(value: string): string {
  return value.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
}

function countWords(value: string): number {
  const words = value.trim().match(/\S+/g);
  return words ? words.length : 0;
}

function looksLikeFrontMatter(text: string): boolean {
  const cleaned = normalizeText(text);
  if (!cleaned) return true;

  const lower = cleaned.toLowerCase();
  const wordCount = countWords(cleaned);

  if (FRONT_MATTER_PATTERNS.some((pattern) => pattern.test(lower))) {
    return true;
  }

  if (wordCount < 25 && !CHAPTER_PATTERNS.some((pattern) => pattern.test(cleaned))) {
    return true;
  }

  return false;
}

function looksLikeStoryStart(text: string): boolean {
  const cleaned = normalizeText(text);
  if (!cleaned) return false;

  if (CHAPTER_PATTERNS.some((pattern) => pattern.test(cleaned))) {
    return true;
  }

  const paragraphBlocks = cleaned
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  const hasLongParagraph = paragraphBlocks.some((paragraph) => countWords(paragraph) >= 40);
  const enoughWords = countWords(cleaned) >= 80;

  return hasLongParagraph && enoughWords;
}

function findBestStartPage(pages: string[]): number {
  if (pages.length === 0) return 1;

  for (let index = 0; index < pages.length; index += 1) {
    const text = normalizeText(pages[index]);

    if (!text) continue;

    if (looksLikeStoryStart(text)) {
      return index + 1;
    }
  }

  for (let index = 0; index < pages.length; index += 1) {
    const text = normalizeText(pages[index]);

    if (!looksLikeFrontMatter(text)) {
      return index + 1;
    }
  }

  return 1;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function readPdfTextResult(result: unknown): string[] {
  if (!result || typeof result !== "object") {
    return [];
  }

  const record = result as Record<string, unknown>;
  const textValue = record.text;

  if (typeof textValue === "string") {
    return [textValue];
  }

  if (isStringArray(textValue)) {
    return textValue;
  }

  return [];
}

async function extractPdfPages(filePath: string): Promise<ExtractedDocument> {
  const buffer = fs.readFileSync(filePath);
  const pdf = await getDocumentProxy(new Uint8Array(buffer));

  const mergedFalseResult = await extractPdfText(pdf, { mergePages: false });
  let pageTexts = readPdfTextResult(mergedFalseResult).map((page) => normalizeText(page));

  if (pageTexts.length === 0) {
    const mergedTrueResult = await extractPdfText(pdf, { mergePages: true });
    const mergedText = readPdfTextResult(mergedTrueResult)[0] ?? "";
    pageTexts = [normalizeText(mergedText)];
  }

  const startPage = findBestStartPage(pageTexts);

  const pages: ExtractedPdfPage[] = pageTexts.map((text, index) => {
    const pageNumber = index + 1;
    const skipped = pageNumber < startPage;

    return {
      pageNumber,
      text,
      skipped,
      reason: skipped ? "front_matter" : undefined,
    };
  });

  const readableText = pages
    .filter((page) => !page.skipped)
    .map((page) => page.text)
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return {
    text: readableText,
    pages,
    startPage,
    totalPages: pages.length,
  };
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractEpubText(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const epub = new EPub(filePath);
    const chapterTexts: string[] = [];

    epub.on("error", reject);

    epub.on("end", () => {
      const flow = epub.flow ?? [];
      const chapterIds = flow
        .map((chapter) => chapter.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      if (chapterIds.length === 0) {
        resolve(chapterTexts.join("\n\n").trim());
        return;
      }

      let pending = chapterIds.length;

      chapterIds.forEach((chapterId, index) => {
        epub.getChapter(chapterId, (error, text) => {
          if (!error && typeof text === "string") {
            chapterTexts[index] = stripHtml(text);
          } else {
            chapterTexts[index] = "";
          }

          pending -= 1;

          if (pending === 0) {
            resolve(chapterTexts.filter(Boolean).join("\n\n").trim());
          }
        });
      });
    });

    epub.parse();
  });
}

export async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    const result = await extractPdfPages(filePath);
    return result.text;
  }

  if (ext === ".epub") {
    return extractEpubText(filePath);
  }

  if (ext === ".txt") {
    return fs.readFileSync(filePath, "utf8").trim();
  }

  return "";
}

export async function extractPdfMetadata(filePath: string): Promise<ExtractedDocument> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext !== ".pdf") {
    return {
      text: await extractText(filePath),
      pages: [],
      startPage: 1,
      totalPages: 0,
    };
  }

  return extractPdfPages(filePath);
}