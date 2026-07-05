/**
 * Template registry: lesson type -> exact template file ID.
 *
 * Selection is deterministic (step 3 of the generation logic): a lesson type
 * resolves to one canonical key, and that key maps to one template ID per kind
 * (doc for the lesson plan, slides for the deck). No fuzzy matching.
 *
 * IDs are configured via the TEMPLATE_REGISTRY_JSON env var (a JSON object keyed
 * by canonical lesson type), so they can be updated without a code change:
 *   TEMPLATE_REGISTRY_JSON={"gradual_release":{"doc":"<id>","slides":"<id>"}, ...}
 * The built-in defaults are a convenience only; env entries override them.
 */

export type TemplateKind = "doc" | "slides";
type Entry = { doc?: string; slides?: string };

const DEFAULT_REGISTRY: Record<string, Entry> = {
  gradual_release: {
    doc: "159FRZGQbsJOuUI15mSH4S6e3Wd2XlANd-6hkjVAtCZk",
    slides: "1v-MudrimTKjfYI3YOtIuiaVZVmhLpfgIICsFqlalszs",
  },
};

function loadRegistry(): Record<string, Entry> {
  const raw = process.env.TEMPLATE_REGISTRY_JSON;
  if (!raw) return DEFAULT_REGISTRY;
  try {
    const parsed = JSON.parse(raw) as Record<string, Entry>;
    return { ...DEFAULT_REGISTRY, ...parsed };
  } catch {
    return DEFAULT_REGISTRY;
  }
}

/** Normalize a messy lesson-type label to one canonical registry key. */
export function canonicalLessonType(lessonType: string): string {
  const t = (lessonType || "").toLowerCase();
  if (t.includes("gradual release")) return "gradual_release";
  if (t.includes("simulation") && t.includes("invisible")) return "simulation_invisible";
  if (t.includes("simulation") && t.includes("performance")) return "simulation_performance";
  if (t.includes("simulation")) return "simulation";
  if (t.includes("skills lab") || t.includes("checkpoint")) return "skills_lab";
  if (t.includes("live performance")) return "live_performance";
  if (t.includes("cpc")) return "cpc";
  if (t.includes("direct")) return "direct_instruction";
  return t.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "unknown";
}

/** Resolve a lesson type + kind to a template ID (or null if not registered). */
export function resolveTemplateId(
  lessonType: string,
  kind: TemplateKind
): { id: string | null; key: string; known: string[] } {
  const key = canonicalLessonType(lessonType);
  const registry = loadRegistry();
  return { id: registry[key]?.[kind] ?? null, key, known: Object.keys(registry) };
}