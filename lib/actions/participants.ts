"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * 현재 로그인 사용자를 v2_event_participants 에 등록.
 * - 비로그인: invite 페이지는 proxy whitelist 라 익명 접근 가능 → redirect 로 로그인 유도
 *   (requireUser throw 패턴 대신, "참여하려면 로그인" UX 보존).
 * - 23505 unique_violation: 이미 참여 중인 경우 silent 통과 — 멱등 동작.
 * - 성공 시 이벤트 상세로 리다이렉트 (invite 페이지에서 호출되는 흐름 기준).
 */
export async function joinEvent(eventId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/auth/login?redirect=${encodeURIComponent(`/events/${eventId}`)}`,
    );
  }

  const { error } = await supabase.from("v2_event_participants").insert({
    event_id: eventId,
    user_id: user.id,
  });
  // 23505 = unique_violation (이미 참여 중) → idempotent silent pass.
  // supabase-js 가 향후 error.code 표면을 바꿔도 message regex 가 fallback.
  if (error) {
    const isDuplicate =
      error.code === "23505" || /duplicate key/i.test(error.message);
    if (!isDuplicate) throw error;
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/my-events");
  redirect(`/events/${eventId}`);
}

/**
 * 현재 로그인 사용자의 참여 기록을 삭제.
 * - 비로그인: 로그인 페이지로 리다이렉트 (정상 경로에서는 발생하지 않음).
 * - count: "exact" 로 0-row delete 감지 → "이미 탈퇴했거나 권한이 없습니다" 명시 실패.
 *   (Task 4 review I3 학습 — RLS silent 0-row 가 user trust 를 해친다.)
 */
export async function leaveEvent(eventId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error, count } = await supabase
    .from("v2_event_participants")
    .delete({ count: "exact" })
    .eq("event_id", eventId)
    .eq("user_id", user.id);
  if (error) throw error;
  if (count === 0) {
    throw new Error("참여 기록을 찾을 수 없습니다");
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/my-events");
}
