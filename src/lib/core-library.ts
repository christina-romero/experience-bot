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
import { hasRegistryEntries } from "./template-registry";
import { readSpreadsheetWorkbook } from "./google";

// The Genome workbook id (from the shared sheet); override via env if it moves.
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

/** Load + index the Genome (bundled text wins; otherwise read every worksheet). Cached. */
async function loadGenome(userAccessToken?: string): Promise<string> {
  if (genomeCache) return genomeCache;

  const bundled = GENOME_TEXT.trim();
  if (bundled) {
    genomeCache = bundled;
    return bundled;
  }

  let sheets: { sheetName: string; rows: string[][] }[];
  try {
    sheets = await readSpreadsheetWorkbook(GENOME_SHEET_ID, userAccessToken);
  } catch (e) {
    const why = e instanceof Error ? e.message : "unknown error";
    throw new Error(
      `Core Library not loaded: could not read the Future2 Experience Genome workbook (${why}). Ensure the account has access to the Genome sheet, or bundle it in genome-data.ts.`
    );
  }
  const indexed = indexWorkbook(sheets);
  if (!indexed.trim()) {
    throw new Error("Core Library not loaded: the Future2 Experience Genome workbook returned no readable content.");
  }
  genomeCache = indexed;
  return indexed;
}

export type CoreLibrary = {
  genome: string;
  dictionary: string;
  authoringGuidelines: string;
};

/**
 * Load the permanent Future2 Core Library. Throws a clear error if a required
 * resource (Genome or template registry) is missing.
 */
export async function loadCoreLibrary(userAccessToken?: string): Promise<CoreLibrary> {
  if (!hasRegistryEntries()) {
    throw new Error("Core Library not loaded: the lesson/slide template registry is empty.");
  }
  const genome = await loadGenome(userAccessToken);
  return {
    genome,
    dictionary: CURRICULUM_DICTIONARY,
    authoringGuidelines: [WHAT_MUST_BE_TRUE, AUTHORING_PATTERN, CPC_TEMPLATE].join("\n\n"),
  };
}