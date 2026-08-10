"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { PlusIcon, TrashIcon, CheckIcon, LogoMark } from "../Icons";
import { cx, groupLabel, timeLabel } from "@/lib/utils";
import type { ChatSummary } from "@/lib/persistence";

function grouped(conversations: ChatSummary[]) {
  const order = ["Today", "Yesterday", "This week", "Earlier"];
  const map = new Map<string, ChatSummary[]>();
  for (const c of conversations) {
    const label = groupLabel(c.updatedAt);
    map.set(label, [...(map.get(label) ?? []), c]);
  }
  return order.filter((o) => map.has(o)).map((o) => ({ label: o, items: map.get(o)! }));
}

function ConversationRow({
  item,
  active,
  onSelect,
  onDelete,
}: {
  item: ChatSummary;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [arm, setArm] = useState(false);

  return (
    <button
      className={cx("conv-item", active && "active")}
      onClick={onSelect}
      title={item.title}
    >
      <span className="conv-dot" style={active ? undefined : { background: "transparent" }} />
      <span className="conv-title">{item.title}</span>
      <span className="conv-time">{timeLabel(item.updatedAt)}</span>
      <span
        role="button"
        tabIndex={0}
        aria-label={arm ? "Confirm delete" : "Delete conversation"}
        className="icon-btn"
        style={{ width: 26, height: 26 }}
        title="Delete"
        onClick={(e) => {
          e.stopPropagation();
          if (!arm) {
            setArm(true);
            setTimeout(() => setArm(false), 2600);
          } else {
            onDelete();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.click();
        }}
      >
        {arm ? <CheckIcon width={13} height={13} /> : <TrashIcon width={13} height={13} />}
      </span>
    </button>
  );
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  userName,
  initials,
  presence,
  open,
  onClose,
  children,
}: {
  conversations: ChatSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  userName: string;
  initials: string;
  presence: { id: string; name: string }[];
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
}) {
  const groups = useMemo(() => grouped(conversations), [conversations]);
  const peers = presence.filter((p) => p.id !== "me");

  return (
    <>
      <aside className={cx("sidebar", open && "open")}>
        <div className="sidebar-brand">
          <Link href="/" className="brand-mark" aria-label="Milo home" title="Milo">
            <LogoMark />
          </Link>
          <div>
            <div className="brand-word">Milo</div>
            <div className="brand-sub">a chat that remembers</div>
          </div>
        </div>

        <button className="btn btn-accent sidebar-new" onClick={onNew}>
          <PlusIcon width={15} height={15} /> New chat
        </button>

        <div className="sidebar-scroll">
          {groups.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5, padding: "8px 12px" }}>
              No conversations yet. Say hello — the first message will create one.
            </p>
          )}
          {groups.map((g) => (
            <div key={g.label}>
              <div className="group-label">{g.label}</div>
              {g.items.map((item) => (
                <ConversationRow
                  key={item.id}
                  item={item}
                  active={item.id === activeId}
                  onSelect={() => onSelect(item.id)}
                  onDelete={() => onDelete(item.id)}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-foot">
          {peers.length > 0 && (
            <div style={{ fontSize: 11.5, color: "var(--muted)", padding: "2px 10px 8px", display: "flex", gap: 6, alignItems: "center" }}>
              <span className="pulse-dot" />
              {peers.length === 1 ? `${peers[0].name} is online` : `${peers.length} people are here right now`}
            </div>
          )}
          {children ?? (
            <div className="foot-user">
              <span className="avatar">
                {initials}
                <span className="online-dot" />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 650, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userName}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
      {open && <div className="backdrop" onClick={onClose} />}
    </>
  );
}