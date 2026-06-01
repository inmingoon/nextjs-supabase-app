"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EventCard } from "@/components/events/event-card";
import { EventCardSkeleton } from "@/components/events/event-card-skeleton";
import { loadMoreUpcomingEvents } from "@/lib/actions/events";
import { UPCOMING_PAGE_SIZE } from "@/lib/queries/events-constants";
import type { Event } from "@/types/event";

type Props = {
  initialEvents: Event[];
};

/**
 * 홈 "다가오는 이벤트" 무한 스크롤.
 * 초기 페이지는 서버에서 SSR 후 props 로 전달되고, 이후 IntersectionObserver
 * 센티넬이 viewport 에 들어오면 다음 페이지를 append 한다.
 */
export function UpcomingEventsInfinite({ initialEvents }: Props) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [hasMore, setHasMore] = useState(
    initialEvents.length === UPCOMING_PAGE_SIZE,
  );
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      // offset 은 append-only 목록이라 현재 길이와 동치. offset 페이징 특성상
      // 두 페이지 fetch 사이 행 삽입/삭제 시 경계 행 중복/누락이 가능하나,
      // 표시용 "다가오는 이벤트" 그리드라 허용 (spec §3.1).
      const next = await loadMoreUpcomingEvents(events.length);
      setEvents((prev) => [...prev, ...next]);
      if (next.length < UPCOMING_PAGE_SIZE) setHasMore(false);
    } catch {
      // Server Action 실패 시 무한 재시도/스켈레톤 깜빡임 방지 — 관찰 중단.
      // (새로고침으로 복구 가능. 표시용 목록이라 별도 재시도 UI 미도입.)
      console.error("[UpcomingEventsInfinite] loadMore failed");
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [events.length, hasMore, isLoading]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <EventCardSkeleton key={`loading-${i}`} />
            ))
          : null}
      </div>
      {hasMore ? <div ref={sentinelRef} className="h-4 w-full" /> : null}
    </>
  );
}
