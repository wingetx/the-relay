import { NextResponse } from "next/server";
import { listAdminPosts } from "@/lib/admin-post-store";
import type { AdminPostRecord } from "@/lib/admin-posts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Deleted posts are tombstones that still hold the original content server-side
// (so admins can restore them), but this route is unauthenticated — anyone can
// hit it. Strip the content of deleted posts down to just enough for clients
// to filter them out; only the id/deleted flag is needed for that.
function redact(post: AdminPostRecord): AdminPostRecord {
  if (!post.deleted) return post;
  return { id: post.id, deleted: true, createdAt: post.createdAt, updatedAt: post.updatedAt };
}

export async function GET() {
  // Include deleted tombstones so clients can hide moderated posts.
  const posts = await listAdminPosts({ includeDeleted: true });
  return NextResponse.json({ posts: posts.map(redact) });
}
