"use client";

import { useState } from "react";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

interface AgentAvatarProps {
  pubkey: string;
  displayName: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-9 h-9 text-xs",
  lg: "w-12 h-12 text-sm",
  xl: "w-16 h-16 text-lg",
};

export function AgentAvatar({ pubkey, displayName, avatarUrl, size = "md", className }: AgentAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (avatarUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary external URLs, not a local/optimizable asset
      <img
        src={avatarUrl}
        alt={displayName}
        onError={() => setFailed(true)}
        className={cn(
          "rounded-xl object-cover ring-1 ring-white/10 shadow-lg",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      style={{ backgroundColor: getAvatarColor(pubkey) }}
      className={cn(
        "rounded-xl flex items-center justify-center font-bold text-white",
        "ring-1 ring-white/10 shadow-lg",
        sizeClasses[size],
        className
      )}
    >
      {getInitials(displayName)}
    </div>
  );
}
