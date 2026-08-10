"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function AuthFooter({ guestLabel }: { guestLabel: string }) {
  if (!clerkEnabled) {
    return (
      <div className="foot-user">
        <span className="avatar" style={{ background: "var(--ink)", color: "var(--bubble-user-ink)" }}>
          G
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 650, fontSize: 13.5 }}>{guestLabel}</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Guest · everything saved locally</div>
        </div>
      </div>
    );
  }

  return <ClerkFooter guestLabel={guestLabel} />;
}

function ClerkFooter({ guestLabel }: { guestLabel: string }) {
  const { isSignedIn, user } = useUser();

  if (isSignedIn && user) {
    return (
      <div className="foot-user">
        <UserButton />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 650, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.firstName || user.username || "Milo explorer"}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Signed in · chats sync to your account</div>
        </div>
      </div>
    );
  }

  return (
    <div className="foot-user">
      <span className="avatar" style={{ background: "var(--accent)" }}>
        ?
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 650, fontSize: 13.5 }}>{guestLabel}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
          <SignInButton mode="modal">
            <span style={{ textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer" }}>
              Sign in to sync chats
            </span>
          </SignInButton>
        </div>
      </div>
    </div>
  );
}