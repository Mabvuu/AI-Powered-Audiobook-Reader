import { NextRequest, NextResponse } from "next/server";
import { extractEntitiesForBook } from "@/services/entityExtraction";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const result = await extractEntitiesForBook(id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("ENTITY_EXTRACTION_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to extract entities.",
      },
      { status: 500 }
    );
  }
}