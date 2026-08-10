"use client";

import { useSyncExternalStore } from "react";
import { greetingFor } from "@/lib/utils";

let cachedGreeting = "";
function getGreetingSnapshot(): string {
  const value = greetingFor();
  if (value !== cachedGreeting) cachedGreeting = value;
  return cachedGreeting;
}
function subscribeGreeting() {
  return () => {};
}

const STARTERS = [
  {
    mark: "/",
    label: "Explain React Server Components",
    prompt:
      "Explain React Server Components the way you'd explain them to a frontend intern building a first Next.js app.",
  },
  {
    mark: "}",
    label: "Plan a streaming-chat build",
    prompt:
      "I have two weeks off. Plan a focused sprint that ends with a streaming, voice-enabled AI chatbot. Be specific and keep it realistic.",
  },
  {
    mark: "→",
    label: "Smooth streaming text in React",
    prompt:
      "What are smarter ways to render streaming AI text in a React chat without janky re-renders? Give me a readable answer with code.",
  },
  {
    mark: "★",
    label: "Remember this for later",
    prompt:
      "For the rest of this chat, call me by no name, assume I'm a frontend developer, and prefer short, direct answers.",
  },
];

export function Welcome({ name, onPick }: { name?: string; onPick: (prompt: string) => void }) {
  const who = name || "friend";
  const greeting = useSyncExternalStore(subscribeGreeting, getGreetingSnapshot, () => "");
  const hello = greeting || "Hello";
  return (
    <div className="welcome">
      <h2>
        {hello}, {who}.
      </h2>
      <p>
        I&rsquo;m Milo &mdash; I stream my answers as I think, I remember what we talked
        about, and I can listen if you&rsquo;d rather talk than type.
      </p>
      <div className="quick-chips">
        {STARTERS.map((s) => (
          <button key={s.label} className="chip" onClick={() => onPick(s.prompt)}>
            <span className="chip-mark" aria-hidden>
              {s.mark}
            </span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}