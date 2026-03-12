import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { openai } from "../../../lib/openai";

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
  order: number;
};

type PreviousMessage = {
  role: string;
  content: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatBody;
    const { userId, bookId, sessionId, question } = body;

    if (!userId || !bookId || !question) {
      return NextResponse.json(
        { error: "userId, bookId and question are required" },
        { status: 400 }
      );
    }

    let session = sessionId
      ? await prisma.chatSession.findUnique({
          where: { id: sessionId },
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
              take: 10,
            },
          },
        })
      : null;

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          userId,
          bookId,
          title: question.slice(0, 60),
        },
        include: {
          messages: true,
        },
      });
    }

    const chapterMatches: ChapterMatch[] = await prisma.chapter.findMany({
      where: { bookId },
      take: 3,
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        text: true,
        order: true,
      },
    });

    const contextText = chapterMatches
      .map(
        (chapter: ChapterMatch) =>
          `Chapter ${chapter.order}: ${chapter.title}\n${chapter.text.slice(0, 2000)}`
      )
      .join("\n\n---\n\n");

    const previousMessages: PreviousMessage[] = session.messages.map(
      (message: PreviousMessage) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      })
    );

    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "user",
        content: question,
      },
    });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You answer questions about a book. Use the provided book context and previous conversation. Keep answers clear and short. If unsure, say you are not sure.",
        },
        ...previousMessages.map((message: PreviousMessage) => ({
          role: message.role as "user" | "assistant",
          content: message.content,
        })),
        {
          role: "user",
          content: `Book context:\n${contextText}\n\nQuestion:\n${question}`,
        },
      ],
    });

    const answer = response.output_text || "No answer generated.";
    const firstSource = chapterMatches[0];

    const savedAnswer = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: answer,
        sourceChapter: firstSource
          ? `Chapter ${firstSource.order}: ${firstSource.title}`
          : null,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      answer: savedAnswer.content,
      sourceChapter: savedAnswer.sourceChapter,
    });
  } catch (error) {
    console.error("CHAT_ERROR", error);
    return NextResponse.json({ error: "Failed to chat" }, { status: 500 });
  }
}