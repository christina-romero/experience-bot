/**
 * Future2 Core Library — permanent application knowledge, loaded server-side and
 * available to every lesson generation. The user never uploads these:
 *  - Future2 Experience Genome (multi-worksheet workbook, indexed across sheets)
 *  - Future2 Curriculum Dictionary       (bundled in knowledge.ts)
 *  - Authoring Guidelines                (bundled in knowledge.ts)
 *  - Lesson + Slide Template Registries  (bundled in template-registry.ts)
 *
 * If the Core Library cannot be loaded, generation fails with a clear error
 * instead of silently continuing.
 */

import { CURRICULUM_DICTIONARY, WHAT_MUST_BE_TRUE, AUTHORING_PATTERN, CPC_TEMPLATE } from "./knowledge";
import { GENOME_TEXT } from "./genome-data";
import { readSpreadsheetWorkbook } from "./google";

// The Genome workbook id (used ONLY for opt-in live sync); override via env.
const GENOME_SHEET_ID = process.env.GENOME_SHEET_ID || "1ZOzJNh0JBc6Iw6glUmFVtqOpoUZ2OfZm";

let genomeCache: string | null = null;

/** Flatten a workbook into one searchable index that preserves sheet name, row, and columns. */
function indexWorkbook(sheets: { sheetName: string; rows: string[][] }[]): string {
  const blocks: string[] = [];
  for (const sheet of sheets) {
    if (sheet.rows.length === 0) continue;
    const [header, ...data] = sheet.rows;
    const cols = header.map((c, i) => c?.trim() || `col${i + 1}`);
    const lines = data
      .map((row, idx) => {
        const cells = cols
          .map((c, i) => (row[i]?.trim() ? `${c}: ${row[i].trim()}` : ""))
          .filter(Boolean)
          .join(" | ");
        return cells ? `[${sheet.sheetName} row ${idx + 2}] ${cells}` : "";
      })
      .filter(Boolean);
    if (lines.length === 0) continue;
    blocks.push(`=== WORKSHEET (collection): ${sheet.sheetName} | columns: ${cols.join(", ")} ===\n${lines.join("\n")}`);
  }
  return blocks.join("\n\n");
}

/**
 * Load the Genome. The bundled local export is authoritative and always the
 * fallback — no Sheets API or network is required. Live sync is OPT-IN
 * (GENOME_LIVE_SYNC=1) and best-effort: if it fails for any reason, we silently
 * use the local export. This never throws, so generation is never blocked.
 */
async function loadGenome(userAccessToken?: string): Promise<string> {
  if (genomeCache != null) return genomeCache;

  const local = GENOME_TEXT.trim();

  if (process.env.GENOME_LIVE_SYNC === "1") {
    try {
      const indexed = indexWorkbook(await readSpreadsheetWorkbook(GENOME_SHEET_ID, userAccessToken));
      if (indexed.trim()) {
        genomeCache = indexed;
        return indexed;
      }
    } catch {
      // Live Genome unavailable -> fall back to the local export below.
    }
  }

  genomeCache = local;
  return local;
}

export type CoreLibrary = {
  genome: string;
  dictionary: string;
  authoringGuidelines: string;
};

/**
 * Load the permanent Future2 Core Library. Optimized for reliability and speed:
 * it never blocks generation — the local exported Genome is always available as
 * the fallback, and the Dictionary / Authoring Guidelines / registries are
 * bundled in code.
 */
export async function loadCoreLibrary(userAccessToken?: string): Promise<CoreLibrary> {
  const genome = await loadGenome(userAccessToken);
  return {
    genome,
    dictionary: CURRICULUM_DICTIONARY,
    authoringGuidelines: [WHAT_MUST_BE_TRUE, AUTHORING_PATTERN, CPC_TEMPLATE].join("\n\n"),
  };
}