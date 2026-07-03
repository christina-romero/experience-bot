import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/anthropic";
import { scopeSequenceSchema, type ScopeSequence } from "@/lib/schemas";
import { scopeSequencePrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { competency, gradeBand, cpcMode } = await req.json();
    if (!competency || !gradeBand) {
      return NextResponse.json({ error: "competency and gradeBand are required." }, { status: 400 });
    }
    const prompt = scopeSequencePrompt({ competency, gradeBand, cpcMode: cpcMode || "exemplar" });
    const data = await generateStructured<ScopeSequence>(prompt, scopeSequenceSchema, { maxTokens: 32000 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}