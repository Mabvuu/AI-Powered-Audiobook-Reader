import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { openai } from "@/lib/openai";

type RouteContext = {
  params: Promise<{
    chapterId: string;
  }>;
};

type ChapterRow = {
  id: string;
  title: string | null;
  text: string | null;
  summary: string | null;
};

function hasOpenAi() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { chapterId } = await context.params;

    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select("id, title, text, summary")
      .eq("id", chapterId)
      .single();

    if (chapterError || !chapter) {
      return NextResponse.json(
        {
          success: false,
          error: "Chapter not found",
          summary: null,
          aiEnabled: hasOpenAi(),
        },
        { status: 404 }
      );
    }

    const chapterData = chapter as ChapterRow;

    if (chapterData.summary?.trim()) {
      return NextResponse.json({
        success: true,
        chapterId: chapterData.id,
        summary: chapterData.summary,
        cached: true,
        aiEnabled: hasOpenAi(),
      });
    }

    if (!hasOpenAi()) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI is not configured",
          summary: null,
          aiEnabled: false,
          message:
            "Summary generation is unavailable because OpenAI is not configured on this server.",
        },
        { status: 503 }
      );
    }

    const chapterTitle = chapterData.title?.trim() || "Untitled Chapter";
    const chapterText = chapterData.text?.trim() || "";

    if (!chapterText) {
      return NextResponse.json(
        {
          success: false,
          error: "Chapter has no text",
          summary: null,
          aiEnabled: true,
        },
        { status: 400 }
      );
    }

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: `Summarize this chapter in 4 short bullet points and then 1 short paragraph:

Title: ${chapterTitle}

Text:
${chapterText.slice(0, 12000)}`,
    });

    const summary = response.output_text?.trim() || "No summary generated.";

    const { data: updatedChapter, error: updateError } = await supabase
      .from("chapters")
      .update({ summary })
      .eq("id", chapterId)
      .select("id, summary")
      .single();

    if (updateError || !updatedChapter) {
      throw new Error(
        `Failed to update chapter summary: ${updateError?.message || "Unknown error"}`
      );
    }

    return NextResponse.json({
      success: true,
      chapterId: updatedChapter.id,
      summary: updatedChapter.summary,
      cached: false,
      aiEnabled: true,
    });
  } catch (error) {
    console.error("SUMMARY_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate summary",
        summary: null,
        aiEnabled: hasOpenAi(),
      },
      { status: 500 }
    );
  }
}