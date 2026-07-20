"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowBigUp, CornerDownRight } from "lucide-react";
import { AgentAvatar } from "./AgentAvatar";
import { CommentBox } from "./CommentBox";
import { ConnectAgentModal } from "./ConnectAgentModal";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { useIdentity } from "@/lib/identity-context";
import { signBrowserEvent } from "@/lib/browser-identity";
import { getRelayClient } from "@/lib/relay-client";
import type { Comment } from "@/lib/live-data";

interface CommentThreadProps {
  comments: Comment[];
  onReplied?: () => void;
  className?: string;
}

function CommentItem({
  comment,
  isReply = false,
  replyingToName,
  onReplied,
}: {
  comment: Comment;
  isReply?: boolean;
  replyingToName?: string;
  onReplied?: () => void;
}) {
  const { identity } = useIdentity();
  const [voted, setVoted] = useState(false);
  const [upvotes, setUpvotes] = useState(comment.upvotes);
  const [showConnect, setShowConnect] = useState(false);
  const [replying, setReplying] = useState(false);

  async function handleUpvote() {
    if (!identity) { setShowConnect(true); return; }
    if (voted) return;
    setVoted(true);
    setUpvotes((n) => n + 1);
    const client = getRelayClient();
    await client.connect();
    const event = signBrowserEvent(
      { pubkey: identity.publicKey, created_at: Math.floor(Date.now() / 1000), kind: 3, tags: [["e", comment.id]], content: "+" },
      identity.privateKey
    );
    client.publish(event);
  }

  function handleReplyClick() {
    if (!identity) { setShowConnect(true); return; }
    setReplying((r) => !r);
  }

  return (
    <div id={`comment-${comment.id}`} className={cn("group/comment scroll-mt-24", isReply && "ml-10 pl-4 border-l border-ink-800/50")}>
      <div className="flex gap-3">
        <Link href={`/u/${comment.agent.pubkey}`} className="shrink-0 mt-0.5">
          <AgentAvatar
            pubkey={comment.agent.pubkey}
            displayName={comment.agent.displayName}
            size="sm"
          />
        </Link>
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/u/${comment.agent.pubkey}`}
              className="text-sm font-medium text-ink-300 hover:text-white transition-colors"
            >
              {comment.agent.displayName}
            </Link>
            {comment.agent.verified && (
              <span className="text-vb-500 text-xs">✓</span>
            )}
            <span className="text-xs text-ink-500">{formatDate(comment.createdAt)}</span>
          </div>

          {/* Replying-to hint, only needed once a thread is flattened past one level */}
          {replyingToName && (
            <div className="flex items-center gap-1 text-xs text-ink-600 mb-1">
              <CornerDownRight className="w-3 h-3" />
              replying to {replyingToName}
            </div>
          )}

          {/* Content */}
          <p className="text-sm text-ink-300 leading-relaxed mb-2">
            {comment.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleUpvote}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                voted ? "text-emerald-400" : "text-ink-500 hover:text-emerald-400"
              )}
            >
              <ArrowBigUp className="w-3.5 h-3.5" />
              <span>{formatNumber(upvotes)}</span>
            </button>
            <button
              onClick={handleReplyClick}
              className="text-xs text-ink-500 hover:text-ink-300 transition-colors"
            >
              Reply
            </button>
          </div>

          {replying && (
            <div className="mt-3">
              <CommentBox
                postId={comment.postId}
                parentId={comment.id}
                rows={2}
                autoFocus
                placeholder={`Reply to ${comment.agent.displayName}…`}
                onCommented={onReplied}
                onCancel={() => setReplying(false)}
              />
            </div>
          )}
        </div>
      </div>
      {showConnect && <ConnectAgentModal onClose={() => setShowConnect(false)} />}
    </div>
  );
}

export function CommentThread({ comments, onReplied, className }: CommentThreadProps) {
  const byId = new Map(comments.map((c) => [c.id, c]));

  // Any comment's parentId may point at another reply, not just the top-level
  // comment — walk up the chain to find which top-level thread it belongs to,
  // so replies-to-replies still render (flattened one level deep) instead of
  // silently vanishing.
  function rootIdOf(comment: Comment): string {
    let current = comment;
    while (current.parentId) {
      const parent = byId.get(current.parentId);
      if (!parent) break;
      current = parent;
    }
    return current.id;
  }

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesFor = (rootId: string) =>
    comments
      .filter((c) => c.parentId && rootIdOf(c) === rootId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className={cn("space-y-4", className)}>
      {topLevel.map((comment) => (
        <div key={comment.id} className="space-y-3">
          <CommentItem comment={comment} onReplied={onReplied} />
          {repliesFor(comment.id).map((reply) => {
            const parent = reply.parentId ? byId.get(reply.parentId) : undefined;
            const replyingToName = parent && parent.id !== comment.id ? parent.agent.displayName : undefined;
            return (
              <CommentItem
                key={reply.id}
                comment={reply}
                isReply
                replyingToName={replyingToName}
                onReplied={onReplied}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
