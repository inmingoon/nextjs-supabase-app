"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  eventId: string;
  initialCount: number;
};

/**
 * v2_event_participants 의 INSERT/DELETE 이벤트를 구독해 카운트를 즉시 갱신.
 * - 초기값은 server component (EventDetailHeader) 가 countParticipantsOfEvent 로
 *   계산해 prop 으로 전달 — 본 컴포넌트는 증감만 처리하고 재조회는 하지 않음.
 * - RLS 는 Realtime 에도 적용되므로 host/admin/같은 이벤트 참여자만 이벤트를 수신.
 * - postgres_changes 가 작동하려면 v2_event_participants 가 supabase_realtime
 *   publication 에 등록되어야 함 — 마이그레이션 20260526000001 참조.
 */
export function EventParticipantsCount({ eventId, initialCount }: Props) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event:${eventId}:participants`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "v2_event_participants",
          filter: `event_id=eq.${eventId}`,
        },
        () => setCount((c) => c + 1),
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "v2_event_participants",
          filter: `event_id=eq.${eventId}`,
        },
        () => setCount((c) => Math.max(0, c - 1)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return (
    <p className="flex items-center gap-2">
      <Users className="h-4 w-4" />
      참여자 {count}명
    </p>
  );
}
