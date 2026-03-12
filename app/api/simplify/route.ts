import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";

type SimplifyBody = {
  text: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SimplifyBody;

    if (!body.text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `Rewrite this paragraph in very simple English without changing the meaning:\n\n${body.text}`,
    });

    return NextResponse.json({
      simplified: response.output_text || body.text,
    });
  } catch (error) {
    console.error("SIMPLIFY_ERROR", error);
    return NextResponse.json(
      { error: "Failed to simplify text" },
      { status: 500 }
    );
  }
}