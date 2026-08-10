import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

export const GUEST_PREFIX = "guest:";

export function clerkEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  );
}

/**
 * Resolves a stable identity string for a request.
 * Signed-in users get their Clerk userId; everyone else gets a
 * guest id passed along by the client.
 */
export async function resolveOwner(request: NextRequest): Promise<string> {
  if (clerkEnabled()) {
    try {
      const session = await auth();
      if (session.userId) return session.userId;
    } catch {
      /* fall through to guest */
    }
  }
  const guestId =
    request.headers.get("x-guest-id") ??
    request.headers.get("x-user-id") ??
    request.cookies.get("milo_guest")?.value;
  return guestId ? `guest:${guestId}` : `guest:anonymous`;
}

export function displayName(owner: string): string {
  if (!owner.startsWith(GUEST_PREFIX)) return "You";
  return "Guest";
}