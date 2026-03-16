export type SplitChapter = {
  title: string;
  text: string;
  chapter_order: number;
};

export function splitIntoChapters(fullText: string): SplitChapter[] {
  const cleaned = fullText.replace(/\r/g, "").trim();

  const parts = cleaned.split(/(?=chapter\s+\d+|CHAPTER\s+\d+)/g);

  if (parts.length <= 1) {
    return [
      {
        title: "Chapter 1",
        text: cleaned,
        chapter_order: 1,
      },
    ];
  }

  return parts
    .map((part, index) => {
      const lines = part.trim().split("\n").filter(Boolean);
      const title = lines[0]?.trim() || `Chapter ${index + 1}`;

      return {
        title,
        text: part.trim(),
        chapter_order: index + 1,
      };
    })
    .filter((chapter) => chapter.text.length > 0);
}