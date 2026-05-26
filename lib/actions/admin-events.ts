"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { deleteEventCover } from "@/lib/storage/event-covers";

/**
 * 관리자 전용 이벤트 삭제 — Phase 3 Task 6.
 *
 * 3중 가드:
 *   1) proxy.ts admin 라우트 redirect (라우팅 경계)
 *   2) (authed) layout에서 requireAdmin (페이지 렌더 경계)
 *   3) Server Action 첫 줄 requireAdmin (실행 경계)
 *
 * 보안 보강:
 * - count:"exact" + 0-row 검증 — RLS가 row를 가렸을 때 silent success 방지.
 * - Postgrest error는 client에 직접 노출하지 않고 sanitized message로 변환.
 *
 * 감사 로그: 현재 console.warn — Vercel 로그 sink에 도달.
 * production audit_logs 테이블은 v2.x 스코프 (이번 phase 범위 외).
 */
export async function adminDeleteEvent({
  eventId,
  reason,
}: {
  eventId: string;
  reason: string;
}): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  // 감사 로그 — v2.x에서 audit_logs 테이블로 교체 예정.
  console.warn(`[admin] delete event ${eventId}, reason: ${reason || "(none)"}`);

  await deleteEventCover(eventId).catch(() => {
    /* storage 정리 실패는 silent — 객체가 이미 없을 수 있다. 행 삭제가 본질. */
  });

  const { error, count } = await supabase
    .from("v2_events")
    .delete({ count: "exact" })
    .eq("id", eventId);

  if (error) {
    console.error("[adminDeleteEvent] DB failure", {
      eventId,
      code: error.code,
    });
    throw new Error("이벤트 삭제에 실패했습니다");
  }
  if (count === 0) {
    throw new Error("이벤트를 찾을 수 없습니다");
  }

  revalidatePath("/admin/events");
  revalidatePath("/admin");
}
