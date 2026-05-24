import type { Event } from "@/types/event";
import { isoFromNow } from "@/lib/datetime";

/**
 * Phase 2 더미 이벤트 10건 — Phase 3에서 Supabase fetch로 교체.
 * upcoming 5 · ongoing 1 · completed 4 분포.
 */
export const DUMMY_EVENTS: Event[] = [
  {
    id: "e-001",
    title: "React 19 신기능 스터디",
    description: "useActionState · use · Server Components 패턴 함께 보기",
    coverImageUrl: null,
    eventDate: isoFromNow(7, 19, 30),
    location: "강남역 토즈 모임센터 5층",
    inviteCode: "REACT19",
    createdBy: "u-001",
    status: "upcoming",
    createdAt: isoFromNow(-3),
    updatedAt: isoFromNow(-3),
  },
  {
    id: "e-002",
    title: "주말 등산 모임 — 북한산",
    description: "초보 환영 · 도시락 각자 · 우의진산성 입구 집결",
    coverImageUrl: null,
    eventDate: isoFromNow(10, 8, 0),
    location: "북한산 우의진산성 입구",
    inviteCode: "HIKE2026",
    createdBy: "u-002",
    status: "upcoming",
    createdAt: isoFromNow(-5),
    updatedAt: isoFromNow(-5),
  },
  {
    id: "e-003",
    title: "Next.js 16 Cache Components 핸즈온",
    description: 'Suspense · "use cache" · Partial Prerendering 실습',
    coverImageUrl: null,
    eventDate: isoFromNow(3, 20, 0),
    location: "온라인 (Zoom)",
    inviteCode: "NEXT16",
    createdBy: "u-001",
    status: "upcoming",
    createdAt: isoFromNow(-1),
    updatedAt: isoFromNow(-1),
  },
  {
    id: "e-004",
    title: "보드게임 나이트",
    description: "카탄·스플렌더·세븐원더스 — 음료 제공",
    coverImageUrl: null,
    eventDate: isoFromNow(14, 19, 0),
    location: "홍대 보드게임카페 다이스",
    inviteCode: "BOARD14",
    createdBy: "u-002",
    status: "upcoming",
    createdAt: isoFromNow(-2),
    updatedAt: isoFromNow(-2),
  },
  {
    id: "e-005",
    title: "프론트엔드 커리어 토크",
    description: "주니어→시니어 전환 경험 공유 · 멘토링 1:1",
    coverImageUrl: null,
    eventDate: isoFromNow(21, 19, 30),
    location: "성수동 카우앤독",
    inviteCode: "FECAREER",
    createdBy: "u-001",
    status: "upcoming",
    createdAt: isoFromNow(-7),
    updatedAt: isoFromNow(-7),
  },
  {
    id: "e-006",
    title: "오늘 진행중 — 점심 번개",
    description: "강남 회사원 점심 같이",
    coverImageUrl: null,
    eventDate: isoFromNow(0, 12, 0),
    location: "강남역 11번 출구",
    inviteCode: "LUNCH0",
    createdBy: "u-002",
    status: "ongoing",
    createdAt: isoFromNow(-1),
    updatedAt: isoFromNow(0),
  },
  {
    id: "e-007",
    title: "TypeScript 5.x 마이그레이션 회고",
    description: "1년간 마이그레이션 사례 공유",
    coverImageUrl: null,
    eventDate: isoFromNow(-7, 19, 30),
    location: "양재 AT센터",
    inviteCode: "TS5RECAP",
    createdBy: "u-001",
    status: "completed",
    createdAt: isoFromNow(-30),
    updatedAt: isoFromNow(-7),
  },
  {
    id: "e-008",
    title: "Supabase 첫걸음 워크숍",
    description: "Auth · RLS · Edge Functions",
    coverImageUrl: null,
    eventDate: isoFromNow(-14, 19, 0),
    location: "선릉역 패스트파이브",
    inviteCode: "SUPA01",
    createdBy: "u-002",
    status: "completed",
    createdAt: isoFromNow(-45),
    updatedAt: isoFromNow(-14),
  },
  {
    id: "e-009",
    title: "디자인 시스템 라운드 테이블",
    description: "shadcn · Radix · Tailwind 운영 경험",
    coverImageUrl: null,
    eventDate: isoFromNow(-21, 19, 30),
    location: "역삼 위워크",
    inviteCode: "DSRT2026",
    createdBy: "u-001",
    status: "completed",
    createdAt: isoFromNow(-60),
    updatedAt: isoFromNow(-21),
  },
  {
    id: "e-010",
    title: "독서 모임 — 객체지향의 사실과 오해",
    description: "1장~3장 함께 읽기",
    coverImageUrl: null,
    eventDate: isoFromNow(-30, 20, 0),
    location: "합정 카페 안다미로",
    inviteCode: "OOPBOOK",
    createdBy: "u-002",
    status: "completed",
    createdAt: isoFromNow(-90),
    updatedAt: isoFromNow(-30),
  },
];

/** id로 더미 이벤트 조회 */
export function getEventById(id: string): Event | undefined {
  return DUMMY_EVENTS.find((e) => e.id === id);
}

/** invite_code로 더미 이벤트 조회 */
export function getEventByInviteCode(code: string): Event | undefined {
  return DUMMY_EVENTS.find((e) => e.inviteCode === code);
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
