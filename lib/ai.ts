export type AIMessage = { role: "system" | "user" | "assistant"; content: string };

type Provider = "groq" | "openai" | "gemini";

const GROQ_BASE = "https://api.groq.com/openai/v1";
const OPENAI_BASE = "https://api.openai.com/v1";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

const DEFAULTS: Record<Provider, { model: string; key?: string }> = {
  groq: { model: "llama-3.3-70b-versatile", key: process.env.GROQ_API_KEY },
  openai: { model: "gpt-4o-mini", key: process.env.OPENAI_API_KEY },
  gemini: { model: "gemini-2.0-flash", key: process.env.GEMINI_API_KEY },
};

function activeProvider(): Provider {
  const p = (process.env.AI_PROVIDER ?? "groq").toLowerCase() as Provider;
  if (!DEFAULTS[p]) return "groq";
  return p;
}

export function providerInfo(): { provider: Provider; model: string; configured: boolean } {
  const p = activeProvider();
  return { provider: p, model: DEFAULTS[p].model, configured: Boolean(DEFAULTS[p].key) };
}

/**
 * Streams a chat completion and yields plain-text deltas.
 * Uses a hand-rolled SSE parser so it works with every OpenAI-compatible
 * endpoint (Groq, OpenAI) and Gemini's streaming response format.
 */
export async function chatStream(
  messages: AIMessage[],
  opts: { temperature?: number; maxTokens?: number; signal?: AbortSignal } = {}
): Promise<{ deltas: ReadableStream<string>; model: string; provider: Provider }> {
  const provider = activeProvider();
  const cfg = DEFAULTS[provider];
  if (!cfg.key) throw new Error(`No API key configured for provider "${provider}".`);

  const body = {
    model: cfg.model,
    messages,
    stream: true,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1024,
  };

  if (provider === "gemini") {
    const url = `${GEMINI_BASE}/models/${cfg.model}:streamGenerateContent?alt=sse&key=${cfg.key}`;
    const res = await fetch(url, {
      method: "POST",
      signal: opts.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { temperature: body.temperature, maxOutputTokens: body.max_tokens },
      }),
    });
    if (!res.ok || !res.body) throw new Error(`Gemini API ${res.status}: ${await safeText(res)}`);
    const raw = res.body;
    const stream = new ReadableStream<string>({
      async start(controller) {
        const reader = raw.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              const data = line.replace(/^data:\s*/, "");
              if (!data || data === "[DONE]") continue;
              try {
                const json = JSON.parse(data);
                const text = json.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
                if (text) controller.enqueue(text);
              } catch {
                /* skip keep-alive frames */
              }
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });
    return { deltas: stream, model: cfg.model, provider };
  }

  const base = provider === "groq" ? GROQ_BASE : OPENAI_BASE;
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    signal: opts.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error(`${provider} API ${res.status}: ${await safeText(res)}`);

  const raw = res.body;
  const stream = new ReadableStream<string>({
    async start(controller) {
      const reader = raw.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const data = line.replace(/^data:\s*/, "");
            if (!data) continue;
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content ?? "";
              if (delta) controller.enqueue(delta);
            } catch {
              /* skip partial frames */
            }
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });
  return { deltas: stream, model: cfg.model, provider };
}

/** Transcribes speech to text. Whisper is only available on Groq / OpenAI. */
export async function transcribe(audio: Blob): Promise<string> {
  const provider = activeProvider();
  const cfg = DEFAULTS[provider];
  if (!cfg.key) throw new Error(`No API key configured for provider "${provider}".`);
  if (provider === "gemini") {
    throw new Error("Gemini's simple API key can't transcribe audio. Set AI_PROVIDER=groq for voice input.");
  }

  const base = provider === "groq" ? GROQ_BASE : OPENAI_BASE;
  const model = provider === "groq" ? "whisper-large-v3-turbo" : "whisper-1";
  const form = new FormData();
  form.append("model", model);
  form.append("file", audio, "voice.webm");

  const res = await fetch(`${base}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.key}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Whisper ${res.status}: ${await safeText(res)}`);
  const json = (await res.json()) as { text?: string };
  return json.text ?? "";
}

/** Convenience: collect a streamed completion into a single string. */
export async function completeText(
  messages: AIMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const { deltas } = await chatStream(messages, opts);
  const reader = deltas.getReader();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += value;
  }
  return out;
}

async function safeText(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 240);
  } catch {
    return "";
  }
}
