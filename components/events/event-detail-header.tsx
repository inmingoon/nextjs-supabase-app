import { EventStatusBadge } from "./event-status-badge";
import { formatKstDateLong } from "@/lib/datetime";
import { MapPin, Calendar as CalendarIcon, Users } from "lucide-react";
import type { Event } from "@/types/event";

type Props = {
  event: Event;
  participantCount: number;
};

export function EventDetailHeader({ event, participantCount }: Props) {
  return (
    <header className="space-y-4">
      {event.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.coverImageUrl}
          alt={event.title}
          className="h-48 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-48 w-full items-center justify-center rounded-lg bg-muted">
          <CalendarIcon className="h-12 w-12 text-muted-foreground" />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight">{event.title}</h1>
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
          <p className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            참여자 {participantCount}명
          </p>
        </div>

        {event.description ? (
          <p className="pt-2 text-sm leading-relaxed text-foreground/90">
            {event.description}
          </p>
        ) : null}
      </div>
    </header>
  );
}
