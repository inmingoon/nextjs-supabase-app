"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { formatKstDateLong } from "@/lib/datetime";
import { MapPin, Calendar as CalendarIcon } from "lucide-react";
import { joinEvent } from "@/lib/actions/participants";
import { isRedirectError } from "@/lib/redirect-error";
import type { Event } from "@/types/event";

export function InvitePreview({ event }: { event: Event }) {
  const [isPending, startTransition] = useTransition();

  function handleJoin() {
    startTransition(async () => {
      try {
        await joinEvent(event.id);
      } catch (e) {
        // Server Action 성공 시 redirect 가 throw 하는 NEXT_REDIRECT 는
        // navigation control flow 라 반드시 다시 throw 해야 한다.
        if (isRedirectError(e)) throw e;
        toast.error(e instanceof Error ? e.message : "참여 실패");
      }
    });
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

      <Button
        className="w-full"
        onClick={handleJoin}
        disabled={!canJoin || isPending}
      >
        {canJoin ? "참여하기" : "참여 불가 (종료된 이벤트)"}
      </Button>
    </div>
  );
}
