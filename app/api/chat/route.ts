import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { openai } from "@/lib/openai";
import { generateEmbedding } from "@/services/embeddings";
import { searchBookChunks, ChunkMatch } from "@/services/vector-search";

type ChatBody = {
  userId?: string;
  bookId: string;
  sessionId?: string;
  question: string;
};

type PreviousMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatSessionRow = {
  id: string;
  book_id: string;
  title: string | null;
};

type ChatMessageRow = {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string | null;
};

type SupabaseLike = typeof supabase;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatBody;
    const { bookId, sessionId, question } = body;
    const cleanQuestion = question?.trim();

    if (!bookId || !cleanQuestion) {
      return NextResponse.json(
        { error: "bookId and question are required" },
        { status: 400 }
      );
    }

    const db = supabase as SupabaseLike;

    let session: ChatSessionRow | null = null;
    let previousMessages: PreviousMessage[] = [];

    if (sessionId) {
      const { data: existingSession, error: sessionError } = await db
        .from("chat_sessions")
        .select("id, book_id, title")
        .eq("id", sessionId)
        .eq("book_id", bookId)
        .maybeSingle();

      if (sessionError) {
        throw new Error(`Failed to load chat session: ${sessionError.message}`);
      }

      if (existingSession) {
        session = existingSession as unknown as ChatSessionRow;

        const { data: messages, error: messagesError } = await db
          .from("chat_messages")
          .select("id, session_id, role, content, created_at")
          .eq("session_id", session.id)
          .order("created_at", { ascending: true })
          .limit(10);

        if (messagesError) {
          throw new Error(`Failed to load chat messages: ${messagesError.message}`);
        }

        previousMessages = ((messages ?? []) as unknown as ChatMessageRow[]).map(
          (message: ChatMessageRow) => ({
            role: message.role === "assistant" ? "assistant" : "user",
            content: message.content,
          })
        );
      }
    }

    if (!session) {
      const { data: createdSession, error: createSessionError } = await db
        .from("chat_sessions")
        .insert({
          book_id: bookId,
          title: cleanQuestion.slice(0, 60),
        })
        .select("id, book_id, title")
        .single();

      if (createSessionError || !createdSession) {
        throw new Error(
          `Failed to create chat session: ${
            createSessionError?.message || "Unknown error"
          }`
        );
      }

      session = createdSession as unknown as ChatSessionRow;
    }

    const { error: saveUserMessageError } = await db.from("chat_messages").insert({
      session_id: session.id,
      role: "user",
      content: cleanQuestion,
    });

    if (saveUserMessageError) {
      throw new Error(`Failed to save user message: ${saveUserMessageError.message}`);
    }

    const questionEmbedding = await generateEmbedding(cleanQuestion);

    const chunkMatches: ChunkMatch[] = await searchBookChunks({
      bookId,
      embedding: questionEmbedding,
      matchCount: 6,
    });

    const contextText = chunkMatches
      .map((chunk: ChunkMatch) => {
        const chapterLabel =
          chunk.chapter_order && chunk.chapter_title
            ? `Chapter ${chunk.chapter_order}: ${chunk.chapter_title}`
            : chunk.chapter_title || "Unknown chapter";

        return `${chapterLabel} | Chunk ${chunk.chunk_order}\n${chunk.text}`;
      })
      .join("\n\n---\n\n");

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You answer questions about a book using the provided retrieved context. Keep the answer clear and short. If the answer is not in the context, say you are not sure.",
        },
        ...previousMessages.map((message: PreviousMessage) => ({
          role: message.role,
          content: message.content,
        })),
        {
          role: "user",
          content: chunkMatches.length
            ? `Book context:\n${contextText}\n\nQuestion:\n${cleanQuestion}`
            : `No matching book context was found.\n\nQuestion:\n${cleanQuestion}`,
        },
      ],
    });

    const answer = response.output_text?.trim() || "No answer generated.";

    const { error: saveAnswerError } = await db.from("chat_messages").insert({
      session_id: session.id,
      role: "assistant",
      content: answer,
    });

    if (saveAnswerError) {
      throw new Error(`Failed to save assistant message: ${saveAnswerError.message}`);
    }

    const sources = Array.from(
      new Set(
        chunkMatches.map((chunk: ChunkMatch) =>
          chunk.chapter_order && chunk.chapter_title
            ? `Chapter ${chunk.chapter_order}: ${chunk.chapter_title}`
            : chunk.chapter_title || "Unknown chapter"
        )
      )
    );

    return NextResponse.json({
      sessionId: session.id,
      answer,
      sources,
      matchesFound: chunkMatches.length,
    });
  } catch (error) {
    console.error("CHAT_ERROR", error);
    return NextResponse.json({ error: "Failed to chat" }, { status: 500 });
  }
}