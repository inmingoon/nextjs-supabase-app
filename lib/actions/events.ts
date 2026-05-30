"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { type ZodSchema } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  uploadEventCover,
  deleteEventCover,
} from "@/lib/storage/event-covers";
import { kstDateTimeLocalToIso } from "@/lib/datetime";
import { requireUser } from "@/lib/auth/require-user";
import { makeEventFormSchema } from "@/components/events/event-form-schema";

const createSchema = makeEventFormSchema({ enforceFutureDate: true });
const updateSchema = makeEventFormSchema({ enforceFutureDate: false });

/** 256bit base64url → invite link path-safe & 충분히 충돌 확률 낮음 */
function generateInviteCode(): string {
  return randomBytes(32).toString("base64url");
}

/** FormData → raw input object 추출 (createEvent·updateEvent 공통) */
function extractFormFields(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    title: get("title"),
    description: get("description"),
    eventDate: get("eventDate"),
    location: get("location"),
  };
}

/**
 * Zod safeParse → 실패 시 첫 번째 issue.message 만 사용자에게 노출.
 * 기본 ZodError.message 는 JSON-stringified issues 배열이라 UX 가 나쁘다.
 */
function parseOrThrow<T>(schema: ZodSchema<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      result.error.issues[0]?.message ?? "입력값이 올바르지 않습니다",
    );
  }
  return result.data;
}

/**
 * 이벤트 생성 — Phase 3 Task 4.
 * 1) Zod 검증 (createSchema: 미래 일시 강제)
 * 2) requireUser — 로그인 게이트 (RLS 의존하지 않고 명시적 실패)
 * 3) v2_events INSERT — invite_code 23505 충돌 시 최대 3회 재시도
 * 4) cover 파일이 있으면 Storage 업로드 후 cover_image_url 업데이트
 * 5) 캐시 무효화 + 상세 페이지로 redirect
 *
 * RLS: created_by = auth.uid() INSERT policy 가 보장 (v2_events).
 * Storage RLS: events/{id}/cover.{ext} path가 created_by 일치 시 INSERT 허용.
 */
export async function createEvent(formData: FormData): Promise<void> {
  const parsed = parseOrThrow(createSchema, extractFormFields(formData));
  const cover = formData.get("cover") as File | null;

  const { userId } = await requireUser();

  const supabase = await createClient();
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
        created_by: userId,
      })
      .select("id")
      .single();
    if (!error && data) {
      inserted = data;
      break;
    }
    // 23505 = unique_violation → invite_code 재생성하고 retry
    if (error?.code !== "23505") {
      console.error("[createEvent] DB failure", { code: error?.code });
      throw new Error("이벤트 생성에 실패했습니다");
    }
  }
  if (!inserted) throw new Error("invite_code 생성 3회 실패");

  if (cover && cover.size > 0) {
    const url = await uploadEventCover(inserted.id, cover);
    const { error: coverErr, count: coverCount } = await supabase
      .from("v2_events")
      .update({ cover_image_url: url }, { count: "exact" })
      .eq("id", inserted.id);
    if (coverErr) {
      console.error("[createEvent] cover URL update failure", {
        eventId: inserted.id,
        code: coverErr.code,
      });
      throw new Error("커버 URL 저장에 실패했습니다");
    }
    if (coverCount === 0) {
      throw new Error("커버 URL 저장에 실패했습니다 (event 행 없음)");
    }
  }

  revalidatePath("/");
  revalidatePath("/my-events");
  redirect(`/events/${inserted.id}`);
}

/**
 * 이벤트 수정 — Phase 3 Task 4.
 * - updateSchema: 과거 이벤트 수정 가능 (enforceFutureDate=false)
 * - requireUser → RLS owner-only 가 silent 0-row 반환하지 않도록 count 검증.
 * - cover 파일이 있으면 새로 업로드 후 cover_image_url 교체 (upsert).
 */
export async function updateEvent(
  eventId: string,
  formData: FormData,
): Promise<void> {
  const parsed = parseOrThrow(updateSchema, extractFormFields(formData));
  const cover = formData.get("cover") as File | null;

  await requireUser();

  const supabase = await createClient();
  const eventDateIso = kstDateTimeLocalToIso(parsed.eventDate);

  const { error, count } = await supabase
    .from("v2_events")
    .update(
      {
        title: parsed.title,
        description: parsed.description || null,
        event_date: eventDateIso,
        location: parsed.location,
      },
      { count: "exact" },
    )
    .eq("id", eventId);
  if (error) {
    console.error("[updateEvent] DB failure", { eventId, code: error.code });
    throw new Error("이벤트 수정에 실패했습니다");
  }
  if (count === 0) {
    throw new Error("이벤트를 찾을 수 없거나 수정 권한이 없습니다");
  }

  if (cover && cover.size > 0) {
    const url = await uploadEventCover(eventId, cover);
    const { error: coverErr, count: coverCount } = await supabase
      .from("v2_events")
      .update({ cover_image_url: url }, { count: "exact" })
      .eq("id", eventId);
    if (coverErr) {
      console.error("[updateEvent] cover URL update failure", {
        eventId,
        code: coverErr.code,
      });
      throw new Error("커버 URL 저장에 실패했습니다");
    }
    if (coverCount === 0) {
      throw new Error("커버 URL 저장에 실패했습니다 (event 행 없음)");
    }
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/my-events");
  redirect(`/events/${eventId}`);
}

/**
 * 이벤트 삭제 — Phase 3 Task 4.
 * - requireUser → 비로그인 silent 실패 방지.
 * - 커버 파일 먼저 정리 (실패해도 swallow → 객체가 이미 없을 수 있음)
 * - v2_events DELETE — RLS owner-only / admin, count로 권한 실패 감지.
 */
export async function deleteEvent(eventId: string): Promise<void> {
  await requireUser();

  const supabase = await createClient();
  await deleteEventCover(eventId).catch(() => {
    /* storage 정리 실패는 silent — 행 삭제가 본질. Task 8에서 logger 도입 시 보강 */
  });
  const { error, count } = await supabase
    .from("v2_events")
    .delete({ count: "exact" })
    .eq("id", eventId);
  if (error) {
    console.error("[deleteEvent] DB failure", { eventId, code: error.code });
    throw new Error("이벤트 삭제에 실패했습니다");
  }
  if (count === 0) {
    throw new Error("이벤트를 찾을 수 없거나 삭제 권한이 없습니다");
  }

  revalidatePath("/my-events");
  revalidatePath("/");
}
