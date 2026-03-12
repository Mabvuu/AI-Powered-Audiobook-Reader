import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { openai } from "@/lib/openai";

type ChatBody = {
  userId: string;
  bookId: string;
  sessionId?: string;
  question: string;
};

type ChapterMatch = {
  id: string;
  title: string;
  text: string;
  chapter_order: number;
};

type PreviousMessage = {
  role: string;
  content: string;
};

type ChatSessionRow = {
  id: string;
  user_id: string;
  book_id: string;
  title: string | null;
};

type ChatMessageRow = {
  id: string;
  chat_session_id: string;
  role: string;
  content: string;
  source_chapter: string | null;
  created_at: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatBody;
    const { userId, bookId, sessionId, question } = body;

    if (!userId || !bookId || !question?.trim()) {
      return NextResponse.json(
        { error: "userId, bookId and question are required" },
        { status: 400 }
      );
    }

    let session: ChatSessionRow | null = null;
    let previousMessages: PreviousMessage[] = [];

    if (sessionId) {
      const { data: existingSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .select("id, user_id, book_id, title")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .eq("book_id", bookId)
        .maybeSingle();

      if (sessionError) {
        throw new Error(`Failed to load chat session: ${sessionError.message}`);
      }

      if (existingSession) {
        session = existingSession as ChatSessionRow;

        const { data: messages, error: messagesError } = await supabase
          .from("chat_messages")
          .select("id, chat_session_id, role, content, source_chapter, created_at")
          .eq("chat_session_id", session.id)
          .order("created_at", { ascending: true })
          .limit(10);

        if (messagesError) {
          throw new Error(`Failed to load chat messages: ${messagesError.message}`);
        }

        previousMessages = ((messages || []) as ChatMessageRow[]).map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content,
        }));
      }
    }

    if (!session) {
      const { data: createdSession, error: createSessionError } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: userId,
          book_id: bookId,
          title: question.trim().slice(0, 60),
        })
        .select("id, user_id, book_id, title")
        .single();

      if (createSessionError || !createdSession) {
        throw new Error(
          `Failed to create chat session: ${createSessionError?.message || "Unknown error"}`
        );
      }

      session = createdSession as ChatSessionRow;
    }

    const { data: chapterMatchesData, error: chaptersError } = await supabase
      .from("chapters")
      .select("id, title, text, chapter_order")
      .eq("book_id", bookId)
      .order("chapter_order", { ascending: true })
      .limit(3);

    if (chaptersError) {
      throw new Error(`Failed to load chapters: ${chaptersError.message}`);
    }

    const chapterMatches = (chapterMatchesData || []) as ChapterMatch[];

    const contextText = chapterMatches
      .map(
        (chapter) =>
          `Chapter ${chapter.chapter_order}: ${chapter.title}\n${(chapter.text || "").slice(0, 2000)}`
      )
      .join("\n\n---\n\n");

    const { error: saveUserMessageError } = await supabase.from("chat_messages").insert({
      chat_session_id: session.id,
      role: "user",
      content: question.trim(),
      source_chapter: null,
    });

    if (saveUserMessageError) {
      throw new Error(`Failed to save user message: ${saveUserMessageError.message}`);
    }

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You answer questions about a book. Use the provided book context and previous conversation. Keep answers clear and short. If unsure, say you are not sure.",
        },
        ...previousMessages.map((message) => ({
          role: message.role as "user" | "assistant",
          content: message.content,
        })),
        {
          role: "user",
          content: `Book context:\n${contextText}\n\nQuestion:\n${question.trim()}`,
        },
      ],
    });

    const answer = response.output_text?.trim() || "No answer generated.";
    const firstSource = chapterMatches[0];
    const sourceChapter = firstSource
      ? `Chapter ${firstSource.chapter_order}: ${firstSource.title}`
      : null;

    const { data: savedAnswer, error: saveAnswerError } = await supabase
      .from("chat_messages")
      .insert({
        chat_session_id: session.id,
        role: "assistant",
        content: answer,
        source_chapter: sourceChapter,
      })
      .select("content, source_chapter")
      .single();

    if (saveAnswerError || !savedAnswer) {
      throw new Error(
        `Failed to save assistant message: ${saveAnswerError?.message || "Unknown error"}`
      );
    }

    return NextResponse.json({
      sessionId: session.id,
      answer: savedAnswer.content,
      sourceChapter: savedAnswer.source_chapter,
    });
  } catch (error) {
    console.error("CHAT_ERROR", error);
    return NextResponse.json({ error: "Failed to chat" }, { status: 500 });
  }
}