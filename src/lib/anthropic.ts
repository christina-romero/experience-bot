import Anthropic from "@anthropic-ai/sdk";
import { governingContext } from "./knowledge";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.local.example to .env.local and add your key, or set it in your deployment environment."
    );
  }
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

/**
 * Generate a structured JSON object with Claude, grounded in the governing
 * context. Uses adaptive thinking + high effort for design quality, and streams
 * so large outputs don't hit HTTP timeouts. Returns the parsed object of type T.
 */
export async function generateStructured<T>(
  userPrompt: string,
  schema: object,
  opts?: { maxTokens?: number }
): Promise<T> {
  const anthropic = getClient();

  // Built as a plain object and cast, because `adaptive` thinking and
  // `output_config` (effort + structured JSON format) are recent API params
  // whose exact typing varies across SDK versions. The SDK forwards these
  // fields to the Messages API as-is.
  const params = {
    model: MODEL,
    max_tokens: opts?.maxTokens ?? 32000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema },
    },
    system: [
      {
        type: "text",
        text: governingContext(),
        // Stable prefix -> cache it so repeated calls in a session are cheaper/faster.
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  } as unknown as Anthropic.MessageStreamParams;

  const stream = anthropic.messages.stream(params);

  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error("The model declined this request. Try rephrasing the inputs.");
  }

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text output was returned by the model.");
  }

  try {
    return JSON.parse(textBlock.text) as T;
  } catch {
    // Structured outputs should guarantee valid JSON; salvage a JSON object if wrapped.
    const match = textBlock.text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("The model output could not be parsed as JSON.");
  }
}

export { MODEL };