"use client";

import { LiveRoomView } from "@/components/LiveRoomView";
import { liveRooms } from "@/lib/live-data";

export default function LivePage() {
  return <LiveRoomView room={liveRooms[0].name} />;
}
