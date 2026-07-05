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
    doc: "1698JdbcACDRhxOHeY1O1Sq9xncNPkunCF8jHLVtMadM",
    slides: "1eIFCWtXJglHISAXhSPyyrmu54XnoRgl24C_eFhqAK68",
  },
  skills_lab: {
    doc: "1NhQx0pgVLynkTeqKTDMdbUlnG_GfNFVStOte8VhjOZI",
    slides: "13Ofi31f2dZaClOUonWKA3VmukKggHUMCdn6OBWktEvM",
  },
  simulation_synthesis: {
    doc: "1Xb80JBGyvUkSTGtaiHPI8Nt2DQfd8E1wQoMC7I3RX9g",
    slides: "1EWi2VXEFdWDW1w8Aa9n-o-Z94AaW-aD7H944qDf0YLo",
  },
  cpc: {
    doc: "1zZYXSa5wMMbsgGwkxZE8XknH6cuI-YTzjyhdiFNTqFY",
    slides: "1_MDLSKslKKJ5PSkUSkGIWG_sSW5-PUmb8qIiFwN4RtM",
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

/**
 * Normalize a messy lesson-type label to one canonical registry key. Keys match
 * the registered templates: gradual_release, skills_lab, simulation_synthesis, cpc.
 */
export function canonicalLessonType(lessonType: string): string {
  const t = (lessonType || "").toLowerCase();
  if (t.includes("gradual release")) return "gradual_release";
  if (t.includes("simulation")) return "simulation_synthesis";
  if (t.includes("skills lab") || t.includes("checkpoint")) return "skills_lab";
  if (t.includes("cpc") || t.includes("live performance")) return "cpc";
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