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
 *
 * 초기값:
 *   page.tsx 가 `getEventPublicUsers` RPC 결과의 length 로 계산해 prop 으로 전달
 *   (commit 237063c — RLS direct count 비대칭 회피).
 *
 * Realtime trade-off:
 *   마이그레이션 20260530000000 이 RLS 정책의 self-recursive 조건 4 를 제거한 후,
 *   `v2_event_participants_select` 가 self/host/admin 3 조건만 평가한다. Realtime
 *   채널도 같은 RLS 가 적용되므로, **비호스트 참여자는 다른 참여자의 INSERT/DELETE
 *   이벤트를 수신하지 못한다**. 결과:
 *   - host / admin: 자기 이벤트의 모든 참여자 변동을 즉시 카운트 반영.
 *   - 비호스트 참여자: 본인 가입/탈퇴 외 변동은 페이지 새로고침 시 반영.
 *   ROADMAP-v2.md 후속 추적 #1 (broadcast 채널 또는 보조 DEFINER 함수로 복원) 참조.
 *
 * publication: postgres_changes 가 작동하려면 v2_event_participants 가
 *   supabase_realtime publication 에 등록되어야 함 (migration 20260526000001 +
 *   1f464a6 에서 직접 apply).
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
