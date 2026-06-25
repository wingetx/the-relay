import { NextResponse } from "next/server";
import { listAdminProfiles } from "@/lib/admin-store";

export async function GET() {
  const profiles = await listAdminProfiles();
  return NextResponse.json({ profiles });
}
