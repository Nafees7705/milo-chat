import { NextRequest } from "next/server";
import { chatStream } from "@/lib/ai";
import { persistence, type ChatDetail, type ChatMessage } from "@/lib/persistence";
import { buildMessages, distillMemory, inferTitle, shouldSummarize } from "@/lib/memory";
import { resolveOwner } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Payload = { conversationId?: string; message: string };

function sse(block: string): Uint8Array {
  return new TextEncoder().encode(block);
}

export async function POST(request: NextRequest) {
  const owner = await resolveOwner(request);
  if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    return Response.json({ error: "No AI provider key is configured. Add GROQ_API_KEY to .env.local." }, { status: 503 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const userText = (payload.message ?? "").trim();
  if (!userText) return Response.json({ error: "Message can't be empty." }, { status: 400 });

  let conversationId: string | null = payload.conversationId ?? null;
  let conversation: ChatDetail | null = null;
  try {
    conversation = conversationId ? await persistence.getConversation(owner, conversationId) : null;
    if (!conversation) {
      conversationId = await persistence.createConversation(owner);
      conversation = { id: conversationId, title: "New conversation", memory: "", messages: [], updatedAt: new Date().toISOString() };
    }
  } catch (err) {
    console.warn("[chat] Storage unavailable, continuing in-memory for this request.", err);
    conversationId = null;
    conversation = { id: "", title: "New conversation", memory: "", messages: [], updatedAt: new Date().toISOString() };
  }

  const userMsg: ChatMessage = { id: `m${conversation.messages.length}`, role: "user", content: userText };
  const history = [...conversation.messages];

  // Persist the user's message up front (optimistic UI is fine, server is source of truth).
  if (conversationId) {
    try {
      await persistence.appendMessages(owner, conversationId, [userMsg], {
        title: history.length === 0 ? inferTitle([userMsg]) : undefined,
      });
    } catch (err) {
      console.warn("[chat] Failed to persist user message.", err);
    }
  }

  const apiMessages = buildMessages([...history, userMsg], conversation.memory);

  try {
    const { deltas, model } = await chatStream(apiMessages);
    const reader = deltas.getReader();
    let assistantText = "";

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(sse(`data: {"type":"meta","model":"${model}"}\n\n`));
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            assistantText += value;
            controller.enqueue(sse(`data: ${JSON.stringify({ type: "delta", text: value })}\n\n`));
          }

          // Persist the finished assistant reply.
          if (assistantText.trim() && conversationId) {
            const reply: ChatMessage = {
              id: `m${conversation.messages.length + 1}`,
              role: "assistant",
              content: assistantText,
            };
            try {
              await persistence.appendMessages(owner, conversationId, [reply]);

              // Long-term memory: occasionally distil the whole thread.
              const totalExchanges = history.length / 2 + 1;
              if (shouldSummarize(Math.ceil(totalExchanges))) {
                void distillMemory([...history, userMsg, reply], conversation.memory).then((memory) =>
                  persistence.setMemory(owner, conversationId, memory)
                );
              }
            } catch (err) {
              console.warn("[chat] Failed to persist assistant reply.", err);
            }
          }

          controller.enqueue(
            sse(`data: ${JSON.stringify({ type: "done", conversationId, title: conversation.title })}\n\n`)
          );
        } catch (err) {
          controller.enqueue(
            sse(`data: ${JSON.stringify({ type: "error", message: String(err) })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
      cancel() {
        reader.cancel().catch(() => undefined);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Streaming failed." },
      { status: 502 }
    );
  }
}