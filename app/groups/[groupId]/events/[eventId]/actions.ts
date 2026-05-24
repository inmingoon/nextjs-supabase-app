"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RespondState = {
  error?: string;
  status?: "going" | "not_going" | "pending";
};

type RsvpStatus = "going" | "not_going" | "pending";

const VALID_STATUSES: ReadonlySet<RsvpStatus> = new Set([
  "going",
  "not_going",
  "pending",
]);

function isValidStatus(value: unknown): value is RsvpStatus {
  return typeof value === "string" && VALID_STATUSES.has(value as RsvpStatus);
}

/**
 * 회차 RSVP를 upsert한다. RLS의 `ep_insert_self_before_lock` /
 * `ep_update_self_before_lock`가 `events.starts_at > now()` 조건을 강제하므로
 * 회차 시작 시간 이후 호출은 DB 거부.
 *
 * 응답: success 시 새 status 반환, 잠금/RLS 거부 시 user-friendly error 메시지.
 */
export async function respondToEventAction(
  _prev: RespondState,
  formData: FormData,
): Promise<RespondState> {
  const eventId = String(formData.get("eventId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!eventId) return { error: "회차 정보가 없습니다." };
  if (!isValidStatus(status)) return { error: "잘못된 응답 상태입니다." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("event_participations")
    .upsert(
      { event_id: eventId, user_id: userId, status, responded_at: new Date().toISOString() },
      { onConflict: "event_id,user_id" },
    );

  if (error) {
    // RLS WITH CHECK 위반은 PostgreSQL 에러 코드 42501 (insufficient_privilege)
    // 또는 23514 (check_violation)로 옴. 메시지는 user-friendly로 매핑.
    const msg = error.message ?? "";
    if (
      msg.includes("row-level security") ||
      msg.includes("violates check constraint") ||
      error.code === "42501"
    ) {
      return { error: "응답이 마감되었습니다." };
    }
    return { error: `응답에 실패했습니다: ${msg || "unknown"}` };
  }

  // 응답 명단·count가 즉시 반영되도록 회차 상세 path 무효화
  if (groupId) {
    revalidatePath(`/groups/${groupId}/events/${eventId}`);
  }

  return { status };
}
