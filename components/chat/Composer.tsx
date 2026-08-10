"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MicIcon, SendIcon, SpeakerIcon, SquareIcon, SparkleIcon } from "../Icons";
import { useVoiceRecorder } from "@/lib/voice";
import { cx } from "@/lib/utils";

export function Composer({
  onSend,
  onStop,
  onError,
  onTyping,
  streaming,
  readAloudOn,
  onToggleReadAloud,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  onError: (message: string) => void;
  onTyping?: (typing: boolean) => void;
  streaming: boolean;
  readAloudOn: boolean;
  onToggleReadAloud?: () => void;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const typingTicker = useRef<ReturnType<typeof setInterval> | null>(null);

  const { recording, busy, toggle } = useVoiceRecorder({
    onTranscribed: (t) => {
      setText((prev) => (prev ? `${prev} ${t}` : t));
      ref.current?.focus();
    },
    onError,
  });

  useEffect(() => {
    if (!recording && !busy) ref.current?.focus();
  }, [recording, busy]);

  useEffect(() => {
    return () => {
      if (typingTicker.current) clearInterval(typingTicker.current);
    };
  }, []);

  const pingTyping = (value: string) => {
    onTyping?.(value.length > 0);
    if (typingTicker.current) clearInterval(typingTicker.current);
    typingTicker.current = setInterval(() => onTyping?.(value.length > 0), 2200);
  };

  const autoGrow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  };

  const submit = () => {
    const value = text.trim();
    if (!value || streaming) return;
    setText("");
    if (ref.current) ref.current.style.height = "auto";
    if (typingTicker.current) clearInterval(typingTicker.current);
    onTyping?.(false);
    onSend(value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const hint = recording
    ? "Listening — speak now."
    : busy
      ? "Turning speech into text…"
      : readAloudOn
        ? "Reads replies aloud · Enter to send"
        : "Enter to send · Shift+Enter for a new line";

  return (
    <div className="composer-wrap">
      <div className={cx("composer", recording && "rec")}>
        {busy && (
          <span className="wave" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <i key={i} style={{ animationDelay: `${i * 0.09}s` }} />
            ))}
          </span>
        )}
        <textarea
          ref={ref}
          value={text}
          rows={1}
          placeholder="Ask me anything…"
          aria-label="Your message"
          onChange={(e) => {
            setText(e.target.value);
            autoGrow();
            pingTyping(e.target.value);
          }}
          onKeyDown={onKeyDown}
        />
        <button
          className="icon-btn"
          aria-label={recording ? "Stop recording" : "Talk instead of typing"}
          onClick={toggle}
          title={recording ? "Stop recording" : "Speak to Milo"}
        >
          <MicIcon width={17} height={17} />
        </button>
        {streaming ? (
          <button className="stop-btn" aria-label="Stop generating" onClick={onStop}>
            <SquareIcon />
          </button>
        ) : (
          <button className="send-btn" aria-label="Send message" onClick={submit} disabled={!text.trim()}>
            <SendIcon />
          </button>
        )}
      </div>
      <div className="composer-hint">
        <span>{hint}</span>
        {onToggleReadAloud && (
          <button
            type="button"
            onClick={onToggleReadAloud}
            aria-pressed={readAloudOn}
            className="voice-pill"
            title={readAloudOn ? "Turn off voice replies" : "Turn on voice replies"}
          >
            <SpeakerIcon width={12} height={12} />
            {readAloudOn ? "Voice replies on" : "Voice replies off"}
          </button>
        )}
        <span>
          <SparkleIcon width={12} height={12} style={{ verticalAlign: -2 }} /> Milo can be wrong — double-check
          anything important.
        </span>
      </div>
    </div>
  );
}