import { NextRequest, NextResponse } from "next/server";
import { createAdminProfile, listAdminProfiles } from "@/lib/admin-store";
import { isAdminRequest, unauthorizedResponse } from "@/lib/admin-auth";
import type { AdminProfileInput } from "@/lib/admin-profiles";

function isAuthed(req: NextRequest): boolean {
  return isAdminRequest(req.headers.get("authorization"));
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return unauthorizedResponse();

  const includeDeleted = req.nextUrl.searchParams.get("includeDeleted") === "true";
  const profiles = await listAdminProfiles({ includeDeleted });
  return NextResponse.json({ profiles });
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return unauthorizedResponse();

  try {
    const body = (await req.json()) as AdminProfileInput;
    const profile = await createAdminProfile(body);
    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
