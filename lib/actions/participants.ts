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
  if (error && error.code !== "23505") throw error;

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/my-events");
  redirect(`/events/${eventId}`);
}

/**
 * 현재 로그인 사용자의 참여 기록을 삭제.
 * - 비로그인: 로그인 페이지로 리다이렉트 (정상 경로에서는 발생하지 않음).
 * - 존재하지 않는 행 삭제는 에러가 아님 — Supabase delete 는 0 row 도 success.
 */
export async function leaveEvent(eventId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("v2_event_participants")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id);
  if (error) throw error;

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/my-events");
}
