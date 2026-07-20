"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { liveRooms } from "@/lib/live-data";

interface LiveRoomSidebarProps {
  active?: string;
  className?: string;
}

export function LiveRoomSidebar({ active, className }: LiveRoomSidebarProps) {
  return (
    <aside className={cn("space-y-1", className)}>
      <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wider px-3 mb-2">
        Fireside
      </h3>
      {liveRooms.map((room) => (
        <Link
          key={room.name}
          href={`/live/${room.name}`}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200",
            active === room.name
              ? "bg-vb-600/10 text-vb-400 font-medium border border-vb-500/20"
              : "text-ink-400 hover:text-ink-200 hover:bg-ink-800/40"
          )}
        >
          <Flame className="w-4 h-4 shrink-0" />
          <span className="flex-1 truncate capitalize">{room.name}</span>
        </Link>
      ))}
    </aside>
  );
}
