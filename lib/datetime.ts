import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

const KST_TIMEZONE = "Asia/Seoul";

/**
 * datetime-local input 값(예: "2026-05-25T19:00")을 KST로 해석한 뒤
 * UTC ISO 문자열로 반환한다. 서버는 timestamptz로 저장하므로 UTC 기준.
 */
export function kstDateTimeLocalToIso(value: string): string {
  if (!value) throw new Error("datetime-local value is empty");
  const withSeconds = /\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  const dt = new Date(`${withSeconds}+09:00`);
  if (Number.isNaN(dt.getTime())) {
    throw new Error(`invalid datetime-local: ${value}`);
  }
  return dt.toISOString();
}

/**
 * UTC ISO 문자열을 KST 표시 형식으로 변환한다.
 * 예: "2026-05-25T10:00:00.000Z" → "5월 25일 (월) 19:00"
 */
export function formatKst(
  iso: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const dt = new Date(iso);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...options,
  }).format(dt);
}

/**
 * "지난 회차"·"다가오는 회차" 분기 판단. 회차 시작 시간이 지났는지.
 */
export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

/**
 * UTC ISO 문자열을 KST 날짜만으로 표시 (시간 제외).
 * 예: "2026-05-23T...Z" → "5월 23일"
 */
export function formatKstDate(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

/**
 * ISO 문자열을 KST 긴 포맷으로 (예: "2026년 5월 24일 (일) 오후 7:30")
 */
export function formatKstDateLong(iso: string): string {
  const zoned = toZonedTime(iso, KST_TIMEZONE);
  return format(zoned, "yyyy년 M월 d일 (E) a h:mm", { locale: ko });
}

/**
 * ISO 문자열을 KST 짧은 포맷으로 (예: "5/24 (일) 19:30")
 */
export function formatKstDateShort(iso: string): string {
  const zoned = toZonedTime(iso, KST_TIMEZONE);
  return format(zoned, "M/d (E) HH:mm", { locale: ko });
}

/**
 * 현재 시각 ISO 문자열 — 더미 데이터 생성용
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * N일 후의 ISO 문자열 — 더미 데이터 생성용 (음수 N으로 과거도 가능)
 */
export function isoFromNow(daysOffset: number, hour = 19, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
