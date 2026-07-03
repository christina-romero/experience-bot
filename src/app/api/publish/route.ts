import { NextResponse } from "next/server";
import { publishToDrive, GOOGLE_ENABLED, type PublishKind } from "@/lib/google";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET() {
  // Lets the UI show/hide the Publish button based on server config.
  return NextResponse.json({ enabled: GOOGLE_ENABLED });
}

export async function POST(req: Request) {
  try {
    const { name, base64, kind } = (await req.json()) as { name: string; base64: string; kind: PublishKind };
    if (!name || !base64 || !kind) {
      return NextResponse.json({ error: "name, base64, and kind are required." }, { status: 400 });
    }
    const file = await publishToDrive({ name, base64, kind });
    return NextResponse.json(file);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Publish failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}