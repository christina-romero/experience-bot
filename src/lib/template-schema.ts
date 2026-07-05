/**
 * Layer 1: Template Schema.
 *
 * The selected Google Doc / Slides template is the source of truth. We read its
 * text, extract every {{FIELD_NAME}} placeholder, and treat that exact set as the
 * required schema. The app may only generate values for those fields:
 *  - fields the AI returns that are NOT in the template are ignored (unmapped)
 *  - template fields with no value are reported as missing (Template Match Check)
 */

const PLACEHOLDER_RE = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g;

/** Every unique placeholder in the template, in first-seen order (bare names). */
export function extractPlaceholders(text: string): string[] {
  return analyzeTemplate(text).placeholders;
}

/**
 * Analyze the template's placeholders. Each placeholder must be unique with
 * exactly one destination; a placeholder that appears more than once is a
 * template authoring error (reported as a duplicate). Repeating collections
 * such as lesson phases are authored as enumerated unique fields
 * ({{PHASE_1_STEPS}}, {{PHASE_2_STEPS}}, ...), so they never repeat a name.
 */
export function analyzeTemplate(text: string): { placeholders: string[]; duplicates: string[] } {
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const m of text.matchAll(PLACEHOLDER_RE)) {
    const name = m[1];
    if (!counts.has(name)) order.push(name);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const duplicates = order.filter((n) => (counts.get(n) ?? 0) > 1);
  return { placeholders: order, duplicates };
}

/** The full "{{NAME}}" token form used as JSON keys in the structured object. */
export function toToken(name: string): string {
  return `{{${name}}}`;
}

/** Strip the braces off a "{{NAME}}" token to get the bare field name. */
export function fromToken(token: string): string {
  return token.replace(/^\{\{\s*|\s*\}\}$/g, "");
}

/**
 * A JSON Schema whose ONLY properties are the template's placeholders (keyed by
 * their full {{NAME}} token, per the Structured Lesson Object contract). Strict:
 * every field required, no additional properties, so the model can only produce
 * values for template fields.
 */
export function buildPlaceholderSchema(names: string[]): object {
  const tokens = names.map(toToken);
  return {
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(tokens.map((t) => [t, { type: "string" }])),
    required: tokens,
  };
}

export type TemplateMatchCheck = {
  mapped: Record<string, string>; // {{NAME}} -> value, only for real template fields with content
  unmapped: string[]; // keys the AI returned that are not template placeholders
  missing: string[]; // template placeholders with no value
};

/**
 * Reconcile a generated object against the template placeholders. Keys are the
 * full {{NAME}} token form.
 */
export function templateMatchCheck(
  placeholders: string[],
  generated: Record<string, string>
): TemplateMatchCheck {
  const validTokens = new Set(placeholders.map(toToken));
  const mapped: Record<string, string> = {};
  const missing: string[] = [];

  for (const name of placeholders) {
    const token = toToken(name);
    const value = generated[token];
    if (value && value.trim()) mapped[token] = value;
    else missing.push(token);
  }

  const unmapped = Object.keys(generated).filter((k) => !validTokens.has(k));

  return { mapped, unmapped, missing };
}

/** Convert {{NAME}} -> value into the bare-name replacements the fill fns expect. */
export function toReplacements(mapped: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(mapped).map(([token, v]) => [fromToken(token), v]));
}