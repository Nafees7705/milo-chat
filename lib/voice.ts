"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { guestHeaders } from "./guest";

/* ── Speech output ──────────────────────────────────────────── */

let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices(): void {
  if (typeof speechSynthesis === "undefined") return;
  const voices = speechSynthesis.getVoices();
  if (voices.length) cachedVoices = voices;
}

// Chrome loads voices asynchronously, long after the page starts. Keep
// refreshing so the first speak() doesn't permanently cache an empty list.
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = refreshVoices;
  refreshVoices();
}

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === "undefined") return [];
  refreshVoices();
  return cachedVoices;
}

function pickVoice(preferred?: string): SpeechSynthesisVoice | null {
  const voices = loadVoices();
  if (!voices.length) return null;
  if (preferred) {
    const match = voices.find((v) => v.name === preferred);
    if (match) return match;
  }
  const nice = voices.find((v) => v.name && /natural|neural|\bgoogle us english\b/i.test(v.name));
  return (
    nice ??
    voices.find((v) => v.lang.startsWith("en-GB")) ??
    voices.find((v) => v.lang.startsWith("en-US")) ??
    voices.find((v) => v.lang.startsWith("en")) ??
    voices[0]
  );
}

/* ── Playback state (so UI can show a single start/stop control) ─ */

let sessionId = 0;
let speaking = false;
type SpeakListener = (isSpeaking: boolean) => void;
const speakListeners = new Set<SpeakListener>();

function setSpeaking(value: boolean): void {
  if (speaking === value) return;
  speaking = value;
  for (const listener of speakListeners) listener(value);
}

export function subscribeSpeaking(listener: SpeakListener): () => void {
  speakListeners.add(listener);
  return () => {
    speakListeners.delete(listener);
  };
}

let playingText = "";
const textListeners = new Set<(text: string) => void>();

function setPlayingText(value: string): void {
  if (playingText === value) return;
  playingText = value;
  for (const listener of textListeners) listener(value);
}

export function usePlayingText(): string {
  return useSyncExternalStore(
    (listener) => {
      textListeners.add(listener);
      return () => {
        textListeners.delete(listener);
      };
    },
    () => playingText,
    () => ""
  );
}

/** Strip markdown that is hideous to hear (bold/italic stars, code ticks,
 *  links, headings, bullets, blockquote markers) before handing text to TTS. */
function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "\ncode block\n")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/^\s*>\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkText(text: string, maxLen = 200): string[] {
  const clean = cleanForSpeech(text);
  if (!clean) return [];
  const parts = clean.match(/[^.!?\n]+[.!?]?\s*/g) ?? [clean];
  const chunks: string[] = [];
  let buffer = "";
  for (const part of parts) {
    if (buffer && buffer.length + part.length > maxLen) {
      chunks.push(buffer);
      buffer = "";
    }
    buffer += part;
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

/**
 * Speak text aloud. If speech is already running, calling this stops it
 * instead (toggle). Pass `{ force: true }` to interrupt current speech and
 * start this text instead.
 */
export function speak(text: string, opts: { voice?: string; rate?: number; force?: boolean } = {}): void {
  if (typeof speechSynthesis === "undefined") return;
  const chunks = chunkText(text);
  if (!chunks.length) return;
  if (speaking && !opts.force) {
    cancelSpeak();
    return;
  }
  cancelSpeak();
  const id = ++sessionId;
  const voice = pickVoice(opts.voice);
  const rate = opts.rate ?? 1.02;
  setSpeaking(true);
  setPlayingText(text);

  let index = 0;
  const speakNext = () => {
    if (id !== sessionId) return;
    if (index >= chunks.length) {
      setSpeaking(false);
      setPlayingText("");
      return;
    }
    const utter = new SpeechSynthesisUtterance(chunks[index++]);
    if (voice) utter.voice = voice;
    utter.rate = Math.min(2, Math.max(0.5, rate));
    utter.pitch = 1.02;
    utter.onend = () => {
      // Chrome sometimes fires onend while the engine still reports
      // `speaking === true`; a cancel un-sticks it before the next chunk.
      if (id === sessionId && speechSynthesis.speaking) speechSynthesis.cancel();
      speakNext();
    };
    utter.onerror = (event) => {
      if (event.error === "canceled" || event.error === "interrupted") return;
      speakNext();
    };
    // A short gap between back-to-back utterances avoids Chrome's stutter
    // and dropped-chunk glitches when speaking long responses.
    setTimeout(() => {
      if (id !== sessionId) return;
      speechSynthesis.speak(utter);
    }, 30);
  };
  speakNext();
}

export function cancelSpeak(): void {
  if (typeof speechSynthesis === "undefined") return;
  sessionId++;
  setSpeaking(false);
  setPlayingText("");
  try {
    speechSynthesis.cancel();
  } catch {}
}

export function englishVoices(): SpeechSynthesisVoice[] {
  return loadVoices().filter((v) => v.lang.startsWith("en"));
}

/* ── Voice input (browser mic → Groq Whisper) ───────────────── */

export function useVoiceRecorder(opts: {
  onTranscribed: (text: string) => void;
  onError: (message: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const live = useRef<{ recorder: MediaRecorder; stream: MediaStream; blob: Promise<Blob> } | null>(null);
  const optsRef = useRef(opts);

  useEffect(() => {
    optsRef.current = opts;
  });

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      optsRef.current.onError("Your browser doesn't support the microphone.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      const blob = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
      });
      recorder.start(250);
      live.current = { recorder, stream, blob };
      setRecording(true);
    } catch {
      optsRef.current.onError("Microphone access was blocked — check the browser prompt.");
    }
  }, []);

  const stop = useCallback(async () => {
    const current = live.current;
    if (!current) return;
    setRecording(false);
    setBusy(true);
    current.stream.getTracks().forEach((t) => t.stop());
    current.recorder.stop();
    try {
      const audio = await current.blob;
      const form = new FormData();
      form.append("audio", audio, "voice.webm");
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: guestHeaders(),
        body: form,
      });
      const json = (await res.json()) as { text?: string; error?: string };
      if (json.text) optsRef.current.onTranscribed(json.text);
      else optsRef.current.onError(json.error ?? "Couldn't recognize anything. Try again.");
    } catch {
      optsRef.current.onError("Transcription failed — is the network up?");
    } finally {
      live.current = null;
      setBusy(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (recording) void stop();
    else void start();
  }, [recording, stop, start]);

  return { recording, busy, start, stop, toggle };
}