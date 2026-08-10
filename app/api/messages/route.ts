import { NextRequest, NextResponse } from "next/server";
import { persistence } from "@/lib/persistence";
import { resolveOwner } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const owner = await resolveOwner(request);
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing conversation id." }, { status: 400 });

  const conversation = await persistence.getConversation(owner, id);
  if (!conversation) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ conversation });
}