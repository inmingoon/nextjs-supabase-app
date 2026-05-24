"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { kstDateTimeLocalToIso } from "@/lib/datetime";

export type CreateEventState = {
  error?: string;
};

/**
 * 회차를 생성한다. RLS의 events_insert_owner 정책이 owner 검증을 강제하므로
 * 비-owner의 호출은 DB 레이어에서 거부된다. groupId는 URL이 아닌 hidden input
 * 으로 전달되며 RLS가 신뢰 경계.
 */
export async function createEventAction(
  _prev: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const groupId = String(formData.get("groupId") ?? "");
  const startsAtLocal = String(formData.get("startsAt") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!groupId) return { error: "그룹 정보가 없습니다." };
  if (!startsAtLocal) return { error: "회차 시작 시간을 입력해 주세요." };
  if (location.length < 1 || location.length > 200) {
    return { error: "장소는 1~200자여야 합니다." };
  }
  if (memo.length < 1 || memo.length > 1000) {
    return { error: "메모는 1~1000자여야 합니다." };
  }

  let startsAtIso: string;
  try {
    startsAtIso = kstDateTimeLocalToIso(startsAtLocal);
  } catch {
    return { error: "회차 시작 시간이 올바르지 않습니다." };
  }

  // 과거 시점 차단 (UX 친화 — RLS는 INSERT 자체는 허용하지만 응답이 즉시 잠김)
  if (new Date(startsAtIso).getTime() < Date.now()) {
    return { error: "과거 시점은 등록할 수 없습니다." };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "로그인이 필요합니다." };

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      group_id: groupId,
      title: title.length > 0 ? title : null,
      starts_at: startsAtIso,
      location,
      memo,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !event) {
    return { error: `회차 생성에 실패했습니다: ${error?.message ?? "unknown"}` };
  }

  redirect(`/groups/${groupId}/events/${event.id}`);
}
