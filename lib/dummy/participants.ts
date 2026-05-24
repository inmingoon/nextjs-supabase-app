import type { EventParticipant } from "@/types/event-participant";
import { isoFromNow } from "@/lib/datetime";
import { DUMMY_EVENTS } from "@/lib/dummy/events";
import { DUMMY_USERS } from "@/lib/dummy/users";

/**
 * Phase 2 더미 참여 관계 14건 — Phase 3에서 Supabase fetch로 교체.
 */
export const DUMMY_PARTICIPANTS: EventParticipant[] = [
  // e-001: 호스트 + 참가자 2
  { eventId: "e-001", userId: "u-001", joinedAt: isoFromNow(-3) },
  { eventId: "e-001", userId: "u-003", joinedAt: isoFromNow(-2) },
  { eventId: "e-001", userId: "u-004", joinedAt: isoFromNow(-1) },
  // e-002: 호스트 + 참가자 1
  { eventId: "e-002", userId: "u-002", joinedAt: isoFromNow(-5) },
  { eventId: "e-002", userId: "u-003", joinedAt: isoFromNow(-4) },
  // e-003: 호스트만
  { eventId: "e-003", userId: "u-001", joinedAt: isoFromNow(-1) },
  // e-004: 호스트 + 참가자 2
  { eventId: "e-004", userId: "u-002", joinedAt: isoFromNow(-2) },
  { eventId: "e-004", userId: "u-003", joinedAt: isoFromNow(-1) },
  { eventId: "e-004", userId: "u-004", joinedAt: isoFromNow(-1) },
  // e-005: 호스트
  { eventId: "e-005", userId: "u-001", joinedAt: isoFromNow(-7) },
  // e-006: 진행중 — 호스트 + 1
  { eventId: "e-006", userId: "u-002", joinedAt: isoFromNow(-1) },
  { eventId: "e-006", userId: "u-004", joinedAt: isoFromNow(0) },
  // e-007: 완료 — 호스트 + 참가자 1 (출석 누적)
  { eventId: "e-007", userId: "u-001", joinedAt: isoFromNow(-30) },
  { eventId: "e-007", userId: "u-003", joinedAt: isoFromNow(-25) },
];

// 14 rows total. 빠른 sanity check:
void DUMMY_EVENTS;
void DUMMY_USERS;

/** 특정 이벤트의 참여자 목록 */
export function getParticipantsOfEvent(eventId: string): EventParticipant[] {
  return DUMMY_PARTICIPANTS.filter((p) => p.eventId === eventId);
}

/** 특정 user가 참여한 이벤트 ID 목록 */
export function getEventsOfParticipant(userId: string): EventParticipant[] {
  return DUMMY_PARTICIPANTS.filter((p) => p.userId === userId);
}

/** 특정 이벤트의 참여자 수 */
export function countParticipantsOfEvent(eventId: string): number {
  return DUMMY_PARTICIPANTS.filter((p) => p.eventId === eventId).length;
}
