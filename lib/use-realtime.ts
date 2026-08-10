"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SyncPayload = {
  conversationId: string;
  title?: string;
  message?: string;
};

type Incoming =
  | { type: "presence"; online: { id: string; name: string }[] }
  | { type: "typing"; conversationId: string; name: string; on: boolean }
  | { type: "sync"; conversationId: string; title?: string; message?: string };

type Options = {
  onTyping?: (conversationId: string, name: string, on: boolean) => void;
  onSync?: (payload: SyncPayload) => void;
};

const RETRY = [0, 1000, 2500, 5000, 10000];

export function useRealtime(options?: Options) {
  const [online, setOnline] = useState<{ id: string; name: string }[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const joinedRef = useRef(false);
  const optsRef = useRef<Options | undefined>(options);
  const connectRef = useRef<() => void>(() => {});
  const pendingRef = useRef<string[]>([]);

  useEffect(() => {
    optsRef.current = options;
  });

  const rawSend = useCallback((data: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    } else {
      pendingRef.current.push(data);
    }
  }, []);

  const openSocket = useCallback(() => {
    if (wsRef.current) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const wsPath = process.env.NEXT_PUBLIC_WS_PATH || "/ws";
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL || `${proto}://${window.location.host}${wsPath}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      retryRef.current = 0;
      const queue = pendingRef.current.splice(0);
      for (const data of queue) ws.send(data);
      const meta = JSON.parse(localStorage.getItem("milo-member") || "null");
      if (joinedRef.current && meta) {
        ws.send(JSON.stringify({ type: "join", id: meta.id, name: meta.name }));
      }
    };

    ws.onmessage = (event) => {
      let msg: Incoming;
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }
      const opts = optsRef.current;
      if (msg.type === "presence") setOnline(msg.online);
      else if (msg.type === "typing") opts?.onTyping?.(msg.conversationId, msg.name, msg.on);
      else if (msg.type === "sync") opts?.onSync?.({ conversationId: msg.conversationId, title: msg.title, message: msg.message });
    };

    ws.onclose = () => {
      wsRef.current = null;
      setConnected(false);
      const wait = RETRY[Math.min(retryRef.current++, RETRY.length - 1)];
      setTimeout(() => connectRef.current(), wait);
    };
  }, []);

  useEffect(() => {
    connectRef.current = openSocket;
  });

  useEffect(() => {
    openSocket();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [openSocket]);

  const join = useCallback((id: string, name: string) => {
    joinedRef.current = true;
    localStorage.setItem("milo-member", JSON.stringify({ id, name }));
    rawSend(JSON.stringify({ type: "join", id, name }));
    connectRef.current();
  }, [rawSend]);

  const sendTyping = useCallback(
    (conversationId: string, on: boolean) => {
      rawSend(JSON.stringify({ type: "typing", conversationId, on }));
    },
    [rawSend]
  );

  const sendSync = useCallback(
    (payload: SyncPayload) => {
      rawSend(JSON.stringify({ type: "sync", ...payload }));
    },
    [rawSend]
  );

  return { online, connected, join, sendTyping, sendSync };
}