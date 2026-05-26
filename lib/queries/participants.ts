import { createClient } from "@/lib/supabase/server";
import type { EventParticipant } from "@/types/event-participant";
import type { Event } from "@/types/event";
import type { Database } from "@/lib/database.types";

type ParticipantRow = Database["public"]["Tables"]["v2_event_participants"]["Row"];
type EventWithStatusRow = Database["public"]["Views"]["v2_events_with_status"]["Row"];

/** v2_event_participants row → 외부 EventParticipant 변환. */
function mapParticipantRow(row: ParticipantRow): EventParticipant {
  return {
    eventId: row.event_id,
    userId: row.user_id,
    joinedAt: row.joined_at,
  };
}

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

/** 특정 이벤트의 참여자 목록 (가입 빠른 순). */
export async function getParticipantsOfEvent(
  eventId: string,
): Promise<EventParticipant[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v2_event_participants")
    .select("*")
    .eq("event_id", eventId)
    .order("joined_at", { ascending: true });
  return (data ?? []).map(mapParticipantRow);
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

/** 특정 이벤트의 참여자 수 (head:true로 row 없이 카운트만). */
export async function countParticipantsOfEvent(eventId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("v2_event_participants")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);
  return count ?? 0;
}
