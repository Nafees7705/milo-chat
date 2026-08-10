import { NextRequest, NextResponse } from "next/server";
import { persistence } from "@/lib/persistence";
import { resolveOwner } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const owner = await resolveOwner(request);
  const list = await persistence.listConversations(owner);
  return NextResponse.json({ conversations: list });
}

export async function POST() {
  // Conversation ids are minted lazily by /api/chat, so this only exists
  // to give the "New chat" button an eager, responsive fallback.
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const owner = await resolveOwner(request);
  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await persistence.deleteConversation(owner, id);
  return NextResponse.json({ ok: true });
}