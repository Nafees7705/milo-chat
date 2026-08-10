import { Suspense } from "react";
import { ChatShell } from "@/components/ChatShell";
import { getUiUser } from "@/lib/server-session";
import { persistence, type ChatSummary } from "@/lib/persistence";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatPageLoading />}>
      <ChatPageBody />
    </Suspense>
  );
}

async function ChatPageBody() {
  const user = await getUiUser();
  let initial: ChatSummary[] = [];
  if (user) {
    try {
      initial = await persistence.listConversations(user.id);
    } catch {
      initial = [];
    }
  }
  return (
    <ChatShell
      initialConversations={initial}
      userName={user?.name ?? "Guest"}
      isGuest={user?.isGuest ?? true}
    />
  );
}

function ChatPageLoading() {
  return (
    <div className="chat-shell" aria-busy="true" aria-label="Loading your conversations">
      <aside className="sidebar" style={{ gap: 10 }}>
        <div className="sidebar-brand">
          <div className="skel" style={{ width: 34, height: 34, borderRadius: 11 }} />
          <div style={{ flex: 1 }}>
            <div className="skel" style={{ height: 14, width: "60%", marginBottom: 6 }} />
            <div className="skel" style={{ height: 9, width: "45%" }} />
          </div>
        </div>
        <div className="skel" style={{ height: 38, borderRadius: 999 }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skel" style={{ height: 34, borderRadius: 11 }} />
        ))}
      </aside>
      <main className="main">
        <div className="thread">
          <div className="welcome">
            <div className="skel" style={{ height: 38, width: "58%", margin: "0 auto 14px", borderRadius: 8 }} />
            <div className="skel" style={{ height: 16, width: "72%", margin: "0 auto 26px", borderRadius: 6 }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skel" style={{ height: 40, width: 190, borderRadius: 999 }} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}