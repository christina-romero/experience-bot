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

  // Recovery: strip anything before the first { and after the last } (e.g. a
  // stray leading "a"), then re-validate. If it parses, `repaired` is a clean
  // one-line value you can paste back into Vercel.
  let repaired: string | null = null;
  let repairedValid = false;
  let repairedKeys: string[] | null = null;
  if (raw) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const slice = raw.slice(start, end + 1);
      try {
        const obj = JSON.parse(slice) as Record<string, unknown>;
        repaired = JSON.stringify(obj); // minified, canonical
        repairedKeys = Object.keys(obj);
        repairedValid = true;
      } catch {
        repaired = slice; // still broken; shown so you can eyeball it
        repairedValid = false;
      }
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
    repairedValid, // true => `repaired` is a clean value you can paste back into Vercel
    repairedKeys,
    repaired, // <-- copy THIS into a fresh TEMPLATE_REGISTRY_JSON, then redeploy
    resolved, // the ACTUAL IDs the app will copy for each model
  });
}