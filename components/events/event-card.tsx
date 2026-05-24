import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { formatKstDateLong } from "@/lib/datetime";
import type { Event } from "@/types/event";

type Props = {
  event: Event;
};

/**
 * 이벤트 카드 — 모바일/관리자 목록 공용.
 * 클릭 시 /events/[id]로 이동. cover image 없으면 그라데이션 fallback.
 */
export function EventCard({ event }: Props) {
  return (
    <Link href={`/events/${event.id}`} className="block">
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative h-32 w-full bg-gradient-to-br from-slate-200 to-slate-400 dark:from-slate-700 dark:to-slate-900">
          {event.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.coverImageUrl}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute right-2 top-2">
            <EventStatusBadge status={event.status} />
          </div>
        </div>
        <CardContent className="space-y-2 p-4">
          <h3 className="line-clamp-2 text-base font-semibold">
            {event.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatKstDateLong(event.eventDate)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
