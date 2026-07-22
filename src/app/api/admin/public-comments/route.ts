import { NextResponse } from "next/server";
import { listAdminComments } from "@/lib/admin-comment-store";
import type { AdminCommentRecord } from "@/lib/admin-comments";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Deleted comments are tombstones that still hold the original content
// server-side (so admins can restore them), but this route is unauthenticated
// — anyone can hit it. Strip the content of deleted comments down to just
// enough for clients to filter them out; only the id/deleted flag is needed.
function redact(comment: AdminCommentRecord): AdminCommentRecord {
  if (!comment.deleted) return comment;
  return { id: comment.id, deleted: true, createdAt: comment.createdAt, updatedAt: comment.updatedAt };
}

export async function GET() {
  // Include deleted tombstones so clients can hide moderated comments.
  const comments = await listAdminComments({ includeDeleted: true });
  return NextResponse.json({ comments: comments.map(redact) });
}
