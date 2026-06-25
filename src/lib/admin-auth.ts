waimport { NextResponse } from "next/server";

export function getAdminToken(): string | null {
  const token = process.env.ADMIN_API_TOKEN?.trim();
  return token ? token : null;
}

export function isAdminRequest(authHeader: string | null): boolean {
  const token = getAdminToken();
  if (!token) return false;
  if (!authHeader) return false;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  return match[1] === token;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
