// Any OpenAI-compatible chat API: NVIDIA (default, free Kimi K2.6), Moonshot, OpenRouter, Hugging Face…
const BASE_URL = (process.env.AI_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");
const MODEL = process.env.AI_MODEL || "moonshotai/kimi-k2.6";

export class RateLimitError extends Error {}

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

function parseJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error(`AI returned no JSON: ${text.slice(0, 200)}`);
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * Asks for a JSON object matching `schema`. Not every provider supports images or JSON schemas,
 * so on a 400 it retries with less: first without the schema, then without the image.
 */
export async function askJson(system: string, parts: Part[], schema: object): Promise<unknown> {
  const hasImage = parts.some((p) => p.type === "image_url");
  const attempts = [
    { image: true, schema: true },
    { image: true, schema: false },
    ...(hasImage ? [{ image: false, schema: false }] : []),
  ];

  let lastError = "";
  for (const a of attempts) {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.AI_API_KEY}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(300_000),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        messages: [
          { role: "system", content: system },
          { role: "user", content: a.image ? parts : parts.filter((p) => p.type === "text") },
        ],
        ...(a.schema && { response_format: { type: "json_schema", json_schema: { name: "recipe", schema } } }),
      }),
    });
    if (res.status === 429) throw new RateLimitError("AI rate limit reached");
    if (res.status === 400 || res.status === 422) {
      lastError = await res.text();
      continue;
    }
    if (!res.ok) throw new Error(`AI error ${res.status}: ${(await res.text()).slice(0, 300)}`);

    const body = await res.json();
    const choice = body.choices?.[0];
    if (choice?.finish_reason === "length") throw new Error("AI ran out of room before finishing the recipe.");
    return parseJson(choice?.message?.content ?? "");
  }
  throw new Error(`AI rejected the request: ${lastError.slice(0, 300)}`);
}
