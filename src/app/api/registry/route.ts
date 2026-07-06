import { NextResponse } from "next/server";
import { resolveTemplateId } from "@/lib/template-registry";

export const runtime = "nodejs";

/**
 * Diagnostic: shows exactly what template registry the DEPLOYED app loaded.
 * Visit /api/registry to confirm TEMPLATE_REGISTRY_JSON parsed and which IDs
 * each design model resolves to. Exposes only Drive file IDs (not secrets).
 */
export async function GET() {
  const raw = process.env.TEMPLATE_REGISTRY_JSON;

  let parseError: string | null = null;
  let parsedKeys: string[] | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      parsedKeys = Object.keys(parsed);
    } catch (e) {
      parseError = e instanceof Error ? e.message : "JSON.parse failed";
    }
  }

  const models = [
    "Gradual Release and Discussion",
    "Simulation and Synthesis",
    "Skills Lab",
    "CPC",
  ];
  const resolved = models.map((lessonType) => {
    const doc = resolveTemplateId(lessonType, "doc");
    const slides = resolveTemplateId(lessonType, "slides");
    return { lessonType, canonicalKey: doc.key, docId: doc.id, slidesId: slides.id };
  });

  return NextResponse.json({
    envVarPresent: !!raw,
    envVarLength: raw?.length ?? 0,
    parseError, // non-null => malformed JSON, app is using DEFAULT (untokenized) IDs
    parsedKeys, // must be exactly: gradual_release, simulation_synthesis, skills_lab, cpc
    expectedKeys: ["gradual_release", "simulation_synthesis", "skills_lab", "cpc"],
    resolved, // the ACTUAL IDs the app will copy for each model
  });
}