import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/types/event";
import type { Database } from "@/lib/database.types";

type EventWithStatusRow = Database["public"]["Views"]["v2_events_with_status"]["Row"];

/** v2_events_with_status view row → 외부 Event 타입 변환. status는 view에서 계산됨. */
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

/** id로 이벤트 조회. */
export async function getEventById(id: string): Promise<Event | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v2_events_with_status")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? mapEventRow(data) : null;
}

/** invite_code로 이벤트 조회. anon도 호출 가능 (SECURITY DEFINER 함수). */
export async function getEventByInviteCode(code: string): Promise<Event | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("v2_get_event_by_invite_code", {
    p_code: code,
  });
  // 함수 반환은 단일 row 형태. id 누락 시 미존재로 간주.
  if (!data || !(data as EventWithStatusRow).id) return null;
  return mapEventRow(data as EventWithStatusRow);
}

/** 특정 사용자가 생성한 이벤트 목록 (최신 일자 우선). */
export async function getEventsByCreator(userId: string): Promise<Event[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v2_events_with_status")
    .select("*")
    .eq("created_by", userId)
    .order("event_date", { ascending: false });
  return (data ?? []).map(mapEventRow);
}

/** 최근 생성 순 정렬 (limit 기본 5). */
export async function getRecentEvents(limit = 5): Promise<Event[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v2_events_with_status")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapEventRow);
}

/** upcoming 이벤트 — 시작시간 빠른 순. */
export async function getUpcomingEvents(limit = 5): Promise<Event[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v2_events_with_status")
    .select("*")
    .eq("status", "upcoming")
    .order("event_date", { ascending: true })
    .limit(limit);
  return (data ?? []).map(mapEventRow);
}

/** 관리자 페이지용 전체 이벤트 목록 (최근 생성 순). */
export async function listAllEventsForAdmin(): Promise<Event[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v2_events_with_status")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapEventRow);
}
