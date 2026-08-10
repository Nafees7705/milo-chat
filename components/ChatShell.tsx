"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "./chat/Sidebar";
import { Thread, type ThreadMsg } from "./chat/Thread";
import { Composer } from "./chat/Composer";
import { Welcome } from "./chat/Welcome";
import { AuthFooter } from "./AuthFooter";
import { ThemeToggle } from "./ThemeToggle";
import { MenuIcon, SpeakerIcon, SpeakerOffIcon } from "./Icons";
import { guestHeaders, useGuestId } from "@/lib/guest";
import { useRealtime } from "@/lib/use-realtime";
import { speak, cancelSpeak, subscribeSpeaking } from "@/lib/voice";
import type { ChatSummary } from "@/lib/persistence";
import { cx } from "@/lib/utils";

type Props = {
  initialConversations: ChatSummary[];
  userName: string;
  isGuest: boolean;
};

export function ChatShell({ initialConversations, userName, isGuest }: Props) {
  const [conversations, setConversations] = useState<ChatSummary[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMsg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [loadingThread, setLoadingThread] = useState(false);
  const [peerTyping, setPeerTyping] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;
  const peerTypingRef = useRef<string | null>(null);
  peerTypingRef.current = peerTyping;

  const gid = useGuestId();
  const displayName = isGuest ? (gid ? `Guest ${gid.slice(0, 4)}` : "Guest") : userName || "Milo explorer";

  // ── server data helpers ────────────────────────────────────
  const refreshList = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", { headers: guestHeaders() });
      const json = (await res.json()) as { conversations: ChatSummary[] };
      setConversations(json.conversations);
    } catch {
      /* keep what we have */
    }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/messages?id=${encodeURIComponent(id)}`, { headers: guestHeaders() });
      if (!res.ok) throw new Error("Missing");
      const json = (await res.json()) as {
        conversation: { messages: { role: "user" | "assistant"; content: string }[]; updatedAt: string };
      };
      setMessages(
        json.conversation.messages.map((m, i) => ({
          id: `s${i}`,
          role: m.role,
          content: m.content,
          sentAt: json.conversation.updatedAt,
        }))
      );
    } catch {
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  const pushToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  // ── realtime ───────────────────────────────────────────────
  const { online, join, sendTyping, sendSync } = useRealtime({
    onTyping: (conversationId, name, on) => {
      const sameConversationMaybe = !activeIdRef.current && conversationId !== "new";
      if (conversationId === activeIdRef.current && on && !sameConversationMaybe) {
        setPeerTyping(name);
        if (peerTimer.current) clearTimeout(peerTimer.current);
        peerTimer.current = setTimeout(() => setPeerTyping(null), 2600);
      } else if (!on) {
        setPeerTyping(null);
      }
    },
    onSync: (payload) => {
      if (payload.conversationId === activeIdRef.current && !busyRef.current) {
        void loadMessages(payload.conversationId);
      } else if (payload.message) {
        void refreshList();
      }
    },
  });

  // ── identity bootstrap ─────────────────────────────────────
  useEffect(() => {
    if (isGuest) {
      document.cookie = `milo_guest=${gid}; max-age=31536000; path=/`;
    }
    join(isGuest ? gid : "me", isGuest ? `Guest ${gid.slice(0, 4)}` : displayName);
    const t = setTimeout(() => void refreshList(), 0);
    return () => {
      clearTimeout(t);
      if (peerTimer.current) clearTimeout(peerTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest]);

  // ── conversation actions ───────────────────────────────────
  const openConversation = useCallback(
    (id: string) => {
      abortRef.current?.abort();
      setActiveId(id);
      setStreaming(false);
      setStreamText("");
      setMenuOpen(false);
      void loadMessages(id);
    },
    [loadMessages]
  );

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null);
    setMessages([]);
    setStreaming(false);
    setStreamText("");
    setMenuOpen(false);
    setModel(null);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await fetch("/api/conversations", {
          method: "DELETE",
          headers: { ...guestHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeIdRef.current === id) newChat();
      } catch {
        pushToast("Couldn't delete that conversation.");
      }
    },
    [newChat, pushToast]
  );

  // ── streaming send ─────────────────────────────────────────
  const send = useCallback(
    async (text: string, conversationId: string | null) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setStreaming(true);
      setStreamText("");
      setPeerTyping(null);

      const userMsg: ThreadMsg = { id: `u${Date.now()}`, role: "user", content: text, sentAt: new Date().toISOString() };
      setMessages((prev) => [...prev, userMsg]);

      const controller = new AbortController();
      abortRef.current = controller;
      let partial = "";

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { ...guestHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: conversationId ?? undefined, message: text }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? "The chat is unavailable right now.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let sep = -1;
          while ((sep = buf.indexOf("\n\n")) !== -1) {
            const raw = buf.slice(0, sep).trim();
            buf = buf.slice(sep + 2);
            if (!raw.startsWith("data:")) continue;
            let evt: { type: string; text?: string; conversationId?: string; title?: string; message?: string; model?: string };
            try {
              evt = JSON.parse(raw.replace(/^data:\s*/, ""));
            } catch {
              continue;
            }
            if (evt.type === "meta" && evt.model) {
              setModel(evt.model);
            } else if (evt.type === "delta" && evt.text) {
              partial += evt.text;
              setStreamText(partial);
            } else if (evt.type === "done") {
              const finalId = evt.conversationId ?? conversationId;
              setActiveId(finalId);
              const content = partial.trim();
              if (content) {
                setMessages((prev) => [...prev, { id: `a${Date.now()}`, role: "assistant", content, sentAt: new Date().toISOString() }]);
                if (readAloud) speak(content, { force: true });
              }
              if (finalId && content) sendSync({ conversationId: finalId, title: evt.title, message: content });
              void refreshList();
            } else if (evt.type === "error") {
              throw new Error(evt.message ?? "Something went wrong.");
            }
          }
        }
      } catch (err) {
        const aborted = err instanceof DOMException && err.name === "AbortError";
        if (aborted) {
          const tail = partial.trim();
          if (tail) {
            setMessages((prev) => [...prev, { id: `a${Date.now()}`, role: "assistant", content: tail, sentAt: new Date().toISOString() }]);
          }
        } else if (err instanceof Error) {
          pushToast(err.message);
        }
      } finally {
        busyRef.current = false;
        setStreaming(false);
        setStreamText("");
      }
    },
    [readAloud, refreshList, sendSync, pushToast]
  );

  const sendRef = useRef(send);
  sendRef.current = send;

  const handleSend = useCallback((text: string) => {
    sendRef.current(text, activeIdRef.current);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const regenerate = useCallback(() => {
    if (busyRef.current || !messages.length) return;
    const idx = [...messages].map((m) => m.role).lastIndexOf("user");
    if (idx === -1) return;
    const text = messages[idx].content;
    setMessages((prev) => prev.slice(0, idx + 1));
    void send(text, activeIdRef.current);
  }, [messages, send]);

  const toggleReadAloud = useCallback(() => {
    if (readAloud) cancelSpeak();
    setReadAloud((v) => !v);
  }, [readAloud]);

  useEffect(() => subscribeSpeaking(setIsSpeaking), []);

  const speakOne = useCallback((text: string) => speak(text), []);

  const onVoiceControls = useCallback(() => {
    if (isSpeaking) {
      cancelSpeak();
      return;
    }
    const lastBot = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastBot) speak(lastBot.content);
    else setReadAloud((v) => !v);
  }, [isSpeaking, messages]);

  const onTypingChange = useCallback(
    (on: boolean) => sendTyping(activeIdRef.current ?? "new", on),
    [sendTyping]
  );

  const onError = useCallback((message: string) => pushToast(message), [pushToast]);

  const emptyState = messages.length === 0 && !streaming && !loadingThread;
  const lastBotExists = messages.some((m) => m.role === "assistant");

  return (
    <div className="chat-shell">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={openConversation}
        onNew={newChat}
        onDelete={(id) => void deleteConversation(id)}
        onClose={() => setMenuOpen(false)}
        open={menuOpen}
        presence={online}
        userName={displayName}
        initials={isGuest ? "G" : "M"}
      >
        <AuthFooter guestLabel={displayName} />
      </Sidebar>

      <main className="main">
        <header className="main-header">
          <button className="icon-btn menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <MenuIcon width={16} height={16} />
          </button>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
            <div className="header-title">Milo</div>
            <span style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
              {activeId ? conversations.find((c) => c.id === activeId)?.title ?? "" : "new thread"}
            </span>
          </div>
          {model && (
            <span
              style={{ fontSize: 11, color: "var(--muted)", border: "1px solid var(--hairline)", background: "var(--panel)", padding: "2px 9px", borderRadius: 999, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}
              title={`Answered by ${model}`}
            >
              {model}
            </span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span className="presence" style={{ marginRight: 6 }}>
              <span className="pulse-dot" />
              {peerTyping ? `${peerTyping} is typing…` : online.length > 1 ? `${online.length} online` : "online"}
            </span>
            <button
              className="icon-btn"
              onClick={onVoiceControls}
              aria-label={
                isSpeaking
                  ? "Stop reading"
                  : lastBotExists
                    ? "Read the last reply aloud"
                    : readAloud
                      ? "Turn off voice replies"
                      : "Turn on voice replies"
              }
              title={
                isSpeaking
                  ? "Stop"
                  : lastBotExists
                    ? "Read reply"
                    : readAloud
                      ? "Voice replies on"
                      : "Voice replies off"
              }
            >
              {isSpeaking ? (
                <SpeakerOffIcon width={16} height={16} />
              ) : (
                <SpeakerIcon width={16} height={16} />
              )}
            </button>
            <ThemeToggle />
          </div>
        </header>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {emptyState ? (
            <div className="thread">
              <Welcome name={isGuest ? undefined : userName.split(" ")[0]} onPick={handleSend} />
            </div>
          ) : (
            <Thread
              messages={messages}
              streamText={streamText}
              streaming={streaming || loadingThread}
              onSpeak={speakOne}
              onRegenerate={regenerate}
            />
          )}
        </div>

        <Composer
          onSend={handleSend}
          onStop={stop}
          onError={onError}
          onTyping={onTypingChange}
          streaming={streaming}
          readAloudOn={readAloud}
          onToggleReadAloud={toggleReadAloud}
        />
      </main>

      <div className={cx("toast", toast && "show")} role="status">
        {toast}
      </div>
    </div>
  );
}