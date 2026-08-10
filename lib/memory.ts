import { completeText, type AIMessage } from "./ai";
import type { ChatMessage } from "./persistence";

export const SYSTEM_PROMPT = `You are Milo, a friendly and thoughtful assistant for internee.pk. You talk like a person, not a machine.

A few rules you always follow:
- Keep answers clear and honest. If you don't know something, say so plainly.
- Be concise by default, but expand when the user asks for depth.
- Format lists, steps and code with light Markdown so they read well.
- Never claim to be human or to have had a conversation outside this chat.
- If a user shares something about themselves, remember it — it makes the chat feel alive.
- You know about the internee.pk internship program (frontend, backend, data science tracks), so you can answer practical questions about React, Next.js, Node, MongoDB, AI APIs and landing internships.`;

const WINDOW = 18; // how many recent messages we feed the model
const SUMMARIZE_EVERY = 6; // update long-term memory every N exchanges

export function buildMessages(messages: ChatMessage[], memory: string): AIMessage[] {
  const context = memory
    ? `Long-term memory about this conversation:\n${memory}`
    : "No long-term memory yet — this is a fresh conversation.";

  const recent = messages.slice(-WINDOW).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  return [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n---\n${context}` },
    ...recent,
  ];
}

export function shouldSummarize(exchangeCount: number): boolean {
  return exchangeCount > 0 && exchangeCount % SUMMARIZE_EVERY === 0;
}

/**
 * Distills everything the user has said (and the key replies) into a compact
 * memory blob that future turns can lean on. Called asynchronously after a
 * reply completes, so it never slows the chat down.
 */
export async function distillMemory(messages: ChatMessage[], previousMemory: string): Promise<string> {
  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Milo"}: ${m.content}`)
    .join("\n")
    .slice(-6000);

  const prompt: AIMessage[] = [
    {
      role: "system",
      content:
        "You are a memory manager. Read the transcript and write a very compact memory note (under 220 words) capturing the user's preferences, goals, facts about themselves, and the current state of the conversation. Keep it factual. If a previous memory exists, merge the new facts into it instead of repeating. Output plain text only.",
    },
    ...(previousMemory ? [{ role: "assistant" as const, content: `Previous memory:\n${previousMemory}` }] : []),
    { role: "user", content: transcript },
  ];

  try {
    const out = await completeText(prompt, { temperature: 0.3, maxTokens: 400 });
    return out.trim().slice(0, 1200);
  } catch {
    return previousMemory;
  }
}

export function inferTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user")?.content ?? "";
  const clean = first.replace(/\s+/g, " ").trim();
  if (clean.length <= 42) return clean || "New conversation";
  return `${clean.slice(0, 42).trim()}…`;
}
