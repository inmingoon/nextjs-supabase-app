import type { EventParticipant } from "@/types/event-participant";
import { DUMMY_EVENTS } from "@/lib/dummy/events";
import { DUMMY_USERS } from "@/lib/dummy/users";
import type { Event } from "@/types/event";

/**
 * Phase 2 더미 참여 관계 14건 — Phase 3에서 Supabase fetch로 교체.
 * e-007·e-008·e-009는 의도적으로 0명 (empty state 테스트 용).
 */
export const DUMMY_PARTICIPANTS: EventParticipant[] = [
  // e-001 (Cache Components 모임) — 3명
  { eventId: "e-001", userId: "u-003", joinedAt: "2026-05-11T09:00:00Z" },
  { eventId: "e-001", userId: "u-004", joinedAt: "2026-05-12T10:00:00Z" },
  { eventId: "e-001", userId: "u-005", joinedAt: "2026-05-13T11:00:00Z" },

  // e-002 (RLS 워크샵) — 2명
  { eventId: "e-002", userId: "u-003", joinedAt: "2026-05-13T09:00:00Z" },
  { eventId: "e-002", userId: "u-004", joinedAt: "2026-05-14T10:00:00Z" },

  // e-003 (TS 5.x) — 1명
  { eventId: "e-003", userId: "u-003", joinedAt: "2026-05-15T09:00:00Z" },

  // e-004 (RSC 심화 — ongoing) — 2명
  { eventId: "e-004", userId: "u-003", joinedAt: "2026-05-02T09:00:00Z" },
  { eventId: "e-004", userId: "u-004", joinedAt: "2026-05-03T10:00:00Z" },

  // e-005 (토요 코딩 — completed) — 4명
  { eventId: "e-005", userId: "u-002", joinedAt: "2026-04-26T09:00:00Z" },
  { eventId: "e-005", userId: "u-003", joinedAt: "2026-04-27T10:00:00Z" },
  { eventId: "e-005", userId: "u-004", joinedAt: "2026-04-28T11:00:00Z" },
  { eventId: "e-005", userId: "u-005", joinedAt: "2026-04-29T12:00:00Z" },

  // e-006 (Tailwind — completed) — 1명
  { eventId: "e-006", userId: "u-003", joinedAt: "2026-04-21T09:00:00Z" },

  // e-010 (오픈소스 — completed) — 2명
  { eventId: "e-010", userId: "u-003", joinedAt: "2026-04-11T09:00:00Z" },
  { eventId: "e-010", userId: "u-004", joinedAt: "2026-04-12T10:00:00Z" },
];

// sanity check imports (Phase 3에서 join용)
void DUMMY_USERS;

/** 특정 이벤트의 참여자 목록 */
export function getParticipantsOfEvent(eventId: string): EventParticipant[] {
  return DUMMY_PARTICIPANTS.filter((p) => p.eventId === eventId);
}

/** 특정 user가 참여한 이벤트 목록 (Event[] 반환 — /my-events "참여한" 탭 source) */
export function getEventsOfParticipant(userId: string): Event[] {
  const eventIds = DUMMY_PARTICIPANTS.filter((p) => p.userId === userId).map(
    (p) => p.eventId,
  );
  return DUMMY_EVENTS.filter((e) => eventIds.includes(e.id));
}

/** 특정 이벤트의 참여자 수 */
export function countParticipantsOfEvent(eventId: string): number {
  return DUMMY_PARTICIPANTS.filter((p) => p.eventId === eventId).length;
}
