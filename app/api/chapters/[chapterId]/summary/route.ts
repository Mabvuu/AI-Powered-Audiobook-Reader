import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { openai } from "../../../../../lib/openai";

type RouteContext = {
  params: Promise<{
    chapterId: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { chapterId } = await context.params;

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `Summarize this chapter in 4 short bullet points and then 1 short paragraph:\n\nTitle: ${chapter.title}\n\nText:\n${chapter.text.slice(0, 12000)}`,
    });

    const summary = response.output_text || "No summary generated.";

    const updatedChapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: { summary },
    });

    return NextResponse.json({
      chapterId: updatedChapter.id,
      summary: updatedChapter.summary,
    });
  } catch (error) {
    console.error("SUMMARY_ERROR", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}