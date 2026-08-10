import { connectDB } from "./db";
import { ConversationModel } from "./models";
import { jsonStore } from "./json-store";

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string };
export type ChatSummary = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  messageCount: number;
};
export type ChatDetail = {
  id: string;
  title: string;
  memory: string;
  messages: ChatMessage[];
  updatedAt: string;
};

function toId(id: unknown): string {
  return String(id);
}

function serialize(messages: { role: string; content: string }[]): ChatMessage[] {
  return messages.map((m, i) => ({ id: `m${i}`, role: m.role as ChatMessage["role"], content: m.content }));
}

async function backend(): Promise<"mongo" | "json"> {
  return (await connectDB()) ? "mongo" : "json";
}

export const persistence = {
  async listConversations(owner: string): Promise<ChatSummary[]> {
    if ((await backend()) === "json") return jsonStore.listConversations(owner);
    const docs = await ConversationModel.find({ owner }).sort({ updatedAt: -1 }).limit(60).lean();
    return docs.map((d) => ({
      id: toId(d._id),
      title: d.title || "New conversation",
      preview: (d.messages.at(-1)?.content ?? "").slice(0, 90),
      updatedAt: new Date(d.updatedAt ?? Date.now()).toISOString(),
      messageCount: d.messages.length,
    }));
  },

  async getConversation(owner: string, id: string): Promise<ChatDetail | null> {
    if ((await backend()) === "json") return jsonStore.getConversation(owner, id);
    const doc = await ConversationModel.findOne({ _id: id, owner }).lean();
    if (!doc) return null;
    return {
      id: toId(doc._id),
      title: doc.title || "New conversation",
      memory: doc.memory || "",
      messages: serialize(doc.messages),
      updatedAt: new Date(doc.updatedAt ?? Date.now()).toISOString(),
    };
  },

  async createConversation(owner: string, title = "New conversation"): Promise<string> {
    if ((await backend()) === "json") return jsonStore.createConversation(owner, title);
    const doc = await ConversationModel.create({ owner, title });
    return toId(doc._id);
  },

  async appendMessages(owner: string, id: string, messages: ChatMessage[], opts?: { title?: string; memory?: string }): Promise<void> {
    if ((await backend()) === "json") {
      await jsonStore.appendMessages(owner, id, messages, opts);
      return;
    }
    const patch: Record<string, unknown> = {
      $push: {
        messages: { $each: messages.map((m) => ({ role: m.role, content: m.content })) },
      },
      $set: { updatedAt: new Date() },
    };
    if (opts?.title) patch.$set = { ...(patch.$set as object), title: opts.title };
    if (opts?.memory !== undefined) patch.$set = { ...(patch.$set as object), memory: opts.memory };
    await ConversationModel.updateOne({ _id: id, owner }, patch);
  },

  async setMemory(owner: string, id: string, memory: string): Promise<void> {
    if ((await backend()) === "json") return jsonStore.setMemory(owner, id, memory);
    await ConversationModel.updateOne({ _id: id, owner }, { $set: { memory } });
  },

  async deleteConversation(owner: string, id: string): Promise<void> {
    if ((await backend()) === "json") return jsonStore.deleteConversation(owner, id);
    await ConversationModel.deleteOne({ _id: id, owner });
  },

  async stats(owner: string): Promise<{ count: number }> {
    if ((await backend()) === "json") return jsonStore.stats(owner);
    const count = await ConversationModel.countDocuments({ owner });
    return { count };
  },
};
