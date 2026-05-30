import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/types/event";
import type { Database } from "@/lib/database.types";

type EventWithStatusRow = Database["public"]["Views"]["v2_events_with_status"]["Row"];

/** v2_events_with_status row → 외부 Event 변환. */
function mapEventRow(row: EventWithStatusRow): Event {
  return {
    id: row.id!,
    title: row.title!,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    eventDate: row.event_date!,
    location: row.location!,
    inviteCode: row.invite_code!,
    createdBy: row.created_by!,
    status: row.status as Event["status"],
    createdAt: row.created_at!,
    updatedAt: row.updated_at!,
  };
}

/**
 * 특정 user가 참여한 이벤트 목록 (Event[] 반환).
 * view는 FK 정보가 없어 PostgREST embed 불가 → 2단계 쿼리.
 */
export async function getEventsOfParticipant(userId: string): Promise<Event[]> {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("v2_event_participants")
    .select("event_id, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
  if (!links || links.length === 0) return [];
  const eventIds = links.map((l) => l.event_id);
  const { data: events } = await supabase
    .from("v2_events_with_status")
    .select("*")
    .in("id", eventIds);
  if (!events) return [];
  // joined_at 순서 유지 — id → event 매핑 후 links 순서대로 재구성.
  const byId = new Map<string, EventWithStatusRow>();
  for (const e of events) {
    if (e.id) byId.set(e.id, e);
  }
  return links
    .map((l) => byId.get(l.event_id))
    .filter((e): e is EventWithStatusRow => e !== undefined)
    .map(mapEventRow);
}

/**
 * 이벤트 참여자의 공개 프로필(id/name/avatar) 조회 — RLS 우회용 SECURITY DEFINER 함수 호출.
 * 호출자는 해당 이벤트의 host 또는 참여자여야 함; 그 외는 빈 배열.
 * Task 2 review Important #1 (RLS 차단) + #3 (N+1) 동시 해소.
 */
export async function getEventPublicUsers(
  eventId: string,
): Promise<
  Array<{ id: string; fullName: string | null; avatarUrl: string | null }>
> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("v2_get_event_public_users", {
    p_event_id: eventId,
  });
  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
  }));
}
