"use client";

import { useSyncExternalStore } from "react";

let cached: string | null = null;

export function getGuestId(): string {
  if (typeof window === "undefined") return "anonymous";
  if (cached) return cached;
  const key = "milo-guest-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `g_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(key, id);
  }
  cached = id;
  return id;
}

export function guestHeaders(): Record<string, string> {
  return { "x-guest-id": getGuestId() };
}

function subscribeGuestId() {
  return () => {};
}

export function useGuestId(): string {
  return useSyncExternalStore(subscribeGuestId, getGuestId, () => "");
}