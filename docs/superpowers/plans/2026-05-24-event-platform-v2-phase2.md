# v2.0 Phase 2 — UI/UX (더미 데이터) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v2.0 1회성 이벤트 플랫폼의 모든 13개 페이지를 더미 데이터로 실제 UI 렌더링까지 완성한다. 폼·차트·테이블·active nav state·다크모드 토글까지 포함. Phase 3 DB 연동 전 마지막 단계로, 시각적으로 동작하는 풀스택 UI가 산출물.

**Architecture:** Phase 1 골격(13 라우트 빈 껍데기 + layout 컴포넌트) 위에 shadcn 10개 추가 + React Hook Form/Zod/Recharts 도입. 더미 데이터는 `lib/dummy/*.ts`에 정적 const 배열 + 헬퍼 함수로 격리(Phase 3에서 통째로 supabase fetch로 교체). 모든 dynamic params 페이지는 `<Suspense>` wrap 패턴 유지(Cache Components 호환). active nav state는 `usePathname()` 사용 → server boundary 보존을 위해 작은 client wrapper 컴포넌트로 분리. 모바일/데스크톱 분기는 Phase 1 패턴(`md:hidden` / `hidden md:flex`) 유지.

**Tech Stack:** Next.js 16.2.6 (App Router · Cache Components) · TypeScript 5.9.3 · React 19 · Tailwind v3.4.19 · shadcn/ui new-york · React Hook Form 7.x · Zod 3.x · @hookform/resolvers 3.x · Recharts 2.x · date-fns 3.x · lucide-react 0.511 · sonner 2.x (toast)

**Spec:** [`../specs/2026-05-24-event-platform-v2-design.md`](../specs/2026-05-24-event-platform-v2-design.md)
**Phase 1 plan:** [`./2026-05-24-event-platform-v2-phase1.md`](./2026-05-24-event-platform-v2-phase1.md)

---

## Plan 단계 결정 사항 (Phase 2 detail)

본 plan 안에서 확정하는 detail. spec/Phase 1에서 deferred된 항목.

| # | 결정 사항 | 채택 | 근거 |
| --- | --- | --- | --- |
| 1 | 더미 데이터 형식 | `lib/dummy/*.ts`에 정적 `const` 배열 + 헬퍼 함수 (`getEventById`, `getUserEvents` 등) | 학습 단계. faker 의존성 회피. Phase 3에서 supabase fetch로 함수 시그니처 그대로 교체 가능 |
| 2 | active nav state 구현 | client wrapper 컴포넌트(`*-link.tsx`)로 분리. Server Component(`mobile-bottom-nav.tsx`)는 데이터(NAV_ITEMS)만 전달 | Server boundary 최대 보존. `usePathname()` 호출은 link 한 줄만 client. |
| 3 | 다크모드 토글 위치 | 모바일: `/profile` 페이지 안 / 데스크톱: admin sidebar 하단 | UI 클러터 회피. 모바일 4 nav slot은 핵심 액션 전용. |
| 4 | layout metadata title/description | `"1회성 이벤트, 5초 만에"` + spec §1 한 줄 명제 | v1.0 "모임 관리" 메시지 잔존 제거. v2.0 도메인 일치. |
| 5 | EventCard 디자인 | 커버 이미지(없으면 placeholder) + 제목 + KST 일시 + 위치 + status 배지 | spec §5 필드 모두 노출. KST 포맷은 `lib/datetime.ts` 재사용. |
| 6 | EventForm validation | Zod schema (title 1~100, description ≤1000, eventDate 미래만, location 1~200) | DB CHECK 제약(spec §5)과 동일 사양 → Phase 3에서 server validation 재사용 |
| 7 | admin 테이블 페이지네이션 | client-side `useState`로 page/pageSize 유지. 더미 데이터는 메모리 내 slice | 학습 단계 단순화. Phase 3 Task 011에서 server-side로 전환 (이미 `PaginatedResponse<T>` 타입 정의됨) |
| 8 | Recharts 차트 종류 | LineChart (월별 이벤트 수) + PieChart (status 분포) | 예제 dashboard 따라가기. Phase 4 v2.x에서 추가 차트 확장 가능 |
| 9 | EventForm 분리 | 생성/수정 모두 같은 `<EventForm>` 컴포넌트. `mode` prop + `defaultValues`로 분기 | DRY |
| 10 | 빈 상태 (empty state) | 별도 `<EventListEmpty>` 컴포넌트 (CTA 텍스트는 prop으로) | 주최자/참여자/admin 모두 재사용 |
| 11 | `EventForm` submit 처리 | Phase 2는 더미 → `console.log` + sonner toast "저장됨 (Phase 3에서 DB 연동)". navigate는 `router.push("/my-events")` | Phase 3 Task 009 Server Action 도입 전 plumbing만. |
| 12 | 다크모드 hydration mismatch | `next-themes`가 이미 `app/layout.tsx`에 `suppressHydrationWarning` + `ThemeProvider`로 설정됨. 토글 컴포넌트만 `use client` + mounted 가드 | 흔한 패턴 (next-themes 공식 가이드) |
| 13 | `admin/login`은 별도 layout? | Phase 1 plan과 동일하게 단일 화면 `min-h-[calc(100vh-3rem)]` 패턴 유지. route group 분리는 Phase 3 Task 008(인증 결합)에서 결정 | Phase 2는 더미 단계라 layout 노출 OK |
| 14 | KST 일시 표시 포맷 | `2026년 5월 24일 (일) 오후 7:30` (date-fns + locale-ko + `Asia/Seoul`) | 한국어 + KST 일관성. `lib/datetime.ts` 재사용 확장 |

---

## File Structure

### 설치 (Task 1·2·4)

```
package.json deps 추가:
- react-hook-form ^7.x          (Task 2)
- zod ^3.x                      (Task 2)
- @hookform/resolvers ^3.x      (Task 2)
- recharts ^2.x                 (Task 4)
- date-fns ^3.x                 (Task 1 — KST 일시 포맷)
- date-fns-tz ^3.x              (Task 1 — Asia/Seoul timezone)

shadcn 컴포넌트 추가 (Task 1):
- avatar, dialog, form, select, table, skeleton, separator, tabs, popover

> calendar/date picker는 Phase 2에서 `datetime-local` 네이티브 input 채택(spec §6 일관). 본 phase에서는 추가 설치 불필요. Phase 3 또는 v2.x에서 더 풍부한 UX가 필요해지면 그때 도입.
```

### 신규 (Task 1)

```
components/ui/                    (shadcn 10개 — 위 목록)

components/layout/
├── mobile-bottom-nav-link.tsx    (use client — pathname active)
├── admin-sidebar-link.tsx        (use client — pathname active)
└── theme-toggle.tsx              (use client — next-themes 토글 버튼)

components/events/
├── event-status-badge.tsx        (상태별 색상 배지)
├── event-card.tsx                (커버·제목·일시·위치·status)
└── event-list-empty.tsx          (빈 상태 + CTA)

lib/datetime.ts                   (수정 — formatKstDateLong 추가)

lib/dummy/
├── users.ts                      (더미 사용자 5명)
├── events.ts                     (더미 이벤트 10건)
└── participants.ts               (더미 참여 관계 + 헬퍼)
```

### 신규 (Task 2 — 주최자 UI)

```
components/events/
├── event-form-schema.ts          (Zod schema — title/description/eventDate/location)
└── event-form.tsx                (RHF + shadcn form — 생성/수정 공용)

components/profile/
└── profile-form.tsx              (이름·아바타 수정 폼)
```

### 신규 (Task 3 — 참여자 UI)

```
components/events/
├── event-detail-header.tsx       (커버 + 제목 + 일시·위치 + status)
├── event-participants-list.tsx   (Avatar + 이름 그리드, 더미)
└── event-share-actions.tsx       (초대 링크 복사 + 카카오톡 공유 placeholder — 주최자만)

components/invite/
└── invite-preview.tsx            (이벤트 미리보기 + "참여하기" 버튼)
```

### 신규 (Task 4 — 관리자 UI)

```
components/admin/
├── admin-stat-card.tsx           (지표 카드 — 아이콘 + 숫자 + 라벨)
├── admin-data-table.tsx          (제네릭 테이블 — TanStack 없이 shadcn Table + client 페이지네이션)
├── admin-search-bar.tsx          (검색 input + debounce 200ms)
└── admin-delete-confirm.tsx      (Dialog — 삭제 확인 + 이유 입력)

components/charts/
├── event-trend-chart.tsx         (Recharts LineChart — 월별 이벤트 수)
└── status-pie-chart.tsx          (Recharts PieChart — upcoming/ongoing/completed)
```

### 수정 (Task 1·2·3·4)

```
app/layout.tsx                    metadata title/description 정정
app/page.tsx                      홈 카피 + 최근 이벤트 3건 미리보기 (더미)
app/auth/login/page.tsx           v2.0 도메인 용어 정정 (Phase 1에서 부분 정정됨, 본 task에서 디자인 완성)
app/events/new/page.tsx           <EventForm mode="create" />
app/events/[id]/page.tsx          상세 UI (헤더 + Tabs 주최자/참여자 분기 + 참여자 목록)
app/events/[id]/edit/page.tsx     <EventForm mode="edit" defaultValues={...} />
app/invite/[code]/page.tsx        <InvitePreview event={...} />
app/my-events/page.tsx            Tabs (주최한/참여한) + EventCard 리스트
app/profile/page.tsx              <ProfileForm /> + <ThemeToggle />
app/admin/layout.tsx              헤더 추가 + sidebar 하단 ThemeToggle
app/admin/login/page.tsx          관리자 로그인 폼 UI (이메일 + 비밀번호 — 더미)
app/admin/page.tsx                4개 StatCard + 최근 이벤트 5건
app/admin/events/page.tsx         AdminDataTable + 검색/필터/삭제 dialog
app/admin/users/page.tsx          AdminDataTable + 검색/필터/삭제 dialog
app/admin/analytics/page.tsx      LineChart + PieChart

components/layout/mobile-bottom-nav.tsx   (NAV_ITEMS만 export, link 분리)
components/layout/admin-sidebar.tsx       (ADMIN_NAV_ITEMS만 export, link 분리)
```

---

## 책임 분할 근거

- **`lib/dummy/`** — Phase 3에서 통째로 폐기/교체. 페이지가 직접 const 배열을 import하지 않고 헬퍼 함수(`getEventById(id)`)를 거치게 해서 Phase 3 supabase fetch로 시그니처 그대로 전환 가능.
- **`components/events/event-form.tsx`** — 생성/수정 모두 동일 컴포넌트, `mode` prop으로 분기. Phase 3에서 onSubmit이 Server Action으로 바뀌어도 컴포넌트 변경 없음.
- **`components/layout/*-link.tsx`** — `usePathname()` 호출 한 줄 때문에 nav 전체를 client로 만들지 않기 위한 client wrapper. Server Component(`mobile-bottom-nav.tsx`)는 NAV_ITEMS만 보유.
- **`components/admin/admin-data-table.tsx`** — 제네릭 `<T>` 시그니처로 events·users 양쪽 재사용. column 정의는 호출자가 prop으로 전달.
- **`components/charts/*`** — Recharts는 client-only (`use client`). 데이터는 page에서 prop으로 주입.

---

## 사전 조건 검증

- [ ] **사전 0: branch + HEAD 확인**

```bash
git rev-parse --abbrev-ref HEAD
git log --oneline -1
git status --short
```

Expected:
- branch: `feat/event-platform-v2`
- HEAD: `65e8879 docs(v2): Phase 1 ✅ 완료 표기 (13 라우트 + 타입 정의)`
- working tree: untracked만 OK (`docs/audit/`, `.claude/`, `shrimp-data/` 등 무관 파일은 무시)

다른 상태면 Phase 2 진입 보류 + 사용자 보고.

- [ ] **사전 1: dev server 가동 확인** (Playwright MCP visual sanity용)

```bash
curl -s http://localhost:3000/ -o /dev/null -w "%{http_code}\n"
```

Expected: `200`. 안 뜨면 `npm run dev` 별도 터미널에서 실행.

---

## Task 1: 공통 컴포넌트 + 더미 데이터 + shadcn 9개 + active nav state + 다크모드 토글 + layout metadata 정정

> 예제 Task 003 매핑. 본 task가 가장 크다 — 후속 Task 2·3·4가 모두 본 task 산출물에 의존하기 때문.

**Files:**
- Install (shadcn): avatar · dialog · form · select · table · skeleton · separator · tabs · popover
- Install (npm): date-fns · date-fns-tz
- Modify: `lib/datetime.ts`
- Create: `lib/dummy/users.ts` · `events.ts` · `participants.ts`
- Create: `components/layout/mobile-bottom-nav-link.tsx` · `admin-sidebar-link.tsx` · `theme-toggle.tsx`
- Modify: `components/layout/mobile-bottom-nav.tsx` · `admin-sidebar.tsx`
- Create: `components/events/event-status-badge.tsx` · `event-card.tsx` · `event-list-empty.tsx`
- Modify: `app/layout.tsx`

### Step 1: shadcn 9개 일괄 설치

```bash
npx shadcn@latest add avatar dialog form select table skeleton separator tabs popover --yes
```

Expected:
- 각 컴포넌트가 `components/ui/<name>.tsx`에 생성
- `form` 설치 시 `react-hook-form` peer 안내 (다음 step에서 설치)
- `dialog`, `popover`는 `@radix-ui/react-*` 추가
- 0 conflict

문제 시:
- 이미 존재하는 컴포넌트는 overwrite 프롬프트 → `--yes` 플래그로 자동 overwrite (현재 9개 중 충돌 0)
- network/registry 오류 → 재시도 또는 사용자 보고

### Step 2: date-fns + date-fns-tz 설치

```bash
npm install date-fns@^3 date-fns-tz@^3
```

Expected:
- `package.json` dependencies에 추가
- `npm install` 성공, 0 vulnerability

### Step 3: `lib/datetime.ts` 확장 — `formatKstDateLong`, `formatKstDateShort` 추가

먼저 현재 파일 확인:

```bash
cat lib/datetime.ts
```

기존 함수가 무엇이든 보존하고, 끝에 다음을 append:

Edit `lib/datetime.ts` — 파일 끝에 추가:

```ts
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

const KST_TIMEZONE = "Asia/Seoul";

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
```

설명:
- `toZonedTime`이 ISO(UTC) → KST 변환
- 한국어 locale (`date-fns/locale/ko`)
- `nowIso`, `isoFromNow`는 더미 데이터 생성용 헬퍼

만약 v1.0 `lib/datetime.ts`에 이미 `formatKst*` 류 함수가 있다면, 중복 이름을 피해 `formatKstDateLongV2` 같이 rename 또는 기존 함수가 적합하면 본 step skip.

### Step 4: `lib/dummy/users.ts` — 더미 사용자 5명

Create:

```ts
import type { User } from "@/types/user";

export const DUMMY_USERS: User[] = [
  {
    id: "u-001",
    email: "host1@example.com",
    fullName: "김주최",
    avatarUrl: null,
    role: "host",
    createdAt: "2026-01-15T09:00:00Z",
  },
  {
    id: "u-002",
    email: "host2@example.com",
    fullName: "이주관",
    avatarUrl: null,
    role: "host",
    createdAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "u-003",
    email: "participant1@example.com",
    fullName: "박참석",
    avatarUrl: null,
    role: "participant",
    createdAt: "2026-03-10T11:00:00Z",
  },
  {
    id: "u-004",
    email: "participant2@example.com",
    fullName: "최함께",
    avatarUrl: null,
    role: "participant",
    createdAt: "2026-04-20T12:00:00Z",
  },
  {
    id: "u-005",
    email: "admin@example.com",
    fullName: "정관리",
    avatarUrl: null,
    role: "admin",
    createdAt: "2026-01-01T00:00:00Z",
  },
];

/** 더미 "현재 로그인 사용자" — 본인 시점 화면 렌더링용 (Phase 3에서 supabase auth.getUser()로 교체) */
export const CURRENT_DUMMY_USER: User = DUMMY_USERS[0]; // host1 김주최

export function getUserById(id: string): User | null {
  return DUMMY_USERS.find((u) => u.id === id) ?? null;
}

export function getUsersByRole(role: User["role"]): User[] {
  return DUMMY_USERS.filter((u) => u.role === role);
}
```

설명:
- `id`는 `"u-001"` 같은 인간 가독 ID (uuid는 Phase 3 supabase가 부여)
- 5명: host 2, participant 2, admin 1 → admin 화면 다양성 확보
- `CURRENT_DUMMY_USER`는 본인 시점 화면(`/my-events`, `/profile`) 렌더링용
- 헬퍼 시그니처는 Phase 3에서 server fetch로 교체 가능 (`async` 추가만)

### Step 5: `lib/dummy/events.ts` — 더미 이벤트 10건

Create:

```ts
import type { Event } from "@/types/event";
import { isoFromNow } from "@/lib/datetime";

export const DUMMY_EVENTS: Event[] = [
  {
    id: "e-001",
    title: "Next.js 16 Cache Components 실습 모임",
    description: "Cache Components와 Suspense 패턴을 실습하며 토론합니다. 노트북 지참 필수.",
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
    description: "TypeScript 5.0~5.9의 주요 변경사항을 코드 예제와 함께 정리합니다.",
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

export function getEventById(id: string): Event | null {
  return DUMMY_EVENTS.find((e) => e.id === id) ?? null;
}

export function getEventByInviteCode(code: string): Event | null {
  return DUMMY_EVENTS.find((e) => e.inviteCode === code) ?? null;
}

export function getEventsByCreator(userId: string): Event[] {
  return DUMMY_EVENTS.filter((e) => e.createdBy === userId);
}

export function getRecentEvents(limit = 5): Event[] {
  return [...DUMMY_EVENTS]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function getUpcomingEvents(limit = 5): Event[] {
  return DUMMY_EVENTS
    .filter((e) => e.status === "upcoming")
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    .slice(0, limit);
}
```

설명:
- 10건: upcoming 6, ongoing 1, completed 3 → status 다양성 + 차트용 데이터 분포
- `isoFromNow(daysOffset, hour, minute)`로 실행 시점 기준 상대 시각 (테스트 안정성)
- 헬퍼는 Phase 3에서 supabase fetch로 그대로 교체 (async 추가만)

### Step 6: `lib/dummy/participants.ts` — 더미 참여 관계 + 헬퍼

Create:

```ts
import type { EventParticipant } from "@/types/event-participant";
import type { Event } from "@/types/event";
import { DUMMY_EVENTS } from "./events";

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

export function getParticipantsOfEvent(eventId: string): EventParticipant[] {
  return DUMMY_PARTICIPANTS.filter((p) => p.eventId === eventId);
}

export function getEventsOfParticipant(userId: string): Event[] {
  const eventIds = DUMMY_PARTICIPANTS
    .filter((p) => p.userId === userId)
    .map((p) => p.eventId);
  return DUMMY_EVENTS.filter((e) => eventIds.includes(e.id));
}

export function countParticipantsOfEvent(eventId: string): number {
  return DUMMY_PARTICIPANTS.filter((p) => p.eventId === eventId).length;
}
```

설명:
- 일부 이벤트(e-007·e-008·e-009)는 참여자 0명 → empty state 화면 테스트 가능
- `getEventsOfParticipant`는 `/my-events` "참여한" 탭 데이터 source
- composite key (eventId + userId)는 spec §5 그대로

### Step 7: `components/layout/mobile-bottom-nav-link.tsx` — client wrapper

Create:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Props = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function MobileBottomNavLink({ href, label, icon: Icon }: Props) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 py-2 text-xs transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
      <span>{label}</span>
    </Link>
  );
}
```

설명:
- `usePathname()`은 client hook이라 `"use client"` 필수
- exact match (`pathname === href`). prefix 매칭은 `/events/new`와 `/events/[id]` 간 모호함이 있어 회피.
- active 상태는 색상 + stroke 굵기로 표현
- `cn`은 `lib/utils.ts`에 이미 있음 (shadcn 셋업)

### Step 8: `components/layout/mobile-bottom-nav.tsx` — 정정 (link 분리)

기존 파일을 다음으로 교체:

```tsx
import { Home, Calendar, Plus, User } from "lucide-react";
import { MobileBottomNavLink } from "./mobile-bottom-nav-link";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/my-events", label: "내 이벤트", icon: Calendar },
  { href: "/events/new", label: "만들기", icon: Plus },
  { href: "/profile", label: "프로필", icon: User },
];

export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background md:hidden">
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <MobileBottomNavLink {...item} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

설명:
- Server Component 유지 (NAV_ITEMS 상수만 보유)
- client boundary는 link 한 줄로 격리

### Step 9: `components/layout/admin-sidebar-link.tsx` — client wrapper

Create:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Props = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function AdminSidebarLink({ href, label, icon: Icon }: Props) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}
```

### Step 10: `components/layout/theme-toggle.tsx` — 다크모드 토글 (next-themes 패턴)

Create:

```tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label="테마 토글">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
```

설명:
- `mounted` 가드: SSR/CSR theme 차이로 인한 hydration mismatch 회피 (next-themes 공식 패턴)
- mounted 전에는 disabled placeholder 렌더링 (layout shift 회피)

### Step 11: `components/layout/admin-sidebar.tsx` — 정정 (link 분리 + ThemeToggle 하단)

기존 파일을 다음으로 교체:

```tsx
import { LayoutDashboard, Calendar, Users, BarChart } from "lucide-react";
import { AdminSidebarLink } from "./admin-sidebar-link";
import { ThemeToggle } from "./theme-toggle";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/events", label: "이벤트 관리", icon: Calendar },
  { href: "/admin/users", label: "사용자 관리", icon: Users },
  { href: "/admin/analytics", label: "통계 분석", icon: BarChart },
];

export function AdminSidebar() {
  return (
    <aside className="hidden w-64 flex-col border-r bg-background md:flex">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">관리자</h2>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {ADMIN_NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <AdminSidebarLink {...item} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex items-center justify-between border-t p-3">
        <span className="text-xs text-muted-foreground">테마</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
```

### Step 12: `components/events/event-status-badge.tsx` — 상태별 색상 배지

Create:

```tsx
import { Badge } from "@/components/ui/badge";
import type { EventStatus } from "@/types/event";
import { cn } from "@/lib/utils";

const LABEL: Record<EventStatus, string> = {
  upcoming: "예정",
  ongoing: "진행 중",
  completed: "종료",
};

const VARIANT_CLASS: Record<EventStatus, string> = {
  upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  ongoing: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  completed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <Badge variant="outline" className={cn("border-0", VARIANT_CLASS[status])}>
      {LABEL[status]}
    </Badge>
  );
}
```

설명:
- Tailwind 색상 토큰으로 라이트/다크 양쪽 대응
- shadcn `Badge`는 이미 Phase 1 이전 설치됨

### Step 13: `components/events/event-card.tsx` — 카드 컴포넌트

Create:

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { EventStatusBadge } from "./event-status-badge";
import { formatKstDateLong } from "@/lib/datetime";
import { MapPin, Calendar as CalendarIcon } from "lucide-react";
import type { Event } from "@/types/event";

export function EventCard({ event }: { event: Event }) {
  return (
    <Link href={`/events/${event.id}`} className="block">
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImageUrl}
            alt={event.title}
            className="h-32 w-full object-cover"
          />
        ) : (
          <div className="flex h-32 w-full items-center justify-center bg-muted">
            <CalendarIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 font-semibold leading-tight">{event.title}</h3>
            <EventStatusBadge status={event.status} />
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              {formatKstDateLong(event.eventDate)}
            </p>
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span className="line-clamp-1">{event.location}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

설명:
- 커버 이미지 없으면 muted 배경 + 캘린더 아이콘 placeholder
- `<img>` 사용 이유: 더미 단계에서 Next.js Image 도메인 설정 불필요. Phase 3 supabase Storage 도입 시 `<Image>`로 전환 + remotePatterns 설정
- `line-clamp-2`/`line-clamp-1` Tailwind plugin 필요 → v3.3+ 빌트인이라 추가 설치 불필요

### Step 14: `components/events/event-list-empty.tsx` — 빈 상태

Create:

```tsx
import { Calendar } from "lucide-react";

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EventListEmpty({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed py-12 text-center">
      <Calendar className="h-10 w-10 text-muted-foreground" />
      <div>
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
```

설명: 호출자가 CTA(`<Button asChild><Link href="/events/new">만들기</Link></Button>`)를 prop으로 주입

### Step 15: `app/layout.tsx` — metadata 정정

Edit `app/layout.tsx` — `export const metadata` 블록 교체:

old:
```tsx
export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "모임 관리",
  description:
    "카톡 단톡방이 못 푸는 누적 데이터 — 누가 답했나·누가 얼마나 출석했나 — 만 잘 해서 단톡방 옆에 붙여 쓰는 보완 도구",
};
```

new:
```tsx
export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "1회성 이벤트, 5초 만에",
  description:
    "5~30명 규모 1회성 이벤트(모임·세미나·소규모 행사)를 초대 링크 하나로 만들고 관리할 수 있는 모바일 우선 플랫폼",
};
```

### Step 16: typecheck + lint + build

```bash
npx tsc --noEmit
npm run lint
npm run build 2>&1 | tail -30
```

Expected:
- typecheck 0 error
- lint 0 warning
- build 성공
- shadcn 추가 컴포넌트(`avatar`, `dialog`, `form` 등)가 사용되지 않아도 build에는 영향 없음 (트리 쉐이킹 — 컴포넌트는 import한 페이지에만 번들 포함)

만약 `form` 컴포넌트가 typecheck에서 `react-hook-form` 미설치 에러:
- Task 2에서 설치 예정이므로 본 task 단계에서는 form import한 곳이 없으니 영향 없음
- 만약 shadcn `form.tsx`가 `react-hook-form` 타입 import 시 에러 → 일단 Task 2까지 보류, 본 task의 `npm run build`에서 깨지면 Task 2 Step 1을 본 task에 앞당겨 실행

### Step 17: dev server에서 visual sanity (Playwright MCP)

본 task 산출물은 시각 검증이 핵심:

```
mcp__playwright__browser_navigate http://localhost:3000/
mcp__playwright__browser_snapshot
```

Expected:
- `/` 페이지 정상 렌더링
- 하단 mobile-bottom-nav 4 item 보임
- 현재 path인 `/`의 "홈" item이 active 색상

다음 라우트:
```
mcp__playwright__browser_navigate http://localhost:3000/my-events
mcp__playwright__browser_snapshot
```

Expected: "내 이벤트" item이 active

```
mcp__playwright__browser_navigate http://localhost:3000/admin
mcp__playwright__browser_snapshot
```

Expected:
- AdminSidebar 좌측 4 item
- 하단 "테마" + ThemeToggle 버튼
- "대시보드" item이 active

```
mcp__playwright__browser_evaluate "document.documentElement.classList"
```

Expected: `class` 속성에 `light` 또는 `dark` 중 하나 (next-themes 적용)

### Step 18: commit

```bash
git add components/ui components/layout components/events lib/datetime.ts lib/dummy app/layout.tsx package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat(v2): 공통 컴포넌트 + 더미 데이터 + shadcn 9개 + active nav state + 다크모드 토글

신규:
- shadcn 9 컴포넌트: avatar·dialog·form·select·table·skeleton·
  separator·tabs·popover
- lib/dummy/{users,events,participants}.ts: 사용자 5·이벤트 10·
  참여 관계 14건 + 헬퍼 함수 (Phase 3 supabase fetch로 교체 예정)
- lib/datetime.ts: formatKstDateLong·Short·nowIso·isoFromNow 추가
- components/layout/mobile-bottom-nav-link·admin-sidebar-link.tsx:
  client wrapper로 active state (server boundary 보존)
- components/layout/theme-toggle.tsx: next-themes 토글 + mounted 가드
- components/events/event-status-badge·event-card·event-list-empty.tsx

수정:
- mobile-bottom-nav·admin-sidebar.tsx: link 분리 + sidebar 하단 ThemeToggle
- app/layout.tsx: metadata title/description v2.0 도메인으로 정정

의존성: date-fns ^3, date-fns-tz ^3 추가

Task 2~4가 본 산출물에 의존 (EventCard, dummy 헬퍼, form/select/table/dialog 등).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 주최자 모바일 UI (홈·events/new·edit·profile) + React Hook Form + Zod

> 예제 Task 004 매핑.

**Files:**
- Install: `react-hook-form` · `zod` · `@hookform/resolvers`
- Create: `components/events/event-form-schema.ts` · `event-form.tsx`
- Create: `components/profile/profile-form.tsx`
- Modify: `app/page.tsx` · `app/events/new/page.tsx` · `app/events/[id]/edit/page.tsx` · `app/profile/page.tsx`

### Step 1: React Hook Form + Zod 설치

```bash
npm install react-hook-form@^7 zod@^3 @hookform/resolvers@^3
```

Expected: `package.json` dependencies 추가, 0 vulnerability.

### Step 2: `components/events/event-form-schema.ts` — Zod schema

Create:

```ts
import { z } from "zod";

export const eventFormSchema = z
  .object({
    title: z
      .string()
      .min(1, "제목을 입력하세요")
      .max(100, "제목은 100자 이하여야 합니다"),
    description: z
      .string()
      .max(1000, "설명은 1000자 이하여야 합니다")
      .optional()
      .or(z.literal("")),
    eventDate: z
      .string()
      .min(1, "일시를 선택하세요")
      .refine((v) => !Number.isNaN(Date.parse(v)), {
        message: "유효한 일시가 아닙니다",
      }),
    location: z
      .string()
      .min(1, "장소를 입력하세요")
      .max(200, "장소는 200자 이하여야 합니다"),
  })
  .refine(
    (data) => {
      if (!data.eventDate) return true;
      return new Date(data.eventDate).getTime() > Date.now();
    },
    {
      message: "이벤트 일시는 미래여야 합니다",
      path: ["eventDate"],
    }
  );

export type EventFormValues = z.infer<typeof eventFormSchema>;
```

설명:
- spec §5 DB CHECK 제약과 동일 사양 (1~100, ≤1000, 1~200)
- `eventDate`는 datetime-local input의 string 형식. Phase 3 server에서 ISO 변환 후 timestamptz 저장.
- 미래 검증은 `.refine` (cross-field 아니지만 동적 비교라 schema-level)

### Step 3: `components/events/event-form.tsx` — RHF + shadcn form

Create:

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { eventFormSchema, type EventFormValues } from "./event-form-schema";

type Props = {
  mode: "create" | "edit";
  defaultValues?: Partial<EventFormValues>;
  eventId?: string;
};

export function EventForm({ mode, defaultValues, eventId }: Props) {
  const router = useRouter();
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      eventDate: defaultValues?.eventDate ?? "",
      location: defaultValues?.location ?? "",
    },
  });

  function onSubmit(values: EventFormValues) {
    console.log(`[Phase 2 dummy] EventForm submit (${mode})`, { eventId, values });
    toast.success(
      mode === "create"
        ? "이벤트가 생성되었습니다 (Phase 3에서 DB 저장)"
        : "이벤트가 수정되었습니다 (Phase 3에서 DB 저장)"
    );
    router.push("/my-events");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>제목 *</FormLabel>
              <FormControl>
                <Input placeholder="예: Next.js 16 스터디 모임" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>설명</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="이벤트 내용을 자유롭게 적어주세요"
                  {...field}
                />
              </FormControl>
              <FormDescription>최대 1000자</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="eventDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>일시 (KST) *</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>장소 *</FormLabel>
              <FormControl>
                <Input placeholder="예: 강남역 스터디카페 또는 온라인" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            취소
          </Button>
          <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
            {mode === "create" ? "이벤트 만들기" : "수정 저장"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

설명:
- `"use client"` 필수 (RHF 훅 사용)
- `mode` 분기로 생성/수정 동일 컴포넌트 재사용
- `datetime-local` input은 사용자의 로컬 시간대로 입력받음 — KST 사용자라 자연스럽게 KST 입력. Phase 3 server에서 timezone 변환 처리.
- submit은 더미 (`console.log` + toast). Phase 3 Task 009에서 Server Action으로 교체.

### Step 4: `app/events/new/page.tsx` — EventForm 임베드

Replace 전체 내용:

```tsx
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { EventForm } from "@/components/events/event-form";

export default function NewEventPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold">이벤트 만들기</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          기본 정보를 입력하면 초대 링크가 자동 생성됩니다.
        </p>
        <div className="mt-6">
          <EventForm mode="create" />
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
```

### Step 5: `app/events/[id]/edit/page.tsx` — EventForm 수정 모드 (더미 fetch + Suspense)

Replace 전체:

```tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { EventForm } from "@/components/events/event-form";
import { getEventById } from "@/lib/dummy/events";

async function EditEventContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) notFound();

  const defaultValues = {
    title: event.title,
    description: event.description ?? "",
    eventDate: event.eventDate.slice(0, 16), // datetime-local 호환 (YYYY-MM-DDTHH:mm)
    location: event.location,
  };

  return (
    <main className="flex-1 px-4 py-6 pb-20">
      <h1 className="text-2xl font-bold">이벤트 수정</h1>
      <p className="mt-1 text-sm text-muted-foreground">{event.title}</p>
      <div className="mt-6">
        <EventForm mode="edit" eventId={event.id} defaultValues={defaultValues} />
      </div>
    </main>
  );
}

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense
        fallback={
          <main className="flex-1 px-4 py-6 pb-20">
            <p className="text-muted-foreground">로딩...</p>
          </main>
        }
      >
        <EditEventContent params={params} />
      </Suspense>
      <MobileBottomNav />
    </div>
  );
}
```

설명:
- `event.eventDate.slice(0, 16)`: ISO `2026-05-31T19:00:00.000Z` → `2026-05-31T19:00` (datetime-local 입력 호환). timezone shift 정확성은 Phase 3에서 검증 — 더미 단계 OK.
- 존재하지 않는 ID는 `notFound()` → Next.js `not-found.tsx`

### Step 6: `components/profile/profile-form.tsx` — 프로필 수정 폼

Create:

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { User } from "@/types/user";

const profileFormSchema = z.object({
  fullName: z
    .string()
    .min(1, "이름을 입력하세요")
    .max(50, "이름은 50자 이하여야 합니다"),
  avatarUrl: z
    .string()
    .url("유효한 URL이 아닙니다")
    .optional()
    .or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileForm({ user }: { user: User }) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user.fullName ?? "",
      avatarUrl: user.avatarUrl ?? "",
    },
  });

  function onSubmit(values: ProfileFormValues) {
    console.log("[Phase 2 dummy] ProfileForm submit", values);
    toast.success("프로필이 저장되었습니다 (Phase 3에서 DB 저장)");
  }

  const initials = (user.fullName ?? user.email).slice(0, 2);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName ?? user.email} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{user.email}</p>
            <p className="capitalize">{user.role}</p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름 *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="avatarUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>아바타 URL</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          저장
        </Button>
      </form>
    </Form>
  );
}
```

### Step 7: `app/profile/page.tsx` — ProfileForm + ThemeToggle

Replace 전체:

```tsx
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { ProfileForm } from "@/components/profile/profile-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CURRENT_DUMMY_USER } from "@/lib/dummy/users";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold">프로필</h1>
        <div className="mt-6">
          <ProfileForm user={CURRENT_DUMMY_USER} />
        </div>

        <Separator className="my-8" />

        <section className="space-y-3">
          <h2 className="text-base font-semibold">설정</h2>
          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <p className="text-sm font-medium">테마</p>
              <p className="text-xs text-muted-foreground">라이트/다크 모드 전환</p>
            </div>
            <ThemeToggle />
          </div>
        </section>
      </main>
      <MobileBottomNav />
    </div>
  );
}
```

### Step 8: `app/page.tsx` — 홈 카피 유지 + 다가오는 이벤트 미리보기 3건

Replace 전체:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { EventCard } from "@/components/events/event-card";
import { EventListEmpty } from "@/components/events/event-list-empty";
import { getUpcomingEvents } from "@/lib/dummy/events";

export default function HomePage() {
  const upcoming = getUpcomingEvents(3);
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-8 pb-20 md:pb-8">
        <section className="mx-auto max-w-2xl space-y-6 text-center">
          <h1 className="text-3xl font-bold">1회성 이벤트, 5초 만에 시작</h1>
          <p className="text-muted-foreground">
            모임·세미나·소규모 행사를 초대 링크 하나로 만들고 관리하세요.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild>
              <Link href="/events/new">이벤트 만들기</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/my-events">내 이벤트</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-2xl space-y-3">
          <h2 className="text-lg font-semibold">다가오는 이벤트</h2>
          {upcoming.length === 0 ? (
            <EventListEmpty
              title="아직 이벤트가 없습니다"
              description="첫 이벤트를 만들어보세요."
              action={
                <Button asChild size="sm">
                  <Link href="/events/new">이벤트 만들기</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>
      </main>
      <MobileBottomNav />
    </div>
  );
}
```

### Step 9: typecheck + lint + build

```bash
npx tsc --noEmit
npm run lint
npm run build 2>&1 | tail -30
```

Expected: 0 error, 0 warning, build 성공. `/`, `/events/new`, `/events/[id]/edit`, `/profile` 라우트가 dynamic으로 표시될 가능성 (RHF 사용으로 동적 컴포넌트 트리).

### Step 10: visual sanity (Playwright MCP)

```
mcp__playwright__browser_navigate http://localhost:3000/events/new
mcp__playwright__browser_snapshot
```

Expected:
- "이벤트 만들기" 헤딩
- 4개 input (제목·설명·일시·장소) + 취소/만들기 버튼
- 제목 비우고 만들기 클릭 → "제목을 입력하세요" 에러 표시

```
mcp__playwright__browser_navigate http://localhost:3000/events/e-001/edit
mcp__playwright__browser_snapshot
```

Expected: defaultValues 채워진 폼 ("Next.js 16 Cache Components 실습 모임" 타이틀)

```
mcp__playwright__browser_navigate http://localhost:3000/profile
mcp__playwright__browser_snapshot
```

Expected:
- Avatar (initials "김주") + 이메일 + role
- 이름·아바타 URL 폼
- 설정 섹션 + 테마 토글 버튼

```
mcp__playwright__browser_navigate http://localhost:3000/
mcp__playwright__browser_snapshot
```

Expected:
- 홈 hero + 두 버튼
- "다가오는 이벤트" 섹션에 EventCard 3개 (e-001, e-002, e-003 — eventDate 오름차순)
- 각 카드에 KST 일시 + 위치 + status 배지

### Step 11: commit

```bash
git add components/events/event-form-schema.ts components/events/event-form.tsx components/profile app/events/new/page.tsx app/events/[id]/edit/page.tsx app/profile/page.tsx app/page.tsx package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat(v2): 주최자 모바일 UI (홈 + events/new + edit + profile) + RHF + Zod

신규:
- components/events/event-form-schema.ts: Zod schema (title 1~100,
  description ≤1000, eventDate 미래, location 1~200)
- components/events/event-form.tsx: RHF + shadcn form, mode prop으로
  생성/수정 공용, submit은 dummy console.log + sonner toast
- components/profile/profile-form.tsx: 이름/아바타 수정 폼

수정:
- app/page.tsx: 홈 hero + 다가오는 이벤트 3건 EventCard 그리드
- app/events/new/page.tsx: <EventForm mode="create">
- app/events/[id]/edit/page.tsx: Suspense wrap + getEventById +
  defaultValues (eventDate slice 16자 = datetime-local 호환)
- app/profile/page.tsx: <ProfileForm> + 설정 섹션 ThemeToggle

의존성: react-hook-form ^7, zod ^3, @hookform/resolvers ^3 추가

submit 처리는 Phase 3 Task 009에서 Server Action으로 교체.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 참여자 모바일 UI (invite·my-events·event detail 읽기 전용)

> 예제 Task 005 매핑. Task 2 컴포넌트(EventCard, EventForm 등) 재사용.

**Files:**
- Create: `components/events/event-detail-header.tsx` · `event-participants-list.tsx` · `event-share-actions.tsx`
- Create: `components/invite/invite-preview.tsx`
- Modify: `app/events/[id]/page.tsx` · `app/invite/[code]/page.tsx` · `app/my-events/page.tsx`

### Step 1: `components/events/event-detail-header.tsx`

Create:

```tsx
import { EventStatusBadge } from "./event-status-badge";
import { formatKstDateLong } from "@/lib/datetime";
import { MapPin, Calendar as CalendarIcon, Users } from "lucide-react";
import type { Event } from "@/types/event";

type Props = {
  event: Event;
  participantCount: number;
};

export function EventDetailHeader({ event, participantCount }: Props) {
  return (
    <header className="space-y-4">
      {event.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.coverImageUrl}
          alt={event.title}
          className="h-48 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-48 w-full items-center justify-center rounded-lg bg-muted">
          <CalendarIcon className="h-12 w-12 text-muted-foreground" />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight">{event.title}</h1>
          <EventStatusBadge status={event.status} />
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {formatKstDateLong(event.eventDate)}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {event.location}
          </p>
          <p className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            참여자 {participantCount}명
          </p>
        </div>

        {event.description ? (
          <p className="pt-2 text-sm leading-relaxed text-foreground/90">
            {event.description}
          </p>
        ) : null}
      </div>
    </header>
  );
}
```

### Step 2: `components/events/event-participants-list.tsx`

Create:

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserById } from "@/lib/dummy/users";
import type { EventParticipant } from "@/types/event-participant";

export function EventParticipantsList({
  participants,
}: {
  participants: EventParticipant[];
}) {
  if (participants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        아직 참여자가 없습니다.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {participants.map((p) => {
        const user = getUserById(p.userId);
        const name = user?.fullName ?? "익명";
        const initials = name.slice(0, 2);
        return (
          <li key={`${p.eventId}-${p.userId}`} className="flex flex-col items-center gap-1.5 text-center">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user?.avatarUrl ?? undefined} alt={name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="line-clamp-1 text-xs text-muted-foreground">
              {name}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
```

설명: 더미 단계에서 `getUserById` 동기 fetch. Phase 3에서 server fetch + JOIN 결과로 교체 (시그니처 변경 가능).

### Step 3: `components/events/event-share-actions.tsx`

Create:

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Copy, Check, Share2 } from "lucide-react";

export function EventShareActions({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${inviteCode}`
      : `/invite/${inviteCode}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("초대 링크가 복사되었습니다");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했습니다");
    }
  }

  function shareKakao() {
    toast.info("카카오톡 공유는 Phase 4 v2.x에서 지원 예정입니다");
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1" onClick={copy}>
        {copied ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            복사됨
          </>
        ) : (
          <>
            <Copy className="mr-2 h-4 w-4" />
            링크 복사
          </>
        )}
      </Button>
      <Button variant="outline" className="flex-1" onClick={shareKakao}>
        <Share2 className="mr-2 h-4 w-4" />
        카카오톡
      </Button>
    </div>
  );
}
```

### Step 4: `components/invite/invite-preview.tsx`

Create:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { formatKstDateLong } from "@/lib/datetime";
import { MapPin, Calendar as CalendarIcon } from "lucide-react";
import type { Event } from "@/types/event";

export function InvitePreview({ event }: { event: Event }) {
  const router = useRouter();

  function handleJoin() {
    console.log("[Phase 2 dummy] join event", event.id);
    toast.success("참여가 완료되었습니다 (Phase 3에서 DB 등록)");
    router.push(`/events/${event.id}`);
  }

  const canJoin = event.status === "upcoming" || event.status === "ongoing";

  return (
    <div className="mx-auto w-full max-w-md space-y-5 rounded-lg border p-6">
      <div className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          이벤트 초대
        </p>
        <h1 className="text-xl font-bold leading-tight">{event.title}</h1>
        <EventStatusBadge status={event.status} />
      </div>

      <div className="space-y-1.5 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          {formatKstDateLong(event.eventDate)}
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {event.location}
        </p>
      </div>

      {event.description ? (
        <p className="text-sm leading-relaxed text-foreground/90">
          {event.description}
        </p>
      ) : null}

      <Button className="w-full" onClick={handleJoin} disabled={!canJoin}>
        {canJoin ? "참여하기" : "참여 불가 (종료된 이벤트)"}
      </Button>
    </div>
  );
}
```

### Step 5: `app/invite/[code]/page.tsx` — InvitePreview 임베드

Replace 전체:

```tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { InvitePreview } from "@/components/invite/invite-preview";
import { getEventByInviteCode } from "@/lib/dummy/events";

async function InviteContent({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const event = getEventByInviteCode(code);
  if (!event) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <InvitePreview event={event} />
    </div>
  );
}

export default function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">로딩...</p>
        </div>
      }
    >
      <InviteContent params={params} />
    </Suspense>
  );
}
```

설명: invite 페이지는 비로그인 OK + 단일 액션 (MobileBottomNav 없음 — Phase 1 plan 결정 유지)

### Step 6: `app/events/[id]/page.tsx` — 상세 UI (헤더 + Tabs + 참여자 목록 + 주최자 액션)

Replace 전체:

```tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { EventDetailHeader } from "@/components/events/event-detail-header";
import { EventParticipantsList } from "@/components/events/event-participants-list";
import { EventShareActions } from "@/components/events/event-share-actions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getEventById } from "@/lib/dummy/events";
import {
  getParticipantsOfEvent,
  countParticipantsOfEvent,
} from "@/lib/dummy/participants";
import { CURRENT_DUMMY_USER } from "@/lib/dummy/users";
import { Pencil } from "lucide-react";

async function EventDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) notFound();

  const participants = getParticipantsOfEvent(event.id);
  const count = countParticipantsOfEvent(event.id);
  const isHost = event.createdBy === CURRENT_DUMMY_USER.id;

  return (
    <main className="flex-1 px-4 py-6 pb-20">
      <EventDetailHeader event={event} participantCount={count} />

      <Separator className="my-6" />

      {isHost ? (
        <Tabs defaultValue="participants" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="participants">참여자 ({count})</TabsTrigger>
            <TabsTrigger value="manage">관리</TabsTrigger>
          </TabsList>
          <TabsContent value="participants" className="space-y-3">
            <EventParticipantsList participants={participants} />
          </TabsContent>
          <TabsContent value="manage" className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">초대 링크 공유</p>
              <EventShareActions inviteCode={event.inviteCode} />
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/events/${event.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                이벤트 수정
              </Link>
            </Button>
          </TabsContent>
        </Tabs>
      ) : (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">참여자 ({count})</h2>
          <EventParticipantsList participants={participants} />
        </section>
      )}
    </main>
  );
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense
        fallback={
          <main className="flex-1 px-4 py-6 pb-20">
            <p className="text-muted-foreground">로딩...</p>
          </main>
        }
      >
        <EventDetailContent params={params} />
      </Suspense>
      <MobileBottomNav />
    </div>
  );
}
```

설명:
- `isHost` 분기: 주최자는 Tabs(참여자/관리), 참여자는 참여자 목록만
- `CURRENT_DUMMY_USER`(u-001 host1)이 createdBy인 이벤트는 호스트 뷰. e-001/e-002/e-005/e-007/e-009.
- Phase 3에서 `CURRENT_DUMMY_USER` → 실제 `supabase.auth.getUser()` 결과로 교체

### Step 7: `app/my-events/page.tsx` — Tabs (주최한/참여한) + EventCard 리스트

Replace 전체:

```tsx
import Link from "next/link";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { EventCard } from "@/components/events/event-card";
import { EventListEmpty } from "@/components/events/event-list-empty";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getEventsByCreator } from "@/lib/dummy/events";
import { getEventsOfParticipant } from "@/lib/dummy/participants";
import { CURRENT_DUMMY_USER } from "@/lib/dummy/users";

export default function MyEventsPage() {
  const hosted = getEventsByCreator(CURRENT_DUMMY_USER.id);
  const joined = getEventsOfParticipant(CURRENT_DUMMY_USER.id);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold">내 이벤트</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          내가 만든 이벤트와 참여한 이벤트를 한눈에 보세요.
        </p>

        <Tabs defaultValue="hosted" className="mt-6 space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hosted">주최한 ({hosted.length})</TabsTrigger>
            <TabsTrigger value="joined">참여한 ({joined.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="hosted">
            {hosted.length === 0 ? (
              <EventListEmpty
                title="아직 만든 이벤트가 없습니다"
                action={
                  <Button asChild size="sm">
                    <Link href="/events/new">첫 이벤트 만들기</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {hosted.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="joined">
            {joined.length === 0 ? (
              <EventListEmpty
                title="아직 참여한 이벤트가 없습니다"
                description="초대 링크를 받으면 자동으로 표시됩니다."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {joined.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <MobileBottomNav />
    </div>
  );
}
```

설명: u-001 host1 기준 — hosted는 5건(e-001·e-002·e-005·e-007·e-009), joined는 0건(host1이 참여자로 등록된 더미 데이터 없음 → empty state 자연 노출)

### Step 8: typecheck + lint + build

```bash
npx tsc --noEmit
npm run lint
npm run build 2>&1 | tail -30
```

Expected: 0 error, 빌드 성공.

### Step 9: visual sanity (Playwright MCP)

```
mcp__playwright__browser_navigate http://localhost:3000/invite/dummy-invite-001
mcp__playwright__browser_snapshot
```

Expected: InvitePreview 카드 — 제목·일시·위치·"참여하기" 버튼

```
mcp__playwright__browser_navigate http://localhost:3000/events/e-001
mcp__playwright__browser_snapshot
```

Expected:
- EventDetailHeader (커버 placeholder + 제목 + 일시·위치·참여자 3명)
- u-001 host1 시점이라 isHost=true → Tabs (참여자 / 관리)
- "관리" tab 클릭 → 초대 링크 복사 + 카카오톡 + 수정 버튼

```
mcp__playwright__browser_navigate http://localhost:3000/events/e-003
mcp__playwright__browser_snapshot
```

Expected: u-002 host2가 만든 이벤트 → CURRENT_DUMMY_USER(u-001)는 참여자 뷰 → Tabs 없이 참여자 목록만 표시

```
mcp__playwright__browser_navigate http://localhost:3000/my-events
mcp__playwright__browser_snapshot
```

Expected: "주최한 (5)" / "참여한 (0)" 탭. 주최한 탭에 5개 카드. 참여한 탭은 empty state.

### Step 10: 초대 링크 복사 동작 확인

```
mcp__playwright__browser_navigate http://localhost:3000/events/e-001
mcp__playwright__browser_click "관리" 탭
mcp__playwright__browser_click "링크 복사" 버튼
```

Expected: "초대 링크가 복사되었습니다" toast. 2초 후 "복사됨" → "링크 복사" 환원.

> 클립보드 권한이 headless에서 거부될 수 있음. 그 경우 toast가 "복사에 실패했습니다"로 나오면 본 step은 코드 검증으로 PASS 처리.

### Step 11: commit

```bash
git add components/events/event-detail-header.tsx components/events/event-participants-list.tsx components/events/event-share-actions.tsx components/invite app/events/[id]/page.tsx app/invite/[code]/page.tsx app/my-events/page.tsx
git commit -m "$(cat <<'EOF'
feat(v2): 참여자 모바일 UI (invite + event detail + my-events Tabs)

신규:
- components/events/event-detail-header.tsx: 커버·제목·일시·위치·
  참여자 수·설명 헤더
- components/events/event-participants-list.tsx: Avatar 그리드
- components/events/event-share-actions.tsx: 초대 링크 복사 +
  카카오톡 공유 placeholder (use client + navigator.clipboard)
- components/invite/invite-preview.tsx: 초대 미리보기 + 참여하기 버튼

수정:
- app/invite/[code]/page.tsx: getEventByInviteCode + Suspense wrap +
  notFound 처리
- app/events/[id]/page.tsx: isHost 분기 Tabs (참여자/관리) vs
  단순 참여자 목록 (참여자 뷰)
- app/my-events/page.tsx: 주최한/참여한 Tabs + EventCard 그리드

CURRENT_DUMMY_USER 기준 isHost 분기는 Phase 3에서 supabase.auth.getUser()로 교체.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 관리자 데스크톱 UI (로그인·대시보드·이벤트/사용자 테이블·analytics) + Recharts

> 예제 Task 006 매핑.

**Files:**
- Install: `recharts`
- Create: `components/admin/admin-stat-card.tsx` · `admin-data-table.tsx` · `admin-search-bar.tsx` · `admin-delete-confirm.tsx`
- Create: `components/charts/event-trend-chart.tsx` · `status-pie-chart.tsx`
- Modify: `app/admin/layout.tsx` · `app/admin/login/page.tsx` · `app/admin/page.tsx` · `app/admin/events/page.tsx` · `app/admin/users/page.tsx` · `app/admin/analytics/page.tsx`

### Step 1: Recharts 설치

```bash
npm install recharts@^2
```

Expected: `package.json` 추가, 0 vulnerability.

### Step 2: `components/admin/admin-stat-card.tsx`

Create:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
};

export function AdminStatCard({ label, value, icon: Icon, hint }: Props) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 3: `components/admin/admin-search-bar.tsx`

Create:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  debounceMs?: number;
};

export function AdminSearchBar({
  value,
  onChange,
  placeholder = "검색...",
  debounceMs = 200,
}: Props) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onChange(local);
    }, debounceMs);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, debounceMs]);

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}
```

설명: 200ms debounce. 외부 `value` 변경 시 local sync.

### Step 4: `components/admin/admin-delete-confirm.tsx`

Create:

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

type Props = {
  itemLabel: string;
  resourceType: "이벤트" | "사용자";
  onConfirm: (reason: string) => void;
};

export function AdminDeleteConfirm({ itemLabel, resourceType, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  function handleConfirm() {
    onConfirm(reason);
    toast.success(`${resourceType}이(가) 삭제되었습니다 (Phase 3에서 DB 처리)`);
    setOpen(false);
    setReason("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{resourceType} 삭제</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{itemLabel}</span>
            을(를) 삭제합니다. 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label className="text-sm font-medium">삭제 사유 (선택)</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="감사 로그에 기록됩니다"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 5: `components/admin/admin-data-table.tsx` — 제네릭 테이블 (검색·필터·페이지네이션)

Create:

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AdminSearchBar } from "./admin-search-bar";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Column<T> = {
  key: string;
  header: string;
  cell: (item: T) => React.ReactNode;
};

type Props<T> = {
  items: T[];
  columns: Column<T>[];
  searchKey: (item: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  rowActions?: (item: T) => React.ReactNode;
};

export function AdminDataTable<T>({
  items,
  columns,
  searchKey,
  searchPlaceholder,
  pageSize = 10,
  rowActions,
}: Props<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => searchKey(item).toLowerCase().includes(q));
  }, [items, search, searchKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  return (
    <div className="space-y-4">
      <AdminSearchBar
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder={searchPlaceholder}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key}>{c.header}</TableHead>
              ))}
              {rowActions ? <TableHead className="w-12 text-right">액션</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (rowActions ? 1 : 0)}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  검색 결과가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              visible.map((item, idx) => (
                <TableRow key={idx}>
                  {columns.map((c) => (
                    <TableCell key={c.key}>{c.cell(item)}</TableCell>
                  ))}
                  {rowActions ? (
                    <TableCell className="text-right">{rowActions(item)}</TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          총 {filtered.length}건 · {currentPage} / {totalPages} 페이지
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

설명:
- 제네릭 `<T>`로 events·users 양쪽 재사용
- 검색은 `searchKey(item)` callback이 전체 검색 대상 문자열 반환
- 페이지네이션은 client-side memoization
- `rowActions` prop으로 row별 삭제/수정 버튼 주입

### Step 6: `components/charts/event-trend-chart.tsx` — Recharts LineChart

Create:

```tsx
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type TrendPoint = {
  month: string; // "2026-05" 형식
  count: number;
};

export function EventTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-xs" />
          <YAxis allowDecimals={false} className="text-xs" />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Step 7: `components/charts/status-pie-chart.tsx` — Recharts PieChart

Create:

```tsx
"use client";

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { EventStatus } from "@/types/event";

const LABEL: Record<EventStatus, string> = {
  upcoming: "예정",
  ongoing: "진행 중",
  completed: "종료",
};

const COLORS: Record<EventStatus, string> = {
  upcoming: "#3b82f6",
  ongoing: "#22c55e",
  completed: "#9ca3af",
};

export type StatusSlice = { status: EventStatus; count: number };

export function StatusPieChart({ data }: { data: StatusSlice[] }) {
  const chartData = data.map((d) => ({
    name: LABEL[d.status],
    value: d.count,
    status: d.status,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label
          >
            {chartData.map((entry) => (
              <Cell key={entry.status} fill={COLORS[entry.status]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

설명: 색상은 EventStatusBadge와 일관 (blue·green·gray)

### Step 8: `app/admin/layout.tsx` — 헤더 추가 (기존 sidebar wrap 유지)

기존 layout을 다음으로 교체:

```tsx
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="border-b bg-background px-6 py-4 md:px-8">
          <p className="text-xs text-muted-foreground">v2.0 관리자 콘솔 · 더미 데이터</p>
        </header>
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
```

### Step 9: `app/admin/login/page.tsx` — 관리자 로그인 폼

Replace:

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginValues) {
    console.log("[Phase 2 dummy] admin login", values.email);
    toast.success("관리자 로그인 (Phase 3에서 Supabase Auth + role 검증)");
    router.push("/admin");
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>관리자 로그인</CardTitle>
          <CardDescription>관리자 권한 계정만 접근 가능합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                로그인
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

설명: 더미 단계라 password 실제 검증 없음. Phase 3 Task 008에서 Supabase Auth + role 분기로 교체.

### Step 10: `app/admin/page.tsx` — 대시보드 (StatCard 4 + 최근 이벤트 5)

Replace:

```tsx
import Link from "next/link";
import { Calendar, Users, CalendarCheck, CalendarX } from "lucide-react";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import { DUMMY_EVENTS, getRecentEvents } from "@/lib/dummy/events";
import { DUMMY_USERS } from "@/lib/dummy/users";

export default function AdminDashboardPage() {
  const totalEvents = DUMMY_EVENTS.length;
  const upcomingCount = DUMMY_EVENTS.filter((e) => e.status === "upcoming").length;
  const completedCount = DUMMY_EVENTS.filter((e) => e.status === "completed").length;
  const totalUsers = DUMMY_USERS.length;
  const recent = getRecentEvents(5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          플랫폼 전체 지표와 최근 활동을 한눈에 확인하세요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="전체 이벤트" value={totalEvents} icon={Calendar} />
        <AdminStatCard label="예정 이벤트" value={upcomingCount} icon={CalendarCheck} hint="upcoming" />
        <AdminStatCard label="종료 이벤트" value={completedCount} icon={CalendarX} hint="completed" />
        <AdminStatCard label="가입자" value={totalUsers} icon={Users} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">최근 이벤트</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/events">전체 보기</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

### Step 11: `app/admin/events/page.tsx` — AdminDataTable (이벤트)

Replace:

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminDataTable, type Column } from "@/components/admin/admin-data-table";
import { AdminDeleteConfirm } from "@/components/admin/admin-delete-confirm";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { formatKstDateShort } from "@/lib/datetime";
import { DUMMY_EVENTS } from "@/lib/dummy/events";
import { getUserById } from "@/lib/dummy/users";
import type { Event } from "@/types/event";

const COLUMNS: Column<Event>[] = [
  {
    key: "title",
    header: "제목",
    cell: (e) => (
      <Link href={`/events/${e.id}`} className="font-medium hover:underline">
        {e.title}
      </Link>
    ),
  },
  {
    key: "status",
    header: "상태",
    cell: (e) => <EventStatusBadge status={e.status} />,
  },
  {
    key: "eventDate",
    header: "일시 (KST)",
    cell: (e) => <span className="text-sm text-muted-foreground">{formatKstDateShort(e.eventDate)}</span>,
  },
  {
    key: "location",
    header: "장소",
    cell: (e) => <span className="text-sm">{e.location}</span>,
  },
  {
    key: "createdBy",
    header: "주최자",
    cell: (e) => {
      const u = getUserById(e.createdBy);
      return <span className="text-sm">{u?.fullName ?? "알 수 없음"}</span>;
    },
  },
];

export default function AdminEventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">이벤트 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 이벤트를 검색·정렬·삭제할 수 있습니다.
        </p>
      </div>

      <AdminDataTable<Event>
        items={DUMMY_EVENTS}
        columns={COLUMNS}
        searchKey={(e) => `${e.title} ${e.location}`}
        searchPlaceholder="제목 또는 장소 검색..."
        rowActions={(e) => (
          <AdminDeleteConfirm
            itemLabel={e.title}
            resourceType="이벤트"
            onConfirm={(reason) => console.log("[Phase 2 dummy] delete event", e.id, { reason })}
          />
        )}
      />
    </div>
  );
}
```

설명:
- `"use client"`: AdminDataTable의 useState가 client인데, page도 client로 만들면 직관적. 또는 page는 server + 데이터를 prop으로 전달 가능 — 더미 단계는 단순화 위해 page도 client.
- COLUMNS는 모듈 스코프 — 재렌더 시 동일 참조 유지

### Step 12: `app/admin/users/page.tsx` — AdminDataTable (사용자)

Replace:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminDataTable, type Column } from "@/components/admin/admin-data-table";
import { AdminDeleteConfirm } from "@/components/admin/admin-delete-confirm";
import { Badge } from "@/components/ui/badge";
import { DUMMY_USERS } from "@/lib/dummy/users";
import type { User } from "@/types/user";

const ROLE_LABEL: Record<User["role"], string> = {
  host: "주최자",
  participant: "참여자",
  admin: "관리자",
};

const COLUMNS: Column<User>[] = [
  {
    key: "user",
    header: "사용자",
    cell: (u) => {
      const name = u.fullName ?? u.email;
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={u.avatarUrl ?? undefined} alt={name} />
            <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      );
    },
  },
  {
    key: "role",
    header: "역할",
    cell: (u) => <Badge variant="outline">{ROLE_LABEL[u.role]}</Badge>,
  },
  {
    key: "createdAt",
    header: "가입일",
    cell: (u) => (
      <span className="text-sm text-muted-foreground">
        {u.createdAt.slice(0, 10)}
      </span>
    ),
  },
];

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">사용자 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 사용자를 검색·필터·삭제할 수 있습니다.
        </p>
      </div>

      <AdminDataTable<User>
        items={DUMMY_USERS}
        columns={COLUMNS}
        searchKey={(u) => `${u.fullName ?? ""} ${u.email}`}
        searchPlaceholder="이름 또는 이메일 검색..."
        rowActions={(u) => (
          <AdminDeleteConfirm
            itemLabel={u.fullName ?? u.email}
            resourceType="사용자"
            onConfirm={(reason) => console.log("[Phase 2 dummy] delete user", u.id, { reason })}
          />
        )}
      />
    </div>
  );
}
```

### Step 13: `app/admin/analytics/page.tsx` — Recharts 차트 2개

Replace:

```tsx
import { EventTrendChart, type TrendPoint } from "@/components/charts/event-trend-chart";
import { StatusPieChart, type StatusSlice } from "@/components/charts/status-pie-chart";
import { DUMMY_EVENTS } from "@/lib/dummy/events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function buildTrend(): TrendPoint[] {
  const counts = new Map<string, number>();
  for (const e of DUMMY_EVENTS) {
    const ym = e.createdAt.slice(0, 7); // "2026-05"
    counts.set(ym, (counts.get(ym) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

function buildStatusSlices(): StatusSlice[] {
  const counts = { upcoming: 0, ongoing: 0, completed: 0 };
  for (const e of DUMMY_EVENTS) counts[e.status]++;
  return [
    { status: "upcoming", count: counts.upcoming },
    { status: "ongoing", count: counts.ongoing },
    { status: "completed", count: counts.completed },
  ];
}

export default function AdminAnalyticsPage() {
  const trend = buildTrend();
  const slices = buildStatusSlices();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">통계 분석</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          이벤트 추세와 상태 분포를 확인하세요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>월별 이벤트 생성 수</CardTitle>
          </CardHeader>
          <CardContent>
            <EventTrendChart data={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>이벤트 상태 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusPieChart data={slices} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### Step 14: typecheck + lint + build

```bash
npx tsc --noEmit
npm run lint
npm run build 2>&1 | tail -40
```

Expected:
- 0 error, 0 warning
- 빌드 성공
- 라우트 표에 `/admin/*` 5개 모두 표시
- Recharts 추가로 admin/analytics 번들 크기 증가 — 정상

### Step 15: visual sanity (Playwright MCP)

```
mcp__playwright__browser_navigate http://localhost:3000/admin/login
mcp__playwright__browser_snapshot
```

Expected: 카드 안 로그인 폼 (이메일·비밀번호·로그인 버튼). 잘못된 이메일 → "유효한 이메일" 에러.

```
mcp__playwright__browser_navigate http://localhost:3000/admin
mcp__playwright__browser_snapshot
```

Expected:
- AdminLayout 헤더 ("v2.0 관리자 콘솔 · 더미 데이터")
- 사이드바 (대시보드 active)
- StatCard 4개 (10 / 6 / 3 / 5)
- 최근 이벤트 5건 EventCard 그리드

```
mcp__playwright__browser_navigate http://localhost:3000/admin/events
mcp__playwright__browser_snapshot
```

Expected:
- 검색 input + 테이블 (10 row, 5 column)
- 삭제 버튼 클릭 → Dialog 노출
- 검색에 "Cache" 입력 → 200ms 후 1 row만 표시 (e-001)

```
mcp__playwright__browser_navigate http://localhost:3000/admin/users
mcp__playwright__browser_snapshot
```

Expected: 5 row, Avatar + 이름·이메일 + role 배지 + 가입일

```
mcp__playwright__browser_navigate http://localhost:3000/admin/analytics
mcp__playwright__browser_snapshot
```

Expected: 두 카드 안 차트 — LineChart (월별) + PieChart (상태 분포)

### Step 16: commit

```bash
git add components/admin components/charts app/admin package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat(v2): 관리자 데스크톱 UI (로그인·대시보드·테이블 2종·차트) + Recharts

신규:
- components/admin/admin-stat-card.tsx: 아이콘 + 숫자 지표 카드
- components/admin/admin-search-bar.tsx: 200ms debounce 검색 input
- components/admin/admin-delete-confirm.tsx: Dialog + 사유 입력
- components/admin/admin-data-table.tsx: 제네릭 <T> 테이블 +
  client 페이지네이션 + 검색 + rowActions
- components/charts/event-trend-chart.tsx: Recharts LineChart
- components/charts/status-pie-chart.tsx: Recharts PieChart

수정:
- app/admin/layout.tsx: 헤더 추가 (v2.0 관리자 콘솔)
- app/admin/login/page.tsx: 이메일·비밀번호 로그인 폼 (RHF + Zod)
- app/admin/page.tsx: StatCard 4 + 최근 이벤트 5
- app/admin/events/page.tsx: AdminDataTable<Event>
- app/admin/users/page.tsx: AdminDataTable<User>
- app/admin/analytics/page.tsx: LineChart (월별) + PieChart (상태)

의존성: recharts ^2 추가

submit/delete 처리는 Phase 3 Task 011에서 Server Action + admin RLS로 교체.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Phase 2 회귀 검증 + push + ROADMAP-v2 갱신

**Files:** (no new code; 검증 + push + 문서 갱신)

### Step 1: 전체 build + lint + typecheck

```bash
npm run build 2>&1 | tee /tmp/v2-phase2-build.log | tail -60
npm run lint
npx tsc --noEmit
```

Windows PowerShell:
```powershell
npm run build 2>&1 | Tee-Object -FilePath "$env:TEMP\v2-phase2-build.log" | Select-Object -Last 60
npm run lint
npx tsc --noEmit
```

Expected:
- `Compiled successfully`
- 0 lint warning
- 0 typecheck error
- 라우트 표 (Phase 1 13개 + 인증 보조 라우트 유지)
- 번들 크기 변동: admin/analytics가 가장 큼 (Recharts ~150KB gzip)

### Step 2: Playwright MCP 종합 시나리오 (10 라우트)

각 라우트마다 navigate + snapshot:

| 라우트 | 검증 |
| --- | --- |
| `/` | 홈 hero + 다가오는 이벤트 3건 |
| `/events/new` | EventForm 4 input |
| `/events/e-001` | EventDetailHeader + Tabs (호스트 뷰) |
| `/events/e-001/edit` | EventForm defaultValues 채워짐 |
| `/events/e-003` | 참여자 뷰 (Tabs 없음) |
| `/invite/dummy-invite-001` | InvitePreview |
| `/my-events` | Tabs (주최한 5 / 참여한 0) |
| `/profile` | ProfileForm + ThemeToggle |
| `/admin` | StatCard 4 + 최근 5 |
| `/admin/login` | 로그인 폼 카드 |
| `/admin/events` | 테이블 10 row |
| `/admin/users` | 테이블 5 row |
| `/admin/analytics` | LineChart + PieChart |

PASS 기준:
- 200 OK
- 헤딩 텍스트 정확
- 모바일/admin 라우트 → 각각 MobileBottomNav / AdminSidebar 렌더링
- 다크모드 토글 동작 (sidebar 하단 또는 profile 페이지)
- 폼 validation 에러 메시지 노출

문제 시 해당 task로 되돌아가 fix + 재 commit.

### Step 3: working tree 확인

```bash
git status --short
git log --oneline -10
```

Expected:
- working tree clean
- 최근 5 commit: Task 1·2·3·4·5 + (Phase 1의 마지막 commit `65e8879`)

### Step 4: feat/event-platform-v2 push

```bash
git push origin feat/event-platform-v2
```

Expected: 4 새 commit push 성공 (Task 1·2·3·4).

### Step 5: `docs/ROADMAP-v2.md` Phase 2 ✅ 표기

먼저 현재 상태 확인:

```bash
cat docs/ROADMAP-v2.md
```

Phase 2 항목 (placeholder):

```
- **Phase 2: UI/UX (더미 데이터)** (Task 003~006)
  - 공통 컴포넌트 + 더미 데이터
  - 주최자/참여자/관리자 UI
```

다음으로 교체:

```
- **Phase 2: UI/UX (더미 데이터)** ✅ 완료 (2026-05-24)
  - shadcn 10개 추가 (avatar·dialog·form·select·table·skeleton·
    separator·tabs·popover·calendar)
  - lib/dummy/{users,events,participants}.ts + 헬퍼 함수
  - 주최자: 홈 hero + 다가오는 이벤트, EventForm (RHF + Zod), 프로필
  - 참여자: invite preview, event detail Tabs 분기, my-events Tabs
  - 관리자: StatCard 4 + 데이터 테이블 (검색·페이지네이션·삭제 dialog) +
    Recharts (LineChart·PieChart) + 다크모드 토글
  - Plan: `docs/superpowers/plans/2026-05-24-event-platform-v2-phase2.md`
  - 회귀: build 0 warning, lint 0, typecheck 0, Playwright MCP 13 라우트 PASS
```

Edit `docs/ROADMAP-v2.md`로 정정 (정확한 placeholder 텍스트는 본 step의 `cat` 출력에 맞춰 결정).

### Step 6: ROADMAP commit + push

```bash
git add docs/ROADMAP-v2.md
git commit -m "$(cat <<'EOF'
docs(v2): Phase 2 ✅ 완료 표기 (UI/UX 더미 데이터)

Plan 5개 task 모두 PASS:
- Task 1: 공통 컴포넌트 + 더미 데이터 + shadcn 9 + active nav + 다크모드
- Task 2: 주최자 UI (홈 + events/new + edit + profile) + RHF + Zod
- Task 3: 참여자 UI (invite + event detail + my-events Tabs)
- Task 4: 관리자 UI (로그인 + 대시보드 + 테이블 + analytics) + Recharts
- Task 5: 회귀 검증 (build·lint·typecheck·Playwright MCP 13 라우트)

다음 Phase 3 Task 007부터 DB 스키마 + RLS + Supabase Auth.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)" && git push
```

Expected: push 성공.

---

## 회귀 검증 게이트 (Phase 2 완료 기준)

- [x] (Task 1) shadcn 9개 + dummy 3파일 + layout 컴포넌트 4개 + datetime 확장 + layout metadata 정정
- [x] (Task 2) RHF + Zod 설치 + EventForm + ProfileForm + 4 페이지 정정
- [x] (Task 3) 참여자 컴포넌트 3개 + invite-preview + 3 페이지 정정
- [x] (Task 4) Recharts 설치 + admin 컴포넌트 4개 + 차트 2개 + 5 페이지 정정
- [x] (Task 5) build/lint/typecheck 0 error + Playwright MCP 13 라우트 PASS
- [x] ROADMAP-v2.md Phase 2 ✅ 표기
- [x] feat/event-platform-v2 branch 5 commits push 완료

---

## Out of Scope (Phase 2 범위 외)

- DB 마이그레이션 (users·events·event_participants 테이블) — Phase 3 Task 007
- Supabase 클라이언트 분기 (별도 project URL/key) — Phase 3 Task 007
- Google OAuth + admin role 미들웨어 — Phase 3 Task 008
- Server Action(이벤트 CRUD, 참여, 삭제) — Phase 3 Task 009·010·011
- Realtime 참여자 수 — Phase 3 Task 010
- RLS 정책 + 헬퍼 함수 (admin bypass) — Phase 3 Task 007·008
- Storage 버킷 (event-covers) + 이미지 업로드 — Phase 3 Task 009
- 카카오톡 알림톡 / 사업자 등록 필요 항목 — v2.x
- Lighthouse 90+ / 코드 스플리팅 최적화 — v2.x
- robots.txt / sitemap.xml — v2.x
- admin RLS server-side 페이지네이션 — Phase 3 Task 011 (현재는 client memoize)

---

## 리스크 핸드오프

| 관찰 | 즉시 조치 |
| --- | --- |
| Task 1 Step 1 shadcn 설치 실패 (network/registry) | 재시도. 지속 실패 시 사용자 보고. 본 plan은 shadcn CLI 4.8.0 검증됨. |
| Task 1 Step 3 v1.0 `lib/datetime.ts`에 동일 이름 함수 충돌 | 신규 함수명 suffix V2 또는 기존 함수 시그니처가 호환되면 import만 추가 |
| Task 2 Step 5 `datetime-local` slice 16자가 timezone shift로 ±9h 어긋남 | 더미 단계는 OK. Phase 3 Task 009에서 KST → UTC 정확 변환 (`date-fns-tz/zonedTimeToUtc`) |
| Task 3 Step 6 isHost 분기에서 모든 이벤트가 호스트 뷰로 보임 | CURRENT_DUMMY_USER.id (u-001)이 createdBy가 아닌 이벤트(e-003·e-004·e-006·e-008·e-010)로 검증 |
| Task 4 Step 5 AdminDataTable 검색 시 페이지네이션 깨짐 | search 변경 시 `setPage(1)` 강제 reset 확인 (Step 5 코드에 포함) |
| Task 4 Step 6·7 Recharts에서 hsl(var(--primary)) CSS 변수가 차트 stroke로 적용 안 됨 | Tailwind CSS 변수는 HTML 컨텍스트 안에서만 resolved. fallback hex로 변경 (`#3b82f6` 등). 현재는 LineChart만 영향 — color prop 직접 전달로 회피 |
| Task 4 Step 11 admin page가 client인데 dummy 데이터를 module-level import해서 hydration mismatch | dummy는 모두 정적 const라 SSR/CSR 동일 — 영향 없음. 만약 future date 비교(현재 시각 의존)가 hydration mismatch 유발하면 useEffect로 client-only 비교로 이동 |
| Task 5 Step 2 Playwright MCP에서 클립보드 권한 거부 | EventShareActions 복사 동작은 코드 검증으로 PASS 처리 (browser 권한 제약) |
| Task 5 Step 4 push 시 force push 필요한 상태 | 절대 force push 금지. 사용자 보고 + 원인 분석 (일반적으로 rebase·revert가 필요한 상태는 본 Phase 2에서 발생하지 않아야 함) |

---

## 참고 링크

- **본 plan**: `docs/superpowers/plans/2026-05-24-event-platform-v2-phase2.md`
- **Spec**: `docs/superpowers/specs/2026-05-24-event-platform-v2-design.md`
- **Phase 1 plan**: `docs/superpowers/plans/2026-05-24-event-platform-v2-phase1.md`
- **v2.0 ROADMAP**: `docs/ROADMAP-v2.md` (본 Task 5 Step 5에서 갱신)
- **학습 출처**: https://github.com/gymcoding/nextjs-supabase-app/blob/main/docs/ROADMAP.md (Task 003~006)
- **shadcn/ui**: https://ui.shadcn.com/docs/components
- **React Hook Form + Zod**: https://react-hook-form.com/get-started#SchemaValidation
- **Recharts**: https://recharts.org/en-US/api
- **date-fns-tz**: https://github.com/marnusw/date-fns-tz
