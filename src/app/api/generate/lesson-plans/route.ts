import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/anthropic";
import { lessonWeekSchema, type LessonWeek, type ScopeSequence } from "@/lib/schemas";
import { lessonWeekPrompt } from "@/lib/prompts";
import { loadCoreLibrary } from "@/lib/core-library";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { scope, week } = (await req.json()) as { scope: ScopeSequence; week: number };
    if (!scope || !week) {
      return NextResponse.json({ error: "scope and week are required." }, { status: 400 });
    }

    // Load the permanent Core Library first; fail clearly if it cannot be loaded.
    const session = await auth();
    const core = await loadCoreLibrary(session?.accessToken);

    const prompt = lessonWeekPrompt({ scope, week, genome: core.genome });
    const data = await generateStructured<LessonWeek>(prompt, lessonWeekSchema, { maxTokens: 32000 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}