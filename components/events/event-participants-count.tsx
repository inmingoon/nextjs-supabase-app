"use client";

import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  eventId: string;
  initialCount: number;
};

/**
 * 참여자 카운트를 broadcast 로 실시간 갱신.
 *
 * 모델 (Phase 4-A):
 *   joinEvent/leaveEvent Server Action 이 DB 변경 성공 시 서버에서
 *   `event:{id}:participants` 채널로 { delta:±1 } broadcast 를 송신한다.
 *   이 컴포넌트는 그 broadcast 를 구독해 카운트를 누적 갱신한다.
 *   postgres_changes(=RLS·publication 의존) 를 쓰지 않으므로 호스트/참여자/비참여자
 *   전원이 동일하게 수신한다 (Phase 3 후속 추적 #1 복원).
 *
 * drift 보정:
 *   broadcast 는 best-effort 라 메시지 유실 시 카운트가 어긋날 수 있다.
 *   구독 성공(SUBSCRIBED) 시 + 탭 재가시화 시 서버 카운트를 1회 재조회해 덮어쓴다.
 *
 * 초기값:
 *   page.tsx 가 getEventPublicUsers RPC 결과 length 로 계산해 prop 으로 전달.
 */
export function EventParticipantsCount({ eventId, initialCount }: Props) {
  const [count, setCount] = useState(initialCount);

  // 서버 카운트 1회 재조회 (broadcast 유실 보정). 클라이언트도 같은 RPC 호출 가능.
  // 진행 중 broadcast delta 와 경합 시 RPC 결과(서버 권위)가 덮어쓴다 — 표시용
  // 카운트라 잠깐의 1 차이는 다음 broadcast/재가시화로 수렴 (의도된 동작).
  const resync = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.rpc("v2_get_event_public_users", {
      p_event_id: eventId,
    });
    if (data) setCount(data.length);
  }, [eventId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event:${eventId}:participants`)
      .on("broadcast", { event: "participant_change" }, ({ payload }) => {
        const delta = (payload as { delta?: number }).delta ?? 0;
        setCount((c) => Math.max(0, c + delta));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") resync();
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") resync();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [eventId, resync]);

  return (
    <p className="flex items-center gap-2">
      <Users className="h-4 w-4" />
      참여자 {count}명
    </p>
  );
}
