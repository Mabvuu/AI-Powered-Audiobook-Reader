import { supabase } from "@/lib/supabase";
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

type BookRow = {
  id: string;
  title: string;
};

type ChapterRow = {
  id: string;
  title: string;
  text: string;
  chapter_order: number;
};

type CharacterRow = {
  id: string;
  name: string;
};

function safeJsonParse<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error("Model returned invalid JSON.");
  }
}

function cleanName(value: string) {
  return value.trim();
}

function cleanType(value: string) {
  return value.trim().toLowerCase();
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

async function getBook(bookId: string): Promise<BookRow> {
  const { data, error } = await supabase
    .from("books")
    .select("id, title")
    .eq("id", bookId)
    .single();

  if (error || !data) {
    throw new Error("Book not found.");
  }

  return data as BookRow;
}

async function getBookChapters(bookId: string): Promise<ChapterRow[]> {
  const { data, error } = await supabase
    .from("chapters")
    .select("id, title, text, chapter_order")
    .eq("book_id", bookId)
    .order("chapter_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load chapters: ${error.message}`);
  }

  return (data || []) as ChapterRow[];
}

async function upsertCharacter(params: {
  bookId: string;
  chapterId: string;
  character: ExtractedCharacter;
}): Promise<CharacterRow> {
  const name = cleanName(params.character.name);

  const payload = {
    book_id: params.bookId,
    name,
    aliases:
      params.character.aliases && params.character.aliases.length > 0
        ? params.character.aliases
        : null,
    description: params.character.description || null,
    first_appearance_chapter_id: params.chapterId,
    metadata: {
      source: "ai-extraction",
    },
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("characters")
    .upsert(payload, {
      onConflict: "book_id,name",
      ignoreDuplicates: false,
    })
    .select("id, name")
    .single();

  if (error || !data) {
    throw new Error(`Failed to save character "${name}": ${error?.message}`);
  }

  return data as CharacterRow;
}

async function createCharacterMention(params: {
  characterId: string;
  chapterId: string;
  quote?: string;
  context?: string;
}) {
  if (!params.quote && !params.context) return;

  const { error } = await supabase.from("character_mentions").insert({
    character_id: params.characterId,
    chapter_id: params.chapterId,
    quote: params.quote || null,
    context: params.context || null,
  });

  if (error) {
    throw new Error(`Failed to save character mention: ${error.message}`);
  }
}

async function upsertPlace(params: {
  bookId: string;
  chapterId: string;
  place: ExtractedPlace;
}) {
  const name = cleanName(params.place.name);

  const { error } = await supabase.from("places").upsert(
    {
      book_id: params.bookId,
      name,
      description: params.place.description || null,
      first_appearance_chapter_id: params.chapterId,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "book_id,name",
      ignoreDuplicates: false,
    }
  );

  if (error) {
    throw new Error(`Failed to save place "${name}": ${error.message}`);
  }
}

async function createStoryEvent(params: {
  bookId: string;
  chapterId: string;
  event: ExtractedEvent;
}) {
  const { error } = await supabase.from("story_events").insert({
    book_id: params.bookId,
    chapter_id: params.chapterId,
    title: params.event.title.trim(),
    summary: params.event.summary || null,
    metadata: {
      source: "ai-extraction",
    },
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to save story event: ${error.message}`);
  }
}

async function findCharacterByName(
  bookId: string,
  name: string
): Promise<CharacterRow | null> {
  const { data, error } = await supabase
    .from("characters")
    .select("id, name")
    .eq("book_id", bookId)
    .eq("name", cleanName(name))
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find character "${name}": ${error.message}`);
  }

  return (data as CharacterRow | null) || null;
}

async function upsertRelationship(params: {
  bookId: string;
  fromCharacterId: string;
  toCharacterId: string;
  relationship: ExtractedRelationship;
}) {
  const { error } = await supabase.from("character_relationships").upsert(
    {
      book_id: params.bookId,
      from_character_id: params.fromCharacterId,
      to_character_id: params.toCharacterId,
      type: cleanType(params.relationship.type),
      description: params.relationship.description || null,
      metadata: {
        source: "ai-extraction",
      },
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "book_id,from_character_id,to_character_id,type",
      ignoreDuplicates: false,
    }
  );

  if (error) {
    throw new Error(`Failed to save relationship: ${error.message}`);
  }
}

export async function extractEntitiesForBook(bookId: string) {
  await getBook(bookId);
  const chapters = await getBookChapters(bookId);

  if (chapters.length === 0) {
    throw new Error("No chapters found for this book.");
  }

  const characterCache = new Map<string, string>();

  for (const chapter of chapters) {
    const chapterText = chapter.text || "";

    if (!chapterText.trim()) {
      continue;
    }

    const extracted = await extractChapterData(
      chapter.title || "Untitled Chapter",
      chapterText
    );

    for (const character of extracted.characters) {
      if (!character.name?.trim()) continue;

      const savedCharacter = await upsertCharacter({
        bookId,
        chapterId: chapter.id,
        character,
      });

      characterCache.set(savedCharacter.name, savedCharacter.id);

      await createCharacterMention({
        characterId: savedCharacter.id,
        chapterId: chapter.id,
        quote: character.quote,
        context: character.context,
      });
    }

    for (const place of extracted.places) {
      if (!place.name?.trim()) continue;

      await upsertPlace({
        bookId,
        chapterId: chapter.id,
        place,
      });
    }

    for (const event of extracted.events) {
      if (!event.title?.trim()) continue;

      await createStoryEvent({
        bookId,
        chapterId: chapter.id,
        event,
      });
    }

    for (const relationship of extracted.relationships) {
      if (
        !relationship.from?.trim() ||
        !relationship.to?.trim() ||
        !relationship.type?.trim()
      ) {
        continue;
      }

      const fromName = cleanName(relationship.from);
      const toName = cleanName(relationship.to);

      let fromCharacterId = characterCache.get(fromName);
      let toCharacterId = characterCache.get(toName);

      if (!fromCharacterId) {
        const foundFrom = await findCharacterByName(bookId, fromName);
        if (foundFrom) {
          fromCharacterId = foundFrom.id;
          characterCache.set(foundFrom.name, foundFrom.id);
        }
      }

      if (!toCharacterId) {
        const foundTo = await findCharacterByName(bookId, toName);
        if (foundTo) {
          toCharacterId = foundTo.id;
          characterCache.set(foundTo.name, foundTo.id);
        }
      }

      if (!fromCharacterId || !toCharacterId) {
        continue;
      }

      await upsertRelationship({
        bookId,
        fromCharacterId,
        toCharacterId,
        relationship,
      });
    }
  }

  return {
    success: true,
    message: "Entity extraction completed.",
  };
}