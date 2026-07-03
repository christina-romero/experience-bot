import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/anthropic";
import { slideDeckSchema, type SlideDeck, type ScopeSequence, type LessonPlan } from "@/lib/schemas";
import { slideDeckPrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { scope, plan } = (await req.json()) as { scope: ScopeSequence; plan: LessonPlan };
    if (!scope || !plan) {
      return NextResponse.json({ error: "scope and plan are required." }, { status: 400 });
    }
    const prompt = slideDeckPrompt({ scope, plan });
    const data = await generateStructured<SlideDeck>(prompt, slideDeckSchema, { maxTokens: 20000 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}