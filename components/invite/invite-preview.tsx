"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { formatKstDateLong } from "@/lib/datetime";
import { MapPin, Calendar as CalendarIcon } from "lucide-react";
import type { Event } from "@/types/event";

export function InvitePreview({ event }: { event: Event }) {
  const router = useRouter();

  function handleJoin() {
    console.log("[Phase 2 dummy] join event", event.id);
    toast.success("참여가 완료되었습니다 (Phase 3에서 DB 등록)");
    router.push(`/events/${event.id}`);
  }

  const canJoin = event.status === "upcoming" || event.status === "ongoing";

  return (
    <div className="mx-auto w-full max-w-md space-y-5 rounded-lg border p-6">
      <div className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          이벤트 초대
        </p>
        <h1 className="text-xl font-bold leading-tight">{event.title}</h1>
        <EventStatusBadge status={event.status} />
      </div>

      <div className="space-y-1.5 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          {formatKstDateLong(event.eventDate)}
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {event.location}
        </p>
      </div>

      {event.description ? (
        <p className="text-sm leading-relaxed text-foreground/90">
          {event.description}
        </p>
      ) : null}

      <Button className="w-full" onClick={handleJoin} disabled={!canJoin}>
        {canJoin ? "참여하기" : "참여 불가 (종료된 이벤트)"}
      </Button>
    </div>
  );
}
