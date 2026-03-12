import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";

type ExtractedCharacter = {
  name: string;
  aliases?: string[];
  description?: string;
  quote?: string;
  context?: string;
};

type ExtractedPlace = {
  name: string;
  description?: string;
};

type ExtractedEvent = {
  title: string;
  summary?: string;
};

type ExtractedRelationship = {
  from: string;
  to: string;
  type: string;
  description?: string;
};

type ChapterExtractionResult = {
  characters: ExtractedCharacter[];
  places: ExtractedPlace[];
  events: ExtractedEvent[];
  relationships: ExtractedRelationship[];
};

function safeJsonParse<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error("Model returned invalid JSON.");
  }
}

async function extractChapterData(
  chapterTitle: string,
  chapterText: string
): Promise<ChapterExtractionResult> {
  const trimmedText = chapterText.slice(0, 12000);

  const prompt = `
You are extracting structured story knowledge from a book chapter.

Return ONLY valid JSON with this exact shape:
{
  "characters": [
    {
      "name": "string",
      "aliases": ["string"],
      "description": "string",
      "quote": "short quote from chapter if available",
      "context": "short explanation"
    }
  ],
  "places": [
    {
      "name": "string",
      "description": "string"
    }
  ],
  "events": [
    {
      "title": "string",
      "summary": "string"
    }
  ],
  "relationships": [
    {
      "from": "character name",
      "to": "character name",
      "type": "friend | enemy | family | mentor | ally | romantic | colleague | unknown",
      "description": "string"
    }
  ]
}

Rules:
- Use only what is clearly supported by the chapter.
- Keep names consistent.
- Avoid duplicates.
- If something is missing, return an empty array.
- Do not include markdown.
- Do not include extra keys.

Chapter title: ${chapterTitle}

Chapter text:
${trimmedText}
`;

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: prompt,
  });

  const text = response.output_text?.trim();

  if (!text) {
    throw new Error("No extraction output returned.");
  }

  return safeJsonParse<ChapterExtractionResult>(text);
}

export async function extractEntitiesForBook(bookId: string) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      chapters: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!book) {
    throw new Error("Book not found.");
  }

  for (const chapter of book.chapters) {
    const chapterText =
      (chapter as { content?: string; text?: string }).content ||
      (chapter as { content?: string; text?: string }).text ||
      "";

    if (!chapterText.trim()) {
      continue;
    }

    const extracted = await extractChapterData(
      (chapter as { title?: string }).title || "Untitled Chapter",
      chapterText
    );

    const characterMap = new Map<string, string>();

    for (const character of extracted.characters) {
      const savedCharacter = await prisma.character.upsert({
        where: {
          bookId_name: {
            bookId,
            name: character.name.trim(),
          },
        },
        update: {
          description: character.description || undefined,
          aliases: character.aliases && character.aliases.length > 0 ? character.aliases : undefined,
          metadata: {
            source: "ai-extraction",
          },
          ...(character.description
            ? { description: character.description }
            : {}),
        },
        create: {
          bookId,
          name: character.name.trim(),
          aliases: character.aliases && character.aliases.length > 0 ? character.aliases : undefined,
          description: character.description || null,
          firstAppearanceChapterId: chapter.id,
          metadata: {
            source: "ai-extraction",
          },
        },
      });

      characterMap.set(savedCharacter.name, savedCharacter.id);

      if (character.quote || character.context) {
        await prisma.characterMention.create({
          data: {
            characterId: savedCharacter.id,
            chapterId: chapter.id,
            quote: character.quote || null,
            context: character.context || null,
          },
        });
      }
    }

    for (const place of extracted.places) {
      await prisma.place.upsert({
        where: {
          bookId_name: {
            bookId,
            name: place.name.trim(),
          },
        },
        update: {
          ...(place.description ? { description: place.description } : {}),
        },
        create: {
          bookId,
          name: place.name.trim(),
          description: place.description || null,
          firstAppearanceChapterId: chapter.id,
        },
      });
    }

    for (const event of extracted.events) {
      await prisma.storyEvent.create({
        data: {
          bookId,
          chapterId: chapter.id,
          title: event.title.trim(),
          summary: event.summary || null,
          metadata: {
            source: "ai-extraction",
          },
        },
      });
    }

    for (const relationship of extracted.relationships) {
      const fromCharacter = await prisma.character.findUnique({
        where: {
          bookId_name: {
            bookId,
            name: relationship.from.trim(),
          },
        },
      });

      const toCharacter = await prisma.character.findUnique({
        where: {
          bookId_name: {
            bookId,
            name: relationship.to.trim(),
          },
        },
      });

      if (!fromCharacter || !toCharacter) continue;

      await prisma.characterRelationship.upsert({
        where: {
          bookId_fromCharacterId_toCharacterId_type: {
            bookId,
            fromCharacterId: fromCharacter.id,
            toCharacterId: toCharacter.id,
            type: relationship.type.trim().toLowerCase(),
          },
        },
        update: {
          description: relationship.description || null,
          metadata: {
            source: "ai-extraction",
          },
        },
        create: {
          bookId,
          fromCharacterId: fromCharacter.id,
          toCharacterId: toCharacter.id,
          type: relationship.type.trim().toLowerCase(),
          description: relationship.description || null,
          metadata: {
            source: "ai-extraction",
          },
        },
      });
    }
  }

  return {
    success: true,
    message: "Entity extraction completed.",
  };
}