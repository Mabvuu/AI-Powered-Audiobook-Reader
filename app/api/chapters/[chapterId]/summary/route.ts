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
  title: string;
  text: string;
  summary: string | null;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { chapterId } = await context.params;

    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select("id, title, text, summary")
      .eq("id", chapterId)
      .single();

    if (chapterError || !chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const chapterData = chapter as ChapterRow;

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: `Summarize this chapter in 4 short bullet points and then 1 short paragraph:

Title: ${chapterData.title}

Text:
${chapterData.text.slice(0, 12000)}`,
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