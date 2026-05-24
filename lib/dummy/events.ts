import type { Event } from "@/types/event";
import { isoFromNow } from "@/lib/datetime";

/**
 * Phase 2 더미 이벤트 10건 — Phase 3에서 Supabase fetch로 교체.
 * upcoming 6 · ongoing 1 · completed 3 분포 (spec §Step 5).
 */
export const DUMMY_EVENTS: Event[] = [
  {
    id: "e-001",
    title: "Next.js 16 Cache Components 실습 모임",
    description:
      "Cache Components와 Suspense 패턴을 실습하며 토론합니다. 노트북 지참 필수.",
    coverImageUrl: null,
    eventDate: isoFromNow(7, 19, 0),
    location: "강남역 모임공간 A호실",
    inviteCode: "dummy-invite-001",
    createdBy: "u-001",
    status: "upcoming",
    createdAt: "2026-05-10T09:00:00Z",
    updatedAt: "2026-05-10T09:00:00Z",
  },
  {
    id: "e-002",
    title: "Supabase RLS 정책 워크샵",
    description: "Row Level Security 정책을 함께 설계하고 회귀 테스트합니다.",
    coverImageUrl: null,
    eventDate: isoFromNow(14, 14, 0),
    location: "온라인 (Zoom 링크는 참여자에게 공유)",
    inviteCode: "dummy-invite-002",
    createdBy: "u-001",
    status: "upcoming",
    createdAt: "2026-05-12T10:00:00Z",
    updatedAt: "2026-05-12T10:00:00Z",
  },
  {
    id: "e-003",
    title: "TypeScript 5.x 신기능 살펴보기",
    description:
      "TypeScript 5.0~5.9의 주요 변경사항을 코드 예제와 함께 정리합니다.",
    coverImageUrl: null,
    eventDate: isoFromNow(21, 20, 0),
    location: "판교 스타트업 캠퍼스",
    inviteCode: "dummy-invite-003",
    createdBy: "u-002",
    status: "upcoming",
    createdAt: "2026-05-14T11:00:00Z",
    updatedAt: "2026-05-14T11:00:00Z",
  },
  {
    id: "e-004",
    title: "React 19 Server Components 심화",
    description: "RSC의 boundary 패턴과 streaming SSR을 다룹니다.",
    coverImageUrl: null,
    eventDate: isoFromNow(0, 19, 30),
    location: "역삼역 위워크",
    inviteCode: "dummy-invite-004",
    createdBy: "u-002",
    status: "ongoing",
    createdAt: "2026-05-01T12:00:00Z",
    updatedAt: "2026-05-01T12:00:00Z",
  },
  {
    id: "e-005",
    title: "토요 코딩 스터디 #4",
    description: "매주 토요일 진행하는 코딩 스터디 4회차.",
    coverImageUrl: null,
    eventDate: isoFromNow(-3, 10, 0),
    location: "신촌 토즈",
    inviteCode: "dummy-invite-005",
    createdBy: "u-001",
    status: "completed",
    createdAt: "2026-04-25T13:00:00Z",
    updatedAt: "2026-04-25T13:00:00Z",
  },
  {
    id: "e-006",
    title: "Tailwind v4 마이그레이션 토론",
    description: "v3 → v4 마이그레이션 시 주의점을 공유합니다.",
    coverImageUrl: null,
    eventDate: isoFromNow(-7, 18, 0),
    location: "온라인",
    inviteCode: "dummy-invite-006",
    createdBy: "u-002",
    status: "completed",
    createdAt: "2026-04-20T14:00:00Z",
    updatedAt: "2026-04-20T14:00:00Z",
  },
  {
    id: "e-007",
    title: "Vercel Edge Functions 실전",
    description: "Edge Functions의 use case와 한계를 정리합니다.",
    coverImageUrl: null,
    eventDate: isoFromNow(30, 15, 0),
    location: "강남 공유오피스",
    inviteCode: "dummy-invite-007",
    createdBy: "u-001",
    status: "upcoming",
    createdAt: "2026-05-18T15:00:00Z",
    updatedAt: "2026-05-18T15:00:00Z",
  },
  {
    id: "e-008",
    title: "PostgreSQL 인덱싱 워크샵",
    description: "실제 쿼리 플랜을 보며 인덱스 설계를 학습합니다.",
    coverImageUrl: null,
    eventDate: isoFromNow(45, 14, 0),
    location: "광화문 스타벅스 R",
    inviteCode: "dummy-invite-008",
    createdBy: "u-002",
    status: "upcoming",
    createdAt: "2026-05-20T16:00:00Z",
    updatedAt: "2026-05-20T16:00:00Z",
  },
  {
    id: "e-009",
    title: "Playwright E2E 자동화",
    description: "Playwright MCP 활용 패턴을 다룹니다.",
    coverImageUrl: null,
    eventDate: isoFromNow(60, 19, 0),
    location: "성수동 모임공간",
    inviteCode: "dummy-invite-009",
    createdBy: "u-001",
    status: "upcoming",
    createdAt: "2026-05-22T17:00:00Z",
    updatedAt: "2026-05-22T17:00:00Z",
  },
  {
    id: "e-010",
    title: "오픈소스 기여 가이드",
    description: "첫 PR을 위한 단계별 가이드와 실습.",
    coverImageUrl: null,
    eventDate: isoFromNow(-14, 11, 0),
    location: "온라인",
    inviteCode: "dummy-invite-010",
    createdBy: "u-002",
    status: "completed",
    createdAt: "2026-04-10T18:00:00Z",
    updatedAt: "2026-04-10T18:00:00Z",
  },
];

/** id로 더미 이벤트 조회 */
export function getEventById(id: string): Event | null {
  return DUMMY_EVENTS.find((e) => e.id === id) ?? null;
}

/** invite_code로 더미 이벤트 조회 */
export function getEventByInviteCode(code: string): Event | null {
  return DUMMY_EVENTS.find((e) => e.inviteCode === code) ?? null;
}

/** 특정 user가 생성한 이벤트 */
export function getEventsByCreator(userId: string): Event[] {
  return DUMMY_EVENTS.filter((e) => e.createdBy === userId);
}

/** 최근 생성 순 정렬 */
export function getRecentEvents(limit?: number): Event[] {
  const sorted = [...DUMMY_EVENTS].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

/** upcoming + ongoing — 시작시간 빠른 순 */
export function getUpcomingEvents(limit?: number): Event[] {
  const future = DUMMY_EVENTS.filter(
    (e) => e.status === "upcoming" || e.status === "ongoing",
  ).sort(
    (a, b) =>
      new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
  );
  return typeof limit === "number" ? future.slice(0, limit) : future;
}
