"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import {
  uploadEventCover,
  deleteEventCover,
} from "@/lib/storage/event-covers";
import { kstDateTimeLocalToIso } from "@/lib/datetime";
import { makeEventFormSchema } from "@/components/events/event-form-schema";

const createSchema = makeEventFormSchema({ enforceFutureDate: true });
const updateSchema = makeEventFormSchema({ enforceFutureDate: false });

/** 256bit base64url → invite link path-safe & 충분히 충돌 확률 낮음 */
function generateInviteCode(): string {
  return randomBytes(32).toString("base64url");
}

/** FormData → raw input object 추출 (createEvent·updateEvent 공통) */
function extractFormFields(formData: FormData) {
  return {
    title: (formData.get("title") as string | null) ?? "",
    description: (formData.get("description") as string | null) ?? "",
    eventDate: (formData.get("eventDate") as string | null) ?? "",
    location: (formData.get("location") as string | null) ?? "",
  };
}

/**
 * 이벤트 생성 — Phase 3 Task 4.
 * 1) Zod 검증 (createSchema: 미래 일시 강제)
 * 2) v2_events INSERT — invite_code 23505 충돌 시 최대 3회 재시도
 * 3) cover 파일이 있으면 Storage 업로드 후 cover_image_url 업데이트
 * 4) 캐시 무효화 + 상세 페이지로 redirect
 *
 * RLS: created_by = auth.uid() INSERT policy 가 보장 (v2_events).
 * Storage RLS: events/{id}/cover.{ext} path가 created_by 일치 시 INSERT 허용.
 */
export async function createEvent(formData: FormData): Promise<void> {
  const parsed = createSchema.parse(extractFormFields(formData));
  const cover = formData.get("cover") as File | null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  const eventDateIso = kstDateTimeLocalToIso(parsed.eventDate);

  let inserted: { id: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const inviteCode = generateInviteCode();
    const { data, error } = await supabase
      .from("v2_events")
      .insert({
        title: parsed.title,
        description: parsed.description || null,
        event_date: eventDateIso,
        location: parsed.location,
        invite_code: inviteCode,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (!error && data) {
      inserted = data;
      break;
    }
    // 23505 = unique_violation → invite_code 재생성하고 retry
    if (error?.code !== "23505") {
      throw error;
    }
  }
  if (!inserted) throw new Error("invite_code 생성 3회 실패");

  if (cover && cover.size > 0) {
    const url = await uploadEventCover(inserted.id, cover);
    await supabase
      .from("v2_events")
      .update({ cover_image_url: url })
      .eq("id", inserted.id);
  }

  revalidatePath("/");
  revalidatePath("/my-events");
  redirect(`/events/${inserted.id}`);
}

/**
 * 이벤트 수정 — Phase 3 Task 4.
 * - updateSchema: 과거 이벤트 수정 가능 (enforceFutureDate=false)
 * - RLS: owner-only UPDATE policy 가 보장.
 * - cover 파일이 있으면 새로 업로드 후 cover_image_url 교체 (upsert).
 */
export async function updateEvent(
  eventId: string,
  formData: FormData,
): Promise<void> {
  const parsed = updateSchema.parse(extractFormFields(formData));
  const cover = formData.get("cover") as File | null;

  const supabase = await createClient();
  const eventDateIso = kstDateTimeLocalToIso(parsed.eventDate);

  const { error } = await supabase
    .from("v2_events")
    .update({
      title: parsed.title,
      description: parsed.description || null,
      event_date: eventDateIso,
      location: parsed.location,
    })
    .eq("id", eventId);
  if (error) throw error;

  if (cover && cover.size > 0) {
    const url = await uploadEventCover(eventId, cover);
    await supabase
      .from("v2_events")
      .update({ cover_image_url: url })
      .eq("id", eventId);
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/my-events");
  redirect(`/events/${eventId}`);
}

/**
 * 이벤트 삭제 — Phase 3 Task 4.
 * - 커버 파일 먼저 정리 (실패해도 swallow → 객체가 이미 없을 수 있음)
 * - v2_events DELETE — RLS owner-only / admin
 */
export async function deleteEvent(eventId: string): Promise<void> {
  const supabase = await createClient();
  await deleteEventCover(eventId).catch(() => {
    /* storage 정리 실패는 silent — 행 삭제가 본질 */
  });
  const { error } = await supabase
    .from("v2_events")
    .delete()
    .eq("id", eventId);
  if (error) throw error;

  revalidatePath("/my-events");
  revalidatePath("/");
}
