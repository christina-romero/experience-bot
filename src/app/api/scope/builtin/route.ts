import { NextResponse } from "next/server";
import { buildBuiltinScope } from "@/lib/scope-sequence-data";

export const runtime = "nodejs";

/**
 * Built-in Scope & Sequence: returns the bundled Cycle-1 S&S for a competency +
 * grade band deterministically (no upload, no LLM parse). This is how the bot
 * "already knows" the S&S so a re-upload is never required.
 */
export async function POST(req: Request) {
  try {
    const { competency, gradeBand } = (await req.json()) as { competency: string; gradeBand: string };
    if (!competency || !gradeBand) {
      return NextResponse.json({ error: "competency and gradeBand are required." }, { status: 400 });
    }
    const scope = buildBuiltinScope(competency, gradeBand);
    if (!scope) {
      return NextResponse.json(
        { error: `No built-in Scope & Sequence for ${competency} (${gradeBand}). Built in: Collaboration & Teamwork and Emotional Intelligence, grades 3/4, 5/6, 7/8.` },
        { status: 404 }
      );
    }
    return NextResponse.json({ scope });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load the built-in Scope & Sequence.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}