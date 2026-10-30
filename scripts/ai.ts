// Any OpenAI-compatible chat API: NVIDIA's free tier by default, or Moonshot, OpenRouter, Hugging Face…
const BASE_URL = (process.env.AI_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");

// Tried in order. NVIDIA lists some models that aren't enabled for every account (404), so a model
// that 404s is dropped and the next one is used for the rest of the run. Override with a
// comma-separated AI_MODEL.
const models = (
  process.env.AI_MODEL ||
  [
    "moonshotai/kimi-k2.6",
    "google/gemma-4-31b-it",
    "mistralai/mistral-large-4-1t-a52b",
    "nvidia/nemotron-3.5-super-vl-120b-a12b",
    "deepseek-ai/deepseek-v4.1-flash",
  ].join(",")
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export class RateLimitError extends Error {}
/** No model on the list is usable with this key; retrying this run is pointless. */
export class NoModelError extends Error {}

export function currentModel() {
  return models[0];
}

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
  let busyRetries = 2;
  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i];
    if (models.length === 0) throw new NoModelError("None of the AI models are available for this key.");
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.AI_API_KEY}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({
        model: models[0],
        max_tokens: 16000,
        messages: [
          { role: "system", content: system },
          { role: "user", content: a.image ? parts : parts.filter((p) => p.type === "text") },
        ],
        ...(a.schema && { response_format: { type: "json_schema", json_schema: { name: "recipe", schema } } }),
      }),
    });
    if (res.status === 429) throw new RateLimitError("AI rate limit reached");
    // A provider having a moment (e.g. "content safety screening is temporarily unavailable").
    if ((res.status === 502 || res.status === 503) && busyRetries-- > 0) {
      await new Promise((r) => setTimeout(r, 15_000));
      i--;
      continue;
    }
    if (res.status === 404) {
      console.log(`  (model ${models.shift()} isn't available for this key; trying the next one)`);
      i = -1; // start this model's attempts from the top
      continue;
    }
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
