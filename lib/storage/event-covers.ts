import { createClient } from "@/lib/supabase/server";

const BUCKET = "event-covers";

/** 서버측 업로드 허용 MIME / 확장자 / 크기 — public bucket이라 allowlist로 강제. */
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * 커버 이미지 업로드 (server-side, Server Action 내부에서 호출).
 * file path: events/{eventId}/cover.{ext} — Storage RLS와 동일 구조.
 * 반환: public URL (bucket이 public 이므로 직접 노출 가능).
 *
 * 보안: file.type · file.size · 확장자를 모두 server에서 allowlist 검사한다.
 * client의 accept="image/*"는 hint일 뿐이므로 신뢰하지 않는다.
 */
export async function uploadEventCover(
  eventId: string,
  file: File,
): Promise<string> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("지원하지 않는 이미지 형식입니다 (jpg/png/webp만 가능)");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("이미지는 2MB 이하여야 합니다");
  }
  const rawExt = (file.name.split(".").pop() ?? "").toLowerCase();
  const ext = ALLOWED_EXT.has(rawExt) ? rawExt : "jpg";

  const supabase = await createClient();
  const path = `events/${eventId}/cover.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * 이벤트 삭제 시 호출 — 확장자 추측 회피를 위해 list → remove 패턴.
 * 폴더가 비어 있으면 no-op.
 */
export async function deleteEventCover(eventId: string): Promise<void> {
  const supabase = await createClient();
  const { data: list } = await supabase.storage
    .from(BUCKET)
    .list(`events/${eventId}`);
  if (!list?.length) return;
  const paths = list.map((f) => `events/${eventId}/${f.name}`);
  await supabase.storage.from(BUCKET).remove(paths);
}

/**
 * 외부에서 path → public URL 변환이 필요할 때 사용.
 * (현재 events.ts에서는 upload 반환값을 그대로 쓰지만, 향후 재계산용으로 노출.)
 */
export async function getPublicUrl(path: string): Promise<string> {
  const supabase = await createClient();
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
