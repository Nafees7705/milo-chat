"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "./Markdown";
import { CheckIcon, CopyIcon, SpeakerIcon, SpeakerOffIcon } from "../Icons";
import { timeLabel } from "@/lib/utils";
import { usePlayingText } from "@/lib/voice";

const BOT_GLYPH = "✦";

export type ThreadMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sentAt: string;
};

export function Thread({
  messages,
  streamText,
  streaming,
  onSpeak,
  onRegenerate,
}: {
  messages: ThreadMsg[];
  streamText?: string;
  streaming?: boolean;
  onSpeak?: (text: string) => void;
  onRegenerate?: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, streamText?.length, streaming]);

  return (
    <div className="thread" ref={ref}>
      <div className="thread-inner">
        {messages.map((m, i) => {
          const isLastBot = !streaming && m.role === "assistant" && i === messages.length - 1;
          return (
            <Message
              key={m.id}
              msg={m}
              canRegenerate={isLastBot}
              onSpeak={onSpeak}
              onRegenerate={onRegenerate}
            />
          );
        })}

        {streaming && (
          <div className="msg msg-bot">
            <div className="msg-ava">{BOT_GLYPH}</div>
            <div className="msg-body">
              {streamText ? (
                <div className="bubble bubble-bot">
                  <Markdown text={streamText} />
                  <span className="caret" aria-hidden />
                </div>
              ) : (
                <div className="bubble bubble-bot msg-bot-load">
                  <span className="dots">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Message({
  msg,
  canRegenerate,
  onSpeak,
  onRegenerate,
}: {
  msg: ThreadMsg;
  canRegenerate?: boolean;
  onSpeak?: (text: string) => void;
  onRegenerate?: () => void;
}) {
  const isUser = msg.role === "user";
  const playing = usePlayingText();
  const isPlayingThis = playing !== "" && playing === msg.content;

  return (
    <div className={isUser ? "msg msg-user" : "msg msg-bot"}>
      {!isUser && <div className="msg-ava">{BOT_GLYPH}</div>}
      <div className="msg-body">
        <div className={isUser ? "bubble bubble-user" : "bubble bubble-bot"}>
          {isUser ? msg.content : <Markdown text={msg.content} />}
        </div>
        {!isUser && (
          <div className="msg-actions">
            <button
              className="icon-btn"
              aria-label={isPlayingThis ? "Stop reading" : "Read aloud"}
              onClick={() => onSpeak?.(msg.content)}
            >
              {isPlayingThis ? (
                <SpeakerOffIcon width={15} height={15} />
              ) : (
                <SpeakerIcon width={15} height={15} />
              )}
            </button>
            <CopyButton text={msg.content} />
            {canRegenerate && (
              <button className="icon-btn" aria-label="Regenerate reply" onClick={onRegenerate}>
                <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-2.6-6.3" />
                  <path d="M21 3v6h-6" />
                </svg>
              </button>
            )}
          </div>
        )}
        {msg.sentAt && <span style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{timeLabel(msg.sentAt)}</span>}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button className="icon-btn" aria-label="Copy message" onClick={copy}>
      {copied ? <CheckIcon width={15} height={15} /> : <CopyIcon width={15} height={15} />}
    </button>
  );
}