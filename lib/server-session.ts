import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { clerkEnabled, GUEST_PREFIX } from "./identity";

export type UiUser = {
  id: string;
  name: string;
  isGuest: boolean;
};
export async function getUiUser(): Promise<UiUser | null> {
  if (clerkEnabled()) {
    try {
      const [session, user] = await Promise.all([auth(), currentUser()]);
      if (session.userId) {
        const full = user?.firstName || user?.username;
        return {
          id: session.userId,
          name: full ? `${full}` : "Milo explorer",
          isGuest: false,
        };
      }
    } catch {
      /* fall through */
    }
  }

  const store = await cookies();
  const guestId = store.get("milo_guest")?.value;
  if (guestId) {
    return { id: `${GUEST_PREFIX}${guestId}`, name: `Guest ${guestId.slice(0, 4)}`, isGuest: true };
  }
  return null;
}

export function guestName(guestId: string): string {
  return `${guestId.slice(0, 4)} · ${guestId.slice(-4)}`.toUpperCase();
}