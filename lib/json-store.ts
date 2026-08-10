import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ChatMessage, ChatDetail, ChatSummary } from "./persistence";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "store.json");

type StoredConv = {
  id: string;
  owner: string;
  title: string;
  memory: string;
  messages: { role: "user" | "assistant"; content: string }[];
  createdAt: string;
  updatedAt: string;
};

type Store = { conversations: StoredConv[] };

let cache: Store | null = null;

async function load(): Promise<Store> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(FILE, "utf8");
    cache = JSON.parse(raw) as Store;
  } catch {
    cache = { conversations: [] };
  }
  return cache;
}

async function save(): Promise<void> {
  if (!cache) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(cache, null, 2), "utf8");
}

function byOwner(store: Store, owner: string) {
  return store.conversations.filter((c) => c.owner === owner);
}

function serialize(c: StoredConv): ChatDetail {
  return {
    id: c.id,
    title: c.title || "New conversation",
    memory: c.memory || "",
    messages: c.messages.map((m, i) => ({ id: `m${i}`, role: m.role, content: m.content })),
    updatedAt: c.updatedAt,
  };
}

export const jsonStore = {
  async listConversations(owner: string): Promise<ChatSummary[]> {
    const store = await load();
    return byOwner(store, owner)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, 60)
      .map((c) => ({
        id: c.id,
        title: c.title,
        preview: (c.messages.at(-1)?.content ?? "").slice(0, 90),
        updatedAt: c.updatedAt,
        messageCount: c.messages.length,
      }));
  },

  async getConversation(owner: string, id: string): Promise<ChatDetail | null> {
    const store = await load();
    const c = byOwner(store, owner).find((c) => c.id === id);
    return c ? serialize(c) : null;
  },

  async createConversation(owner: string, title = "New conversation"): Promise<string> {
    const store = await load();
    const id = randomUUID();
    store.conversations.push({
      id,
      owner,
      title,
      memory: "",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await save();
    return id;
  },

  async appendMessages(
    owner: string,
    id: string,
    messages: ChatMessage[],
    opts?: { title?: string; memory?: string }
  ): Promise<void> {
    const store = await load();
    const c = byOwner(store, owner).find((c) => c.id === id);
    if (!c) return;
    c.messages.push(...messages.map((m) => ({ role: m.role, content: m.content })));
    c.updatedAt = new Date().toISOString();
    if (opts?.title) c.title = opts.title;
    if (opts?.memory !== undefined) c.memory = opts.memory;
    await save();
  },

  async setMemory(owner: string, id: string, memory: string): Promise<void> {
    const store = await load();
    const c = byOwner(store, owner).find((c) => c.id === id);
    if (!c) return;
    c.memory = memory;
    await save();
  },

  async deleteConversation(owner: string, id: string): Promise<void> {
    const store = await load();
    store.conversations = store.conversations.filter((c) => !(c.owner === owner && c.id === id));
    await save();
  },

  async stats(owner: string): Promise<{ count: number }> {
    const store = await load();
    return { count: byOwner(store, owner).length };
  },
};
