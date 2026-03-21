import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";

type SimplifyBody = {
  text: string;
};

function hasOpenAi() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SimplifyBody;
    const text = body?.text?.trim();

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error: "Text is required",
          simplified: null,
          aiEnabled: hasOpenAi(),
        },
        { status: 400 }
      );
    }

    if (!hasOpenAi()) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI is not configured",
          simplified: text,
          aiEnabled: false,
          message:
            "Text simplify is unavailable because OpenAI is not configured on this server.",
        },
        { status: 503 }
      );
    }

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: `Rewrite this paragraph in very simple English without changing the meaning:

${text}`,
    });

    return NextResponse.json({
      success: true,
      simplified: response.output_text?.trim() || text,
      aiEnabled: true,
    });
  } catch (error) {
    console.error("SIMPLIFY_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to simplify text",
        simplified: null,
        aiEnabled: hasOpenAi(),
      },
      { status: 500 }
    );
  }
}