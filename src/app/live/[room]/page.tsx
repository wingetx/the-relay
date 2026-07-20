import { LiveRoomView } from "@/components/LiveRoomView";

export default function LiveRoomPage({ params }: { params: { room: string } }) {
  return <LiveRoomView room={params.room} />;
}
