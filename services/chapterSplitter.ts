export type SplitChapter = {
  title: string;
  text: string;
  chapter_order: number;
};

const CHAPTER_HEADER_REGEX =
  /(?=^\s*(chapter\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)|prologue|epilogue|part\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten))\b.*$)/gim;

function normalizeText(text: string): string {
  return text.replace(/\r/g, "").trim();
}

function cleanTitle(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function extractChapterTitle(lines: string[], fallbackOrder: number): string {
  const firstNonEmptyLine = lines.find((line) => line.trim().length > 0);

  if (!firstNonEmptyLine) {
    return `Chapter ${fallbackOrder}`;
  }

  const title = cleanTitle(firstNonEmptyLine);

  if (/^(chapter|prologue|epilogue|part)\b/i.test(title)) {
    return title;
  }

  return `Chapter ${fallbackOrder}`;
}

function splitByDetectedHeaders(cleaned: string): string[] {
  const parts = cleaned
    .split(CHAPTER_HEADER_REGEX)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return parts;
}

export function splitIntoChapters(fullText: string): SplitChapter[] {
  const cleaned = normalizeText(fullText);

  if (!cleaned) {
    return [
      {
        title: "Chapter 1",
        text: "",
        chapter_order: 1,
      },
    ];
  }

  const parts = splitByDetectedHeaders(cleaned);

  if (parts.length <= 1) {
    return [
      {
        title: "Chapter 1",
        text: cleaned,
        chapter_order: 1,
      },
    ];
  }

  return parts.map((part, index) => {
    const lines = part.split("\n").map((line) => line.trim()).filter(Boolean);

    return {
      title: extractChapterTitle(lines, index + 1),
      text: part.trim(),
      chapter_order: index + 1,
    };
  });
}