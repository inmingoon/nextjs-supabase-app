# v2.0 Phase 3 — DB + 핵심 기능 (실데이터 전환) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **REVISION 2026-05-25**: 사용자 결정 변경 — spec §2 결정 3("별도 Supabase project")을 폐기하고 **기존 v1.0 project 재사용**. 본 plan의 모든 v2.0 DB 객체는 `v2_` prefix로 v1.0 객체와 분리. 사전 작업(project 생성·env 분기·OAuth 등록)이 모두 SKIP됨. 마이그레이션 폴더도 v1.0과 통합(`supabase/migrations/`).
>
> **매핑 표** (본 plan 어디서든 v1.0 충돌이 있는 이름은 prefix 적용):
> | plan 원본 | 실제 적용 |
> | --- | --- |
> | `public.users` | `public.v2_users` |
> | `public.events` | `public.v2_events` |
> | `public.event_participants` | `public.v2_event_participants` |
> | `public.admin_users` | `public.v2_admin_users` |
> | `public.events_with_status` (view) | `public.v2_events_with_status` |
> | `public.is_admin(uuid)` | `public.v2_is_admin(uuid)` |
> | `public.get_event_by_invite_code(text)` | `public.v2_get_event_by_invite_code(text)` |
> | `public.handle_new_user()` 트리거 | `public.v2_handle_new_user()` (v1.0 profiles 트리거와 병행) |
> | `supabase/migrations-v2/` 폴더 | `supabase/migrations/` (v1.0과 통합, 파일명 `<timestamp>_v2_*.sql`) |
> | `NEXT_PUBLIC_SUPABASE_URL_V2` 등 V2 env | 기존 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 그대로 |
> | `event-covers` Storage 버킷 | 그대로 (v1.0 사용 0 — 충돌 없음) |
>
> **신규 결정 (REVISION에서 추가)**: v1.0의 `handle_new_user` 트리거가 이미 `auth.users INSERT → public.profiles upsert`를 처리하므로, v2.0은 별도 `v2_handle_new_user` 트리거를 `auth.users`에 추가해 `v2_users`에도 동시 upsert (양쪽 테이블에 동시 채워짐). v1.0 트리거 수정 0건.

**Goal:** Phase 2의 더미 UI를 기존 v1.0 Supabase project의 실데이터로 전환한다. v2.0 도메인 객체(테이블·view·함수)는 모두 `v2_` prefix로 신설해 v1.0과 같은 schema 안에서 격리한다. DB 스키마·RLS·Google OAuth(v1.0 재사용)·admin 권한·Server Action·Realtime 참여자 수·Storage 커버 이미지 업로드·Playwright MCP 통합 테스트까지 완성해 v2.0 1회성 이벤트 플랫폼의 production-grade 골격을 마무리한다.

**Architecture:** v1.0과 같은 Supabase project + 같은 `public` schema 위에 `v2_` prefix로 신규 테이블 4개·view 1개·함수 2개·트리거 1개를 신설한다. v1.0 마이그레이션 7개는 보존, v2.0 마이그레이션은 같은 `supabase/migrations/` 폴더에 `<timestamp>_v2_*.sql` 파일명으로 추가해 CLI 자동 인식. Phase 2의 `lib/dummy/*.ts` 헬퍼 시그니처(`getEventById(id): Event | null` 등)를 `lib/queries/*.ts` 모듈로 1:1 교체해 13개 페이지 + 컴포넌트 코드는 그대로 유지한다(swap point 최소화). admin 권한은 별도 `v2_admin_users` 테이블 + `v2_is_admin` RLS 헬퍼 함수로 구현하고, 첫 admin은 사용자 이메일을 하드코딩한 마이그레이션으로 부여한다. `events.status`는 컬럼이 아닌 PostgreSQL view(`v2_events_with_status`)로 동적 계산해 cron 의존성을 제거한다. Server Action으로 모든 mutation(create/update/delete/join)을 처리하고, Realtime은 `event:{id}:participants` 채널로 `v2_event_participants` 변경을 구독한다.

**Tech Stack:** Next.js 16.2.6 (App Router + Cache Components + Server Action) · React 19 · TypeScript 5.9.3 · Tailwind v3.4.19 · shadcn/ui · @supabase/supabase-js ^2.106 · @supabase/ssr ^0.10 · Supabase Storage (event-covers 버킷) · Supabase Realtime · PostgreSQL view (status 자동 계산) · Postgres RLS 헬퍼 함수 (3중 안전장치 — language plpgsql + SET LOCAL row_security OFF + owner postgres) · crypto.randomBytes (invite_code 32B base64url) · Playwright MCP (E2E)

**Spec:** [`../specs/2026-05-24-event-platform-v2-design.md`](../specs/2026-05-24-event-platform-v2-design.md)
**Phase 1 plan:** [`./2026-05-24-event-platform-v2-phase1.md`](./2026-05-24-event-platform-v2-phase1.md)
**Phase 2 plan:** [`./2026-05-24-event-platform-v2-phase2.md`](./2026-05-24-event-platform-v2-phase2.md)

---

## Plan 단계 결정 사항 (Phase 3 detail — 12건)

| # | 결정 사항 | 채택 | 근거 |
| --- | --- | --- | --- |
| 1 | admin role 부여 방식 | **B — 별도 `admin_users` 테이블** | 학습 단계 SQL/RLS 명시성 우선. 감사 가능(`granted_by`, `granted_at`). A(app_metadata)는 service_role API 또는 Dashboard 수동 부여라 학습 UX 복잡. self-promote 보안 약점 없음(서비스 키 또는 SQL Editor로만 INSERT 가능). |
| 2 | `events.status` 자동 관리 | **PostgreSQL view (`events_with_status`)** | cron 없이 항상 정확. `event_date` 비교 동적 계산. status 컬럼 제거 후 view에서 계산 → 라이브 변경 즉시 반영. |
| 3 | 첫 admin 부여 흐름 | **하드코딩 마이그레이션** (`inmingoon@gmail.com`) | deterministic + repeatable. dev/staging 일관. SECURITY DEFINER 함수가 auth.users에서 email로 id 조회 후 admin_users INSERT. production 진입 시 환경변수 분기 가능. |
| 4 | 더미 시드 데이터 | **별도 dev-only 마이그레이션** (`0006_seed_dev_data.sql`) | Phase 2 lib/dummy 데이터(e-001~e-010, u-001~u-005)와 일관성 유지. admin 차트 다양성 확보. production 마이그레이션은 시드 미포함(파일명 prefix로 분기). |
| 5 | v2.0 마이그레이션 폴더 | **`supabase/migrations/` 통합** (REVISION) | v1.0과 같은 project 재사용 → 폴더 분리 무의미. CLI 자동 인식. 파일명 `<timestamp>_v2_*.sql`로 의미 분리. |
| 6 | dummy → server fetch 교체 패턴 | **헬퍼 시그니처 보존, body만 server fetch로 교체** | page·component 변경 0 목표. 함수명·반환 타입 유지(`Event[]`·`User \| null` 등). `async` 추가만. lib/dummy/ 폐기 후 lib/queries/ 신설. |
| 7 | 인증 가드 위치 | **proxy.ts whitelist + admin layout server guard** | proxy = 외곽 게이트 (login·invite·callback·confirm whitelist 외 redirect). admin role 검증 = `app/admin/layout.tsx`에서 `await requireAdmin()` 호출. |
| 8 | Server Action 위치 | **`lib/actions/*.ts`** (도메인별 분리) | `"use server"` 디렉티브. createEvent/updateEvent/deleteEvent/joinEvent/admin-delete 등 도메인별 파일. Zod schema는 client form과 동일 모듈 재사용. |
| 9 | invite_code 충돌 처리 | **DB UNIQUE 제약 + INSERT 재시도 (max 3회)** | crypto.randomBytes(32) base64url 충돌 확률 무시 가능하지만 robust. UNIQUE 위반 시 새 코드로 재시도. |
| 10 | Realtime 채널 | **이벤트별 `event:{id}:participants` postgres_changes** | participant 테이블의 INSERT/DELETE를 subscribe. EventDetail 페이지의 참여자 수 카드만 업데이트. |
| 11 | Storage RLS | **event-covers 버킷 — owner-only insert/update + public read** | 이벤트 주최자만 업로드/교체. 모든 사용자가 cover 이미지 읽기 가능. file path: `events/{event_id}/cover.{ext}`. |
| 12 | TypeScript types | **`supabase gen types typescript` 자동 생성 → `lib/database.types.ts` 교체** | Phase 2의 수동 `types/{user,event,event-participant}.ts`는 외부 인터페이스로 보존. queries 모듈이 DB row → 외부 타입 변환 책임. |

---

## File Structure

### 폐기 (Task 1)

```
lib/dummy/                       (Phase 2 더미 데이터 — 폐기, lib/queries로 교체)
├── users.ts
├── events.ts
└── participants.ts
```

### 신규 — DB 마이그레이션 (Task 1) — REVISION 적용

```
supabase/migrations/          (v1.0 폴더와 통합, v1.0 7개는 보존)
├── 20260520*~20260524*.sql       (v1.0 7개 — 보존)
├── 20260525000000_v2_create_users_events_participants.sql
├── 20260525000001_v2_create_admin_users.sql
├── 20260525000002_v2_create_rls_policies.sql
├── 20260525000003_v2_create_events_with_status_view.sql
├── 20260525000004_v2_create_storage_event_covers.sql
├── 20260525000005_v2_seed_dev_data.sql              (dev only)
└── 20260525000006_v2_grant_first_admin.sql          (inmingoon@gmail.com)
```

### 신규 — 데이터 액세스 + 인증 + Server Action (Task 2·3·4·5·6)

```
lib/queries/                       (server-side data access — dummy helper 시그니처 보존)
├── users.ts                       (getUserById, getUsersByRole, getCurrentUserProfile)
├── events.ts                      (getEventById, getEventByInviteCode, getEventsByCreator, getRecentEvents, getUpcomingEvents)
└── participants.ts                (getParticipantsOfEvent, getEventsOfParticipant, countParticipantsOfEvent)

lib/auth/                          (server auth helpers)
├── current-user.ts                (getCurrentUser — auth.users + profile join)
└── require-admin.ts               (서버 컴포넌트에서 admin guard, throw → notFound 또는 redirect)

lib/actions/                       (Server Action 도메인별 — "use server")
├── events.ts                      (createEvent, updateEvent, deleteEvent + invite_code 재시도)
├── participants.ts                (joinEvent + 중복 방지)
├── admin-events.ts                (adminDeleteEvent + admin guard)
├── admin-users.ts                 (adminDeleteUser + admin guard)
└── profile.ts                     (updateProfile + avatar upload Storage)

lib/storage/
└── event-covers.ts                (uploadEventCover · deleteEventCover · getPublicUrl)

lib/database.types.ts              (supabase gen types — Phase 2의 placeholder 교체)
```

### 수정 (Task 2·3·4·5·6)

```
proxy.ts                           admin/login·invite/[code]·auth/* whitelist 확장
lib/supabase/proxy.ts              session refresh + admin role 분기는 layout으로 위임
app/auth/login/page.tsx            v2.0 도메인 용어 + Google OAuth 우선 (이메일·비밀번호 비활성)
app/auth/callback/route.ts         OAuth 콜백 — auth.users.id → public.users upsert
app/admin/layout.tsx               await requireAdmin() server guard 추가

components/events/event-form.tsx   onSubmit을 Server Action(createEvent/updateEvent)으로 교체. kstDateTimeLocalToIso() 사용 (Phase 2.1 TODO 해소). 커버 이미지 업로드 추가.
components/profile/profile-form.tsx onSubmit을 updateProfile Server Action으로 교체
components/invite/invite-preview.tsx handleJoin을 joinEvent Server Action으로 교체
components/admin/admin-delete-confirm.tsx onConfirm을 adminDeleteEvent/adminDeleteUser Server Action으로 교체

components/events/event-participants-count.tsx   (NEW — Realtime subscriber, "use client")

app/page.tsx                       getUpcomingEvents → server fetch (await)
app/my-events/page.tsx             getEventsByCreator·getEventsOfParticipant → server fetch
app/events/[id]/page.tsx           getEventById + getParticipantsOfEvent + getCurrentUser → server fetch. participantCount는 EventParticipantsCount client component로 분리(Realtime).
app/events/[id]/edit/page.tsx      getEventById + host/admin 권한 체크 (host 외 redirect)
app/invite/[code]/page.tsx         getEventByInviteCode → server fetch
app/profile/page.tsx               getCurrentUser → server fetch (CURRENT_DUMMY_USER 제거)
app/admin/page.tsx                 DUMMY_* 모두 server fetch (count 쿼리 + getRecentEvents)
app/admin/events/page.tsx          server fetch + AdminDataTable에 items prop 주입 (페이지는 server, table은 client)
app/admin/users/page.tsx           server fetch + AdminDataTable items prop
app/admin/analytics/page.tsx       server fetch (events_with_status view 활용)
```

### 신규 — 통합 테스트 (Task 7)

```
docs/v2-phase3/                    (E2E 시나리오 기록 — production 코드 아님)
├── playwright-mcp-host-flow.md    (주최자 플로우 시나리오 + 결과)
├── playwright-mcp-participant-flow.md
├── playwright-mcp-admin-flow.md
└── playwright-mcp-error-cases.md
```

---

## 책임 분할 근거

- **`lib/queries/`** vs **`lib/actions/`**: queries = read-only(server fetch, no mutation), actions = mutation(`"use server"`). 한 파일에 섞으면 React Server Components 캐싱·revalidate 경계가 불명확. queries는 페이지에서 직접 await, actions는 form 또는 button click handler에서 호출.
- **`lib/auth/`**: 인증 책임 격리. `getCurrentUser` + `requireAdmin`만 export. 다른 파일들은 이를 통해 user identity 접근. Phase 2의 `CURRENT_DUMMY_USER` 직접 import를 제거하기 위한 swap point.
- **헬퍼 시그니처 보존**: Phase 2 dummy의 동기 함수 → Phase 3 async server fetch. signature는 `Promise<Event | null>` 등으로 변경되지만 호출처에서 `await` 추가만 — 페이지가 이미 async server component라 영향 최소. 컴포넌트(EventCard, EventListEmpty 등)는 값 자체를 받으므로 변경 0.
- **마이그레이션 ordering**: 0001~0005가 production-ready, 0006은 dev seed, 0007이 첫 admin 부여(production에서도 필요한 setup이지만 환경 특정). 0007은 idempotent하게 작성(INSERT IF NOT EXISTS 패턴).
- **Server Action 위치 `lib/actions/`** vs `app/actions/`: 컨벤션상 둘 다 가능. v2.0은 `lib/`에 통일 — 도메인 로직은 lib/, 라우팅·UI는 app/. lib/actions/는 페이지 외부에서도 호출 가능(다른 Server Component, 다른 Server Action).

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
- HEAD: `be4db91 fix(v2): Phase 2.1 final reviewer 권고 3건 (다크모드 차트 + KST TODO)` (또는 그 뒤 commit)
- working tree: untracked만 OK

- [x] ~~**사전 1: 새 Supabase project 생성**~~ — REVISION으로 SKIP. 기존 v1.0 project 재사용.

- [x] ~~**사전 2: 환경변수 파일 분기**~~ — REVISION으로 SKIP. 기존 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 그대로. `lib/supabase/{client,server,proxy}.ts` 정정 step은 Task 2에서 제거.

- [x] ~~**사전 3: Supabase CLI link**~~ — REVISION으로 SKIP (v1.0 이미 link 가정).

- [x] ~~**사전 4: Google OAuth Provider 등록**~~ — REVISION으로 SKIP. v1.0이 이미 등록한 Google OAuth Provider 그대로 활용. Site URL·redirect URI도 동일 (이미 `http://localhost:3000` + `<v1-ref>.supabase.co/auth/v1/callback` 등록됨).

- [ ] **사전 5 (신규): v1.0 project 정상 동작 확인**

```bash
# .env.local의 기존 변수 확인
grep -E "^NEXT_PUBLIC_SUPABASE_URL=" .env.local
grep -E "^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=" .env.local

# 빌드가 깨지지 않는지
npm run build 2>&1 | tail -10
```

Expected:
- 두 env 변수 모두 채워져 있음
- 빌드 성공
- v1.0 project가 dev에서 정상 응답 (선택: `npm run dev` 후 `/` 페이지 200 확인)

위 조건 모두 PASS이면 Task 1로 즉시 진행 가능.

---

## Task 1: v2.0 DB 스키마 + RLS + Storage 마이그레이션 (예제 Task 007 전반) — REVISION 적용

> 본 task가 가장 길고 중요하다. 이후 모든 task가 본 마이그레이션 결과에 의존. **REVISION: 기존 v1.0 project 재사용 + 모든 객체에 `v2_` prefix.**

**Files (모두 `supabase/migrations/` 폴더에 — v1.0과 통합, 파일명에 `v2_` 의미 분리):**
- Create: `supabase/migrations/20260525000000_v2_create_users_events_participants.sql`
- Create: `supabase/migrations/20260525000001_v2_create_admin_users.sql`
- Create: `supabase/migrations/20260525000002_v2_create_rls_policies.sql`
- Create: `supabase/migrations/20260525000003_v2_create_events_with_status_view.sql`
- Create: `supabase/migrations/20260525000004_v2_create_storage_event_covers.sql`
- Create: `supabase/migrations/20260525000005_v2_seed_dev_data.sql`
- Create: `supabase/migrations/20260525000006_v2_grant_first_admin.sql`

### Step 1: ~~마이그레이션 폴더 생성~~ — REVISION으로 SKIP

기존 `supabase/migrations/` 폴더 사용. v1.0 마이그레이션 7개와 v2.0 마이그레이션 7개가 같은 폴더에 timestamp 순으로 존재.

```bash
ls supabase/migrations/   # 기존 7개 확인
```

Expected: v1.0 7개 파일 (`20260520*` ~ `20260524*`) 존재.

### Step 2: `20260525000000_v2_create_users_events_participants.sql` — 3 테이블 + 인덱스

Create:

```sql
-- =============================================================================
-- v2.0 Phase 3 Task 007 — 핵심 도메인 테이블 (v2_users · v2_events · v2_event_participants)
-- REVISION: v1.0 project 재사용. 모든 객체에 v2_ prefix.
-- =============================================================================

-- public.v2_users: auth.users 확장 프로필 (v1.0 public.profiles와 별개)
create table public.v2_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.v2_users is 'v2.0 1회성 이벤트 도메인 사용자 프로필. v1.0 profiles와 별개. role은 v2_admin_users 테이블로 분리 (spec §4 결정 B).';

-- public.v2_events: 1회성 이벤트 (v1.0 events는 회차 — 별개)
create table public.v2_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  description text check (char_length(description) <= 1000),
  cover_image_url text,
  event_date timestamptz not null,
  location text not null check (char_length(location) between 1 and 200),
  invite_code text unique not null,
  created_by uuid not null references public.v2_users(id) on delete cascade,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.v2_events is 'v2.0 1회성 이벤트. v1.0 events(회차)와 prefix로 분리.';
comment on column public.v2_events.invite_code is 'crypto.randomBytes(32).toString("base64url"). UNIQUE 제약 + Server Action에서 충돌 시 재시도.';
comment on column public.v2_events.event_date is 'UTC 저장 (timestamptz). KST 입력은 클라이언트가 kstDateTimeLocalToIso로 변환 후 전달.';

-- status 컬럼은 view(v2_events_with_status)에서 계산. 테이블에는 저장 안 함.

-- public.v2_event_participants: 참여 관계 (composite key)
create table public.v2_event_participants (
  event_id uuid not null references public.v2_events(id) on delete cascade,
  user_id uuid not null references public.v2_users(id) on delete cascade,
  joined_at timestamptz default now() not null,
  primary key (event_id, user_id)
);

-- 인덱스 (이름에도 v2_ prefix — 같은 schema 내 unique 필요)
create index v2_events_invite_code_idx on public.v2_events(invite_code);
create index v2_events_created_by_idx on public.v2_events(created_by);
create index v2_events_event_date_idx on public.v2_events(event_date);
create index v2_event_participants_user_id_idx on public.v2_event_participants(user_id);

-- v1.0 public.handle_updated_at() 함수는 이미 존재 → 재사용 (정의 안 함).
-- updated_at 자동 갱신 트리거만 추가
create trigger v2_users_updated_at before update on public.v2_users
  for each row execute function public.handle_updated_at();

create trigger v2_events_updated_at before update on public.v2_events
  for each row execute function public.handle_updated_at();

-- auth.users INSERT 시 v2_users 자동 생성 (v1.0의 handle_new_user는 profiles 처리 — 병행 실행)
create or replace function public.v2_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.v2_users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_v2
  after insert on auth.users
  for each row execute function public.v2_handle_new_user();

-- RLS 활성화 (정책은 v2_create_rls_policies 마이그레이션에서)
alter table public.v2_users enable row level security;
alter table public.v2_events enable row level security;
alter table public.v2_event_participants enable row level security;
```

설명:
- `event_date timestamptz` — UTC 저장. KST 입력은 클라이언트 `kstDateTimeLocalToIso` 변환 후 전달(Phase 2.1 TODO 해소).
- `status` 컬럼 없음 — 0004의 `events_with_status` view에서 동적 계산.
- `handle_new_user` 트리거 — Google OAuth 콜백 시 `public.users`에 자동 upsert. `raw_user_meta_data`에서 `full_name`/`avatar_url` 추출.
- `security definer + search_path = public` — RLS 헬퍼 함수 안전 패턴(v1.0 학습 자산 재사용).

### Step 3: `20260525000001_v2_create_admin_users.sql` — admin 부여 테이블 + RLS 헬퍼 함수

Create:

```sql
-- =============================================================================
-- v2.0 Phase 3 Task 007 — v2_admin_users 테이블 (spec §4 결정 B)
-- =============================================================================

create table public.v2_admin_users (
  id uuid primary key references public.v2_users(id) on delete cascade,
  granted_by uuid references public.v2_users(id) on delete set null,
  granted_at timestamptz default now() not null,
  reason text
);

comment on table public.v2_admin_users is 'v2.0 admin role 부여 기록. self-promote 불가(RLS DENY ALL except service_role). 첫 admin은 v2_grant_first_admin 마이그레이션이 부여.';

alter table public.v2_admin_users enable row level security;

-- v2_admin 본인 + admin인 사람만 SELECT
-- INSERT/UPDATE/DELETE는 service_role 또는 마이그레이션에서만 (RLS 정책 없음 = DENY)

-- RLS 헬퍼 함수: 현재 사용자가 v2.0 admin인지 (3중 안전장치)
create or replace function public.v2_is_admin(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result boolean;
begin
  -- SET LOCAL row_security TO OFF는 함수 내부 쿼리가 RLS 우회하도록
  set local row_security = off;
  select exists (
    select 1 from public.v2_admin_users where id = target_user_id
  ) into result;
  return result;
end;
$$;

comment on function public.v2_is_admin(uuid) is 'v2.0 RLS 정책에서 admin 권한 체크 시 사용. SECURITY DEFINER + row_security OFF로 v2_admin_users에 RLS 무한 재귀 없이 접근.';

-- 함수 권한: authenticated만 EXECUTE
revoke execute on function public.v2_is_admin(uuid) from public;
grant execute on function public.v2_is_admin(uuid) to authenticated;

-- admin이 자기 자신 + 다른 admin 정보 조회 가능
create policy v2_admin_users_select_admin_only on public.v2_admin_users
  for select to authenticated
  using (public.v2_is_admin(auth.uid()));
```

설명:
- `is_admin(uuid)` 함수가 핵심. RLS 정책 내부에서 `public.is_admin(auth.uid())` 호출.
- `SET LOCAL row_security = off` — 함수가 admin_users를 직접 SELECT할 때 RLS 재귀 회피(v1.0 학습 자산의 3중 안전장치).
- `stable` 마커 — 같은 트랜잭션 내 동일 입력은 캐싱 (성능).
- INSERT/UPDATE/DELETE 정책 없음 → 사용자 self-promote 불가. 마이그레이션 또는 service_role API만 부여.

### Step 4: `20260525000002_v2_create_rls_policies.sql` — RLS 정책 정의

Create:

```sql
-- =============================================================================
-- v2.0 Phase 3 Task 007 — RLS 정책 (spec §5 high-level 매트릭스 구현, v2_ prefix)
-- =============================================================================

-- ============================ v2_users 테이블 ============================
create policy v2_users_select_self_or_admin on public.v2_users
  for select to authenticated
  using (auth.uid() = id or public.v2_is_admin(auth.uid()));

create policy v2_users_update_self on public.v2_users
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy v2_users_delete_admin_only on public.v2_users
  for delete to authenticated
  using (public.v2_is_admin(auth.uid()));

-- INSERT: v2_handle_new_user 트리거가 처리. 명시적 정책 없음.

-- ============================ v2_events 테이블 ============================
create policy v2_events_select_all_authenticated on public.v2_events
  for select to authenticated
  using (true);

-- 비인증 invite 페이지는 v2_get_event_by_invite_code SECURITY DEFINER 함수로 우회.
-- anon SELECT 정책 불필요.

create policy v2_events_insert_authenticated on public.v2_events
  for insert to authenticated
  with check (auth.uid() = created_by);

create policy v2_events_update_owner_or_admin on public.v2_events
  for update to authenticated
  using (auth.uid() = created_by or public.v2_is_admin(auth.uid()))
  with check (auth.uid() = created_by or public.v2_is_admin(auth.uid()));

create policy v2_events_delete_owner_or_admin on public.v2_events
  for delete to authenticated
  using (auth.uid() = created_by or public.v2_is_admin(auth.uid()));

-- ============================ v2_event_participants 테이블 ============================
create policy v2_event_participants_select on public.v2_event_participants
  for select to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.v2_events e where e.id = event_id and e.created_by = auth.uid())
    or public.v2_is_admin(auth.uid())
    or exists (select 1 from public.v2_event_participants p where p.event_id = v2_event_participants.event_id and p.user_id = auth.uid())
  );

create policy v2_event_participants_insert_self on public.v2_event_participants
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy v2_event_participants_delete on public.v2_event_participants
  for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.v2_events e where e.id = event_id and e.created_by = auth.uid())
    or public.v2_is_admin(auth.uid())
  );
```

설명:
- `events_select_by_invite_anon` — invite 페이지(비로그인 OK) 지원. `current_setting('request.headers', true)` 패턴으로 클라이언트가 `x-invite-code` 헤더 전달 → 또는 server-side 함수 `get_event_by_invite_code(code)` SECURITY DEFINER 패턴으로 대체 가능. 본 plan은 server 함수 패턴(다음 step) 추가.
- `event_participants_select`의 참여자 4중 조건 — 본인 / 주최자 / admin / 같은 이벤트 참여자. spec §5 그대로.
- UPDATE 정책에 `with check` 추가 — owner 변경 시도 차단.

### Step 5: `20260525000003_v2_create_events_with_status_view.sql` — status 자동 계산 view + 보조 함수

Create:

```sql
-- =============================================================================
-- v2.0 Phase 3 Task 007 — v2_events_with_status view (spec §5 결정 2)
-- =============================================================================

create or replace view public.v2_events_with_status
with (security_invoker = true) as
select
  e.*,
  case
    when e.event_date > now() then 'upcoming'
    when e.event_date > now() - interval '4 hours' then 'ongoing'
    else 'completed'
  end::text as status
from public.v2_events e;

comment on view public.v2_events_with_status is 'v2_events + status 동적 계산. RLS는 v2_events 정책을 통해 자동 적용.';

grant select on public.v2_events_with_status to authenticated, anon;

-- ============================ invite_code 조회 함수 (anon 지원) ============================

create or replace function public.v2_get_event_by_invite_code(p_code text)
returns public.v2_events_with_status
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result public.v2_events_with_status;
begin
  set local row_security = off;
  select * into result from public.v2_events_with_status where invite_code = p_code limit 1;
  return result;
end;
$$;

comment on function public.v2_get_event_by_invite_code(text) is '비로그인 사용자도 초대 코드로 단일 v2_event 미리보기. RLS bypass via SECURITY DEFINER.';

grant execute on function public.v2_get_event_by_invite_code(text) to anon, authenticated;
```

설명:
- 4시간 ongoing 윈도우 — 이벤트는 일반적으로 1~4시간. 본 plan은 4시간으로 고정. 추후 events 테이블에 `duration_hours` 컬럼 추가 시 dynamic화 가능(v2.x).
- `get_event_by_invite_code` SECURITY DEFINER — invite RLS 정책의 `current_setting` 패턴보다 안전·단순.

### Step 6: `20260525000004_v2_create_storage_event_covers.sql` — event-covers 버킷 + RLS

> 버킷명 `event-covers` 그대로 (v1.0 Storage 사용 0 — 충돌 없음). RLS 정책 이름과 참조 테이블만 v2_ prefix.

Create:

```sql
-- =============================================================================
-- v2.0 Phase 3 Task 007 — event-covers Storage 버킷 (spec §3)
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('event-covers', 'event-covers', true)
on conflict (id) do nothing;

-- INSERT: v2_events 주최자만 (file path: events/{event_id}/cover.{ext})
create policy v2_event_covers_insert_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'event-covers'
    and exists (
      select 1 from public.v2_events e
      where e.created_by = auth.uid()
      and (storage.foldername(name))[1] = 'events'
      and (storage.foldername(name))[2] = e.id::text
    )
  );

create policy v2_event_covers_update_owner on storage.objects
  for update to authenticated
  using (
    bucket_id = 'event-covers'
    and exists (
      select 1 from public.v2_events e
      where e.created_by = auth.uid()
      and (storage.foldername(name))[1] = 'events'
      and (storage.foldername(name))[2] = e.id::text
    )
  );

create policy v2_event_covers_delete_owner_or_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'event-covers'
    and (
      public.v2_is_admin(auth.uid())
      or exists (
        select 1 from public.v2_events e
        where e.created_by = auth.uid()
        and (storage.foldername(name))[1] = 'events'
        and (storage.foldername(name))[2] = e.id::text
      )
    )
  );

-- SELECT: bucket이 public이므로 자동.
```

설명:
- `storage.foldername(name)` — path를 `/`로 split. `events/{uuid}/cover.jpg` → `['events', '{uuid}', 'cover.jpg']`.
- INSERT는 이벤트가 이미 존재해야 가능 → 새 이벤트 생성 시 row INSERT 후 storage upload (Task 4 순서).

### Step 7: `20260525000005_v2_seed_dev_data.sql` — 더미 시드 (dev only)

Create:

```sql
-- =============================================================================
-- v2.0 Phase 3 Task 007 — dev seed data (Phase 2 lib/dummy 일관성 유지)
-- production 마이그레이션에는 포함 안 함 (파일 prefix '_seed_'로 분기 검토)
-- =============================================================================

-- 주의: auth.users 직접 INSERT는 dev에서만 권장. production에서는 OAuth 가입을 거쳐 생성.
-- 본 시드는 admin 차트 다양성 + 학습 화면 데모 용도.

-- ============================ 시드 사용자 (5명) ============================
-- 실제 auth.users 가입이 어려운 dev 환경 — Supabase Dashboard SQL Editor에서 수동 INSERT
-- 또는 admin API로 생성 후 본 마이그레이션의 public.users INSERT 부분만 실행

-- public.users INSERT (auth.users.id는 같은 값으로 미리 생성 가정)
-- dev에서 빠른 셋업: Supabase Dashboard에서 5명 가입 후 ID를 아래에 대입

-- 본 마이그레이션은 placeholder. 실제 dev 시 사용자가 가입한 ID로 SQL Editor에서 수동 INSERT.
-- 그러므로 본 파일은 '템플릿' 역할이고, controller가 실행 시 사용자에게 ID 매핑을 받아 작성한다.

-- 예시 (사용자가 가입 후 SQL Editor에서):
-- insert into public.events (id, title, description, event_date, location, invite_code, created_by) values
--   (gen_random_uuid(), 'Next.js 16 Cache Components 실습 모임', 'Cache Components와 Suspense 패턴을 실습하며 토론합니다.',
--    now() + interval '7 days', '강남역 모임공간 A호실',
--    encode(gen_random_bytes(32), 'base64'), '<host1-uuid>');
-- ...

-- 본 plan의 0006 마이그레이션은 위 패턴을 8개 이벤트 + 14 참여 관계로 확장한 SQL을 작성한다.
-- 정확한 UUID는 dev 환경 의존이므로 plan 작성 시 placeholder로 두고, 실행 시 controller가 채워 commit.

-- Phase 2 lib/dummy/events.ts 데이터와 동일 구조 (e-001~e-010, 6 upcoming / 1 ongoing / 3 completed).
-- 정확한 SQL은 Task 1 Step 7 실행 시점에 사용자 가입 ID를 받아 controller가 작성.
```

설명:
- 본 0006은 plan 작성 시점에는 템플릿 + 가이드. 실행 시점에 controller가 사용자 가입 ID를 받아 SQL을 완성.
- 학습 흐름: 사용자가 dev에서 5번 Google OAuth 로그인 → 5 user_id 확보 → controller에게 전달 → controller가 0006_seed_dev_data.sql을 사용자 ID로 채워 INSERT.
- 대체 옵션: production 가입 흐름을 dev에서 그대로 수행 후 admin 화면에서 직접 INSERT. 학습 가치 더 높음 — 본 plan은 두 옵션 모두 명시.

### Step 8: `20260525000006_v2_grant_first_admin.sql` — 첫 admin 부여 (inmingoon@gmail.com)

Create:

```sql
-- =============================================================================
-- v2.0 Phase 3 Task 007 — 첫 v2_admin 부여 (spec §4 결정 3 하드코딩)
-- =============================================================================

do $$
declare
  target_email text := 'inmingoon@gmail.com';
  target_uid uuid;
begin
  select id into target_uid from auth.users where email = target_email limit 1;

  if target_uid is null then
    raise notice 'First v2 admin email % not registered yet. Re-run this migration after user signs up via Google OAuth.', target_email;
  else
    -- v2_users에도 row 있어야 FK 충족 (v2_handle_new_user 트리거가 INSERT 이후 자동 처리하지만, 사용자가 트리거 이전 가입한 경우 대비)
    insert into public.v2_users (id, email)
    values (target_uid, target_email)
    on conflict (id) do nothing;

    insert into public.v2_admin_users (id, granted_by, reason)
    values (target_uid, target_uid, 'First v2 admin — bootstrapped via v2_grant_first_admin migration')
    on conflict (id) do nothing;

    raise notice 'First v2 admin granted: %', target_email;
  end if;
end;
$$;
```

설명:
- v2_users INSERT을 먼저 (FK 충족 보장). v2_handle_new_user 트리거가 이미 처리했다면 `on conflict do nothing`으로 silent skip.
- v2_admin_users INSERT idempotent.

설명:
- DO 블록 — 일회성 스크립트. `raise notice`는 SQL Editor에 출력.
- `on conflict (id) do nothing` — idempotent. 다시 실행해도 안전.
- 사용자가 아직 가입 안 했으면 skip + notice. 가입 후 본 SQL을 SQL Editor에 다시 붙여넣어 부여.

### Step 9: 마이그레이션 적용 (CLI 또는 SQL Editor)

옵션 A — Supabase CLI (권장 — v1.0 link 이미 있다고 가정):

```bash
npx supabase db push
```

CLI가 `supabase/migrations/` 폴더의 새 파일(20260525000000~20260525000006_v2_*.sql) 7개를 timestamp 순으로 자동 적용. v1.0 마이그레이션은 이미 적용됐으므로 skip됨.

옵션 B — SQL Editor 수동:

1. Supabase Dashboard → SQL Editor
2. 7 파일 순서대로 (timestamp 순) Run:
   - `20260525000000_v2_create_users_events_participants.sql`
   - `20260525000001_v2_create_admin_users.sql`
   - `20260525000002_v2_create_rls_policies.sql`
   - `20260525000003_v2_create_events_with_status_view.sql`
   - `20260525000004_v2_create_storage_event_covers.sql`
   - `20260525000006_v2_grant_first_admin.sql` (가입 전이면 notice 후 skip)
   - `20260525000005_v2_seed_dev_data.sql` (사용자 5명 가입 후)

Expected: 모두 SUCCESS. RLS 정책 활성화 + 테이블 4개 + view 1개 + 함수 2개 + 트리거 1개 신설.

### Step 10: commit

```bash
git add supabase/migrations/
git commit -m "$(cat <<'EOF'
feat(v2): Phase 3 Task 007 DB 스키마 + RLS + Storage 마이그레이션 (v2_ prefix)

REVISION: 기존 v1.0 Supabase project 재사용 + 모든 객체에 v2_ prefix.

신규 (supabase/migrations/ 통합 — v1.0과 같은 폴더, timestamp 분리):
- 20260525000000_v2_create_users_events_participants.sql: v2_users +
  v2_events + v2_event_participants 테이블 + 인덱스 + v2_handle_new_user
  트리거 (auth.users → v2_users upsert, v1.0 profiles 트리거와 병행)
- 20260525000001_v2_create_admin_users.sql: v2_admin_users + v2_is_admin
  RLS 헬퍼 함수 (3중 안전장치)
- 20260525000002_v2_create_rls_policies.sql: v2_users·v2_events·
  v2_event_participants RLS 정책 (spec §5 매트릭스)
- 20260525000003_v2_create_events_with_status_view.sql: v2_events_with_status
  view + v2_get_event_by_invite_code SECURITY DEFINER (anon 지원)
- 20260525000004_v2_create_storage_event_covers.sql: event-covers 버킷 +
  v2_event_covers_* 정책 (v1.0 Storage 사용 0 — 버킷명 충돌 없음)
- 20260525000005_v2_seed_dev_data.sql: dev seed 템플릿
- 20260525000006_v2_grant_first_admin.sql: inmingoon@gmail.com
  하드코딩 + idempotent + v2_users FK 충족 보장

Plan: docs/superpowers/plans/2026-05-25-event-platform-v2-phase3.md
Spec: docs/superpowers/specs/2026-05-24-event-platform-v2-design.md (§4·5)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: TypeScript types regenerate + `lib/queries/*` + `lib/auth/*` (예제 Task 007 후반) — REVISION 적용

> Phase 2의 `lib/dummy/*.ts`를 `lib/queries/*.ts`로 1:1 교체. 함수 시그니처 보존 → 페이지/컴포넌트 코드 변경 0 목표. **REVISION: env 정정 step 제거. queries의 `.from("...")`은 모두 `v2_` prefix.**

**Files:**
- ~~Modify: `lib/supabase/client.ts` · `server.ts` · `proxy.ts`~~ — SKIP (기존 env 그대로)
- Modify: `lib/database.types.ts` (supabase gen types 자동 생성, v1.0 + v2_ 테이블 모두 포함)
- Create: `lib/queries/users.ts` · `events.ts` · `participants.ts` (`v2_` 테이블 참조)
- Create: `lib/auth/current-user.ts` · `require-admin.ts` (`v2_admin_users` 참조)
- Delete: `lib/dummy/users.ts` · `events.ts` · `participants.ts`
- Modify: 13개 페이지 + 컴포넌트 (dummy import → queries import)

### Step 1: ~~`lib/supabase/{client,server,proxy}.ts` env 정정~~ — REVISION으로 SKIP

기존 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 그대로 사용. 3 파일 변경 없음.

### Step 2: TypeScript types 생성 (v1.0 + v2_ 통합 schema)

옵션 A — Supabase CLI (v1.0 project link 이미 있다고 가정):
```bash
npx supabase gen types typescript --linked --schema public > lib/database.types.ts
```

옵션 B — Supabase Dashboard:
1. Dashboard → API Docs → "Generate TypeScript types"
2. 출력을 `lib/database.types.ts`에 복붙

Expected: `Database` 제네릭에 v1.0 테이블(profiles·groups·events·event_participations 등) **+** v2_ 테이블(v2_users·v2_events·v2_event_participants·v2_admin_users) + view(v2_events_with_status) + 함수(v2_is_admin·v2_get_event_by_invite_code) 모두 포함.

### Step 3: `lib/queries/users.ts`

Create:

```ts
import { createClient } from "@/lib/supabase/server";
import type { User } from "@/types/user";
import type { Database } from "@/lib/database.types";

function mapUserRow(row: Database["public"]["Tables"]["v2_users"]["Row"], isAdmin: boolean): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: isAdmin ? "admin" : "participant",
    createdAt: row.created_at,
  };
}

export async function getUserById(id: string): Promise<User | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v2_users").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const { count } = await supabase.from("v2_admin_users").select("*", { count: "exact", head: true }).eq("id", id);
  return mapUserRow(data, (count ?? 0) > 0);
}

export async function getUsersByRole(role: User["role"]): Promise<User[]> {
  const supabase = await createClient();
  if (role === "admin") {
    const { data } = await supabase
      .from("v2_admin_users")
      .select("id, v2_users:v2_users!inner(*)")
      .order("granted_at", { ascending: false });
    return (data ?? []).map((r) => mapUserRow(r.v2_users as Database["public"]["Tables"]["v2_users"]["Row"], true));
  }
  const { data } = await supabase.from("v2_users").select("*").order("created_at", { ascending: false });
  return (data ?? []).map((r) => mapUserRow(r, false));
}

export async function listAllUsersForAdmin(): Promise<User[]> {
  const supabase = await createClient();
  const { data: users } = await supabase.from("v2_users").select("*").order("created_at", { ascending: false });
  if (!users) return [];
  const { data: admins } = await supabase.from("v2_admin_users").select("id");
  const adminSet = new Set((admins ?? []).map((a) => a.id));
  return users.map((u) => mapUserRow(u, adminSet.has(u.id)));
}
```

설명:
- Phase 2의 `User.role: "host" | "participant" | "admin"` 외부 인터페이스 보존.
- DB에는 role 컬럼 없음 → admin_users 테이블 존재 여부로 admin 판단. host/participant는 컨텍스트 의존(이벤트 주최 여부)이라 외부에서 결정.
- `mapUserRow`로 snake_case DB row → camelCase 외부 타입 변환 일관화.

### Step 4: `lib/queries/events.ts`

Create:

```ts
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/types/event";
import type { Database } from "@/lib/database.types";

type EventWithStatusRow = Database["public"]["Views"]["v2_events_with_status"]["Row"];

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

export async function getEventById(id: string): Promise<Event | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("v2_events_with_status").select("*").eq("id", id).maybeSingle();
  return data ? mapEventRow(data) : null;
}

export async function getEventByInviteCode(code: string): Promise<Event | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("v2_get_event_by_invite_code", { p_code: code });
  if (!data) return null;
  return mapEventRow(data as EventWithStatusRow);
}

export async function getEventsByCreator(userId: string): Promise<Event[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v2_events_with_status")
    .select("*")
    .eq("created_by", userId)
    .order("event_date", { ascending: false });
  return (data ?? []).map(mapEventRow);
}

export async function getRecentEvents(limit = 5): Promise<Event[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v2_events_with_status")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapEventRow);
}

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

export async function listAllEventsForAdmin(): Promise<Event[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v2_events_with_status")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapEventRow);
}
```

설명:
- `events_with_status` view를 직접 쿼리 → status 컬럼 자동 포함.
- `getEventByInviteCode`는 `supabase.rpc()`로 SECURITY DEFINER 함수 호출(anon 지원).
- 함수 시그니처 = Phase 2 dummy와 동일 (반환 타입 `Promise<Event | null>` 또는 `Promise<Event[]>`만 다름).

### Step 5: `lib/queries/participants.ts`

Create:

```ts
import { createClient } from "@/lib/supabase/server";
import type { EventParticipant } from "@/types/event-participant";
import type { Event } from "@/types/event";
import type { Database } from "@/lib/database.types";

function mapParticipantRow(row: Database["public"]["Tables"]["v2_event_participants"]["Row"]): EventParticipant {
  return {
    eventId: row.event_id,
    userId: row.user_id,
    joinedAt: row.joined_at,
  };
}

function mapEventRow(row: Database["public"]["Views"]["v2_events_with_status"]["Row"]): Event {
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

export async function getParticipantsOfEvent(eventId: string): Promise<EventParticipant[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v2_event_participants")
    .select("*")
    .eq("event_id", eventId)
    .order("joined_at", { ascending: true });
  return (data ?? []).map(mapParticipantRow);
}

export async function getEventsOfParticipant(userId: string): Promise<Event[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v2_event_participants")
    .select("event_id, v2_events_with_status:v2_events_with_status!inner(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
  return (data ?? []).map((r) =>
    mapEventRow(r.v2_events_with_status as Database["public"]["Views"]["v2_events_with_status"]["Row"])
  );
}

export async function countParticipantsOfEvent(eventId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("v2_event_participants")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);
  return count ?? 0;
}
```

설명:
- `getEventsOfParticipant`는 inner join 패턴 — Phase 2의 `Event[]` 반환 유지.
- `countParticipantsOfEvent`는 `count: 'exact', head: true`로 row 없이 카운트만.

### Step 6: `lib/auth/current-user.ts`

Create:

```ts
import { createClient } from "@/lib/supabase/server";
import { getUserById } from "@/lib/queries/users";
import type { User } from "@/types/user";

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  return getUserById(authUser.id);
}
```

설명:
- Phase 2 `CURRENT_DUMMY_USER` 호환 패턴 (단, null 반환 가능).
- 컴포넌트가 `await getCurrentUser()`로 사용.

### Step 7: `lib/auth/require-admin.ts`

Create:

```ts
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { count } = await supabase
    .from("v2_admin_users")
    .select("*", { count: "exact", head: true })
    .eq("id", user.id);

  if (!count || count === 0) {
    redirect("/admin/login?reason=not_admin");
  }

  return { userId: user.id };
}
```

설명:
- admin 라우트 진입 시 첫 줄에서 호출.
- 비로그인 → `/admin/login` redirect.
- admin 아님 → `/admin/login?reason=not_admin` redirect (login 페이지에서 메시지 표시).

### Step 8: dummy 폐기 + import 일괄 교체

폐기:
```bash
rm lib/dummy/users.ts lib/dummy/events.ts lib/dummy/participants.ts
rmdir lib/dummy
```

PowerShell 대안:
```powershell
Remove-Item -Recurse -Force lib/dummy
```

import 교체 (페이지 + 컴포넌트):

```
@/lib/dummy/users    → @/lib/queries/users    (대부분 사용처에서 함수명 그대로)
@/lib/dummy/events   → @/lib/queries/events
@/lib/dummy/participants → @/lib/queries/participants
CURRENT_DUMMY_USER (@/lib/dummy/users)   → 페이지에서 await getCurrentUser() (@/lib/auth/current-user)
```

**일괄 교체 대상 파일 12개** (Phase 2 산출물 기준):
- `app/page.tsx`
- `app/my-events/page.tsx`
- `app/events/[id]/page.tsx`
- `app/events/[id]/edit/page.tsx`
- `app/invite/[code]/page.tsx`
- `app/profile/page.tsx`
- `app/admin/page.tsx`
- `app/admin/events/page.tsx`
- `app/admin/users/page.tsx`
- `app/admin/analytics/page.tsx`
- `components/events/event-participants-list.tsx` (getUserById)
- `components/events/event-card.tsx` (변경 없음 — Event 받아 표시만)

각 파일에서:
1. `import { DUMMY_EVENTS, getRecentEvents } from "@/lib/dummy/events"` → `import { getRecentEvents, listAllEventsForAdmin } from "@/lib/queries/events"`
2. `const recent = getRecentEvents(5)` → `const recent = await getRecentEvents(5)` (페이지가 async 서버 컴포넌트라면 await 추가만)
3. `CURRENT_DUMMY_USER.id` → `const user = await getCurrentUser(); if (!user) redirect("/auth/login"); user.id`

> 정확한 교체는 12개 파일별로 정형 패턴. 본 plan 길이 절제 위해 step-by-step 코드 inline은 admin/events 페이지만 예시.

### Step 9: `app/admin/events/page.tsx` 예시 교체

기존(Phase 2):
```tsx
"use client";

import { DUMMY_EVENTS } from "@/lib/dummy/events";
// ...
<AdminDataTable<Event> items={DUMMY_EVENTS} ... />
```

변경: page는 server로 다시 변경 + AdminDataTable은 client child로 분리.

먼저 `components/admin/admin-events-table.tsx` 신설 ("use client", AdminDataTable wrapping + COLUMNS):

```tsx
"use client";

import { AdminDataTable, type Column } from "./admin-data-table";
import { AdminDeleteConfirm } from "./admin-delete-confirm";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { formatKstDateShort } from "@/lib/datetime";
import { adminDeleteEvent } from "@/lib/actions/admin-events";
import Link from "next/link";
import type { Event } from "@/types/event";

const COLUMNS: Column<Event>[] = [
  // (Phase 2 COLUMNS 그대로)
];

const SEARCH_KEY = (e: Event) => `${e.title} ${e.location}`;
const GET_ROW_ID = (e: Event) => e.id;

export function AdminEventsTable({ events }: { events: Event[] }) {
  return (
    <AdminDataTable<Event>
      items={events}
      columns={COLUMNS}
      searchKey={SEARCH_KEY}
      getRowId={GET_ROW_ID}
      searchPlaceholder="제목 또는 장소 검색..."
      rowActions={(e) => (
        <AdminDeleteConfirm
          itemLabel={e.title}
          resourceType="이벤트"
          onConfirm={async (reason) => {
            await adminDeleteEvent({ eventId: e.id, reason });
          }}
        />
      )}
    />
  );
}
```

> Phase 2의 COLUMNS는 그대로 옮김. 변경: rowActions의 onConfirm이 `adminDeleteEvent` Server Action 호출 (Task 6에서 구현).

`app/admin/events/page.tsx` 변경: server component로 환원 + 위 client child 사용:

```tsx
import { listAllEventsForAdmin } from "@/lib/queries/events";
import { AdminEventsTable } from "@/components/admin/admin-events-table";

export default async function AdminEventsPage() {
  const events = await listAllEventsForAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">이벤트 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 이벤트를 검색·정렬·삭제할 수 있습니다.
        </p>
      </div>
      <AdminEventsTable events={events} />
    </div>
  );
}
```

설명:
- page는 server (data fetch). table은 client (state).
- final reviewer의 Minor #7 ("page-level use client → split into server+client") 해소.
- `users` 페이지도 동일 패턴 (`AdminUsersTable` 신설).

### Step 10: typecheck + lint + build

```bash
npx tsc --noEmit
npm run lint
npm run build 2>&1 | tail -40
```

Expected:
- 0 error
- 0 warning
- 빌드 성공 (단, .env.local의 V2 변수가 채워져 있어야 함)
- 25 routes 유지 (admin/events·users 페이지가 server로 환원되어 partial prerender 가능)

만약 환경변수 미설정으로 빌드 실패:
- `lib/utils.ts`의 `hasEnvVars` 체크가 V2 변수도 인식하도록 정정 필요. Phase 3 사전 2 단계에서 확인.

### Step 11: commit

```bash
git add lib/queries/ lib/auth/ lib/supabase/ lib/database.types.ts app/ components/admin/admin-events-table.tsx components/admin/admin-users-table.tsx
git rm -r lib/dummy/
git commit -m "$(cat <<'EOF'
feat(v2): Phase 3 Task 007 후반 — lib/queries + lib/auth + dummy 폐기

신규:
- lib/queries/{users,events,participants}.ts: Phase 2 dummy 시그니처 보존
  + body만 server fetch로 교체. DB row → 외부 타입 변환 일관화.
- lib/auth/current-user.ts: getCurrentUser (auth.users + public.users join)
- lib/auth/require-admin.ts: admin 라우트 server guard (redirect /admin/login)
- components/admin/admin-events-table.tsx · admin-users-table.tsx:
  Phase 2 client page 로직을 client child로 분리 (page는 server)

수정:
- lib/database.types.ts: supabase gen types 자동 생성 (v1.0 + v2_ 통합 schema)
- 12개 페이지: dummy import → queries import + await 추가, server component
  환원 (admin/events·users)
- (REVISION) lib/supabase/* env 정정 SKIP — 기존 v1.0 변수 그대로

폐기:
- lib/dummy/{users,events,participants}.ts

Phase 2 산출 컴포넌트(EventCard, EventStatusBadge, EventForm 등)는 변경 0.
Server Action 통합(submit·delete)은 Task 4·6에서 진행.

Plan: docs/superpowers/plans/2026-05-25-event-platform-v2-phase3.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Google OAuth + admin middleware + proxy.ts (예제 Task 008)

**Files:**
- Modify: `proxy.ts` (또는 `lib/supabase/proxy.ts`) — whitelist 확장
- Modify: `app/auth/login/page.tsx` — Google OAuth 우선 + v2.0 도메인 용어
- Modify: `app/auth/callback/route.ts` — OAuth 콜백 (이미 v1.0에 존재, 검토 후 수정)
- Modify: `app/admin/layout.tsx` — `await requireAdmin()` 첫 줄 추가
- Modify: `app/admin/login/page.tsx` — 더미 form → Google OAuth 버튼 또는 이메일+비밀번호 → Supabase Auth signIn

### Step 1: `proxy.ts` whitelist 확장

기존 `lib/supabase/proxy.ts`의 `updateSession`은 session refresh만 처리. whitelist 분기는 별도 추가.

`lib/supabase/proxy.ts`의 `updateSession` 함수 끝부분에 다음 로직 추가 (cookie sync 후):

```ts
// 인증 가드: 비로그인 사용자 redirect (whitelist 외)
const { data: { user } } = await supabase.auth.getUser();

const path = request.nextUrl.pathname;
const WHITELIST = [
  "/",
  "/auth/login",
  "/auth/callback",
  "/auth/confirm",
  "/auth/error",
  "/auth/forgot-password",
  "/auth/sign-up",
  "/auth/sign-up-success",
  "/auth/update-password",
  "/admin/login",
];

const isWhitelisted = WHITELIST.includes(path) || path.startsWith("/invite/");

if (!user && !isWhitelisted) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = path.startsWith("/admin") ? "/admin/login" : "/auth/login";
  loginUrl.searchParams.set("redirect", path);
  return NextResponse.redirect(loginUrl);
}

return supabaseResponse;
```

설명:
- `/invite/[code]` 페이지는 비로그인 OK (Phase 1 spec §6 결정).
- `/admin/*` redirect는 `/admin/login`으로, 나머지는 `/auth/login`.
- admin role 검증은 본 proxy에서 안 함 — `app/admin/layout.tsx`의 server guard에서.

### Step 2: `app/admin/layout.tsx`에 admin guard 추가

기존 layout 첫 줄에 추가:

```tsx
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // /admin/login은 본 layout에서 제외하기 어려움 (route group 없이는). 본 plan은 /admin/login에서 redirect 무한 루프 회피를 위해 layout 내부에서 path 체크.
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="border-b bg-background px-6 py-4 md:px-8">
          <p className="text-xs text-muted-foreground">v2.0 관리자 콘솔</p>
        </header>
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
```

**문제: `/admin/login`이 본 layout에 wrap되면 무한 redirect.** 해결: route group `app/admin/(authed)/`로 admin 라우트 이동 + `/admin/login`은 layout 우회.

**Refactor — route group으로 admin/login 분리:**

```
app/admin/
├── layout.tsx                ← 본 task에서 폐기 또는 default layout만
├── (authed)/                 ← NEW route group, admin guard 적용
│   ├── layout.tsx           ← 신규 — requireAdmin + AdminSidebar
│   ├── page.tsx              ← Phase 2의 admin/page.tsx 이동
│   ├── events/page.tsx
│   ├── users/page.tsx
│   └── analytics/page.tsx
└── login/                    ← (authed) 밖, 우회
    └── page.tsx
```

Move 명령:
```bash
mkdir -p app/admin/\(authed\)
mv app/admin/page.tsx app/admin/\(authed\)/page.tsx
mv app/admin/events app/admin/\(authed\)/events
mv app/admin/users app/admin/\(authed\)/users
mv app/admin/analytics app/admin/\(authed\)/analytics
mv app/admin/layout.tsx app/admin/\(authed\)/layout.tsx
```

PowerShell:
```powershell
New-Item -ItemType Directory app/admin/(authed)
Move-Item app/admin/page.tsx app/admin/(authed)/page.tsx
Move-Item app/admin/events app/admin/(authed)/events
Move-Item app/admin/users app/admin/(authed)/users
Move-Item app/admin/analytics app/admin/(authed)/analytics
Move-Item app/admin/layout.tsx app/admin/(authed)/layout.tsx
```

`app/admin/(authed)/layout.tsx`에 위 코드 적용 (requireAdmin first line).

`app/admin/login/page.tsx`는 layout 없이 단독 (기존 `min-h-[calc(100vh-3rem)]` 패턴 유지).

### Step 3: `app/auth/login/page.tsx` — v2.0 도메인 + Google OAuth 우선

Phase 2 Task 1에서 일부 정정됨. Phase 3은 Google OAuth 버튼만 노출하고 이메일+비밀번호는 비활성(또는 별도 sign-up):

기존 form 위에 Google 버튼 추가 + 헤딩 정정:

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback${
      searchParams.redirect ? `?next=${encodeURIComponent(searchParams.redirect)}` : ""
    }`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>이벤트에 참여하기</CardTitle>
          <CardDescription>Google 계정으로 빠르게 시작하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGoogleLogin} disabled={loading} className="w-full">
            {loading ? "이동 중..." : "Google로 계속하기"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

설명:
- 이메일+비밀번호 양식은 제거 (v2.0은 OAuth 우선, 학습 단순화).
- `searchParams.redirect` → OAuth callback이 redirect param 보존.
- v1.0 starter kit의 다른 auth 페이지(sign-up, forgot-password 등)는 그대로 유지하되 메인 흐름에서 사용 안 됨.

### Step 4: `app/auth/callback/route.ts` — v2.0 콜백 검증

기존 `app/auth/callback/route.ts` 파일을 확인:

```bash
cat app/auth/callback/route.ts
```

v1.0 starter kit이 이미 OAuth callback 처리. 0001 마이그레이션의 `handle_new_user` 트리거가 자동으로 `public.users` upsert → callback 자체는 변경 불필요. 다만 `next` query param (redirect 후속)을 활용하도록 정정:

```ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error?reason=oauth_callback_failed`);
}
```

만약 v1.0 콜백이 이미 위 패턴이면 그대로 사용.

### Step 5: `app/admin/login/page.tsx` — 실 Auth 연결

Phase 2 dummy 폼을 실제 admin OAuth로 교체:

```tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/admin`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>관리자 로그인</CardTitle>
          <CardDescription>관리자 권한 계정만 접근 가능합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reason === "not_admin" ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <p className="text-destructive">관리자 권한이 없습니다. 다른 계정으로 시도하거나 관리자에게 문의하세요.</p>
            </div>
          ) : null}
          <Button onClick={handleGoogleLogin} disabled={loading} className="w-full">
            {loading ? "이동 중..." : "Google로 관리자 로그인"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

설명:
- `?reason=not_admin` 표시 — `requireAdmin()`이 redirect 시 메시지 노출.
- callback redirect: `?next=/admin` → 로그인 후 admin 대시보드.

### Step 6: typecheck + lint + build

```bash
npx tsc --noEmit
npm run lint
npm run build 2>&1 | tail -30
```

Expected: 0 error. admin 라우트 5개는 (authed) route group으로 이동했지만 URL은 동일 (`/admin`, `/admin/events` 등).

### Step 7: visual sanity (Playwright MCP, dev server 가능 시)

- 비로그인 `/my-events` 접근 → `/auth/login?redirect=/my-events` redirect
- 비로그인 `/admin` 접근 → `/admin/login?redirect=/admin` redirect
- 비로그인 `/invite/dummy-invite-001` 접근 → 200 OK (invite는 whitelist)
- 로그인 후 `/admin` 접근 (admin 권한 없으면) → `/admin/login?reason=not_admin` redirect

> 본 visual sanity는 사용자 가입 후 + 0007 admin 부여 후 진행. Task 1 Step 9의 0007 마이그레이션이 사용자 가입 전이면 admin notice 출력 → 사용자 가입 후 0007 재실행.

### Step 8: commit

```bash
git add proxy.ts lib/supabase/proxy.ts app/auth/login/page.tsx app/auth/callback/route.ts app/admin/
git commit -m "$(cat <<'EOF'
feat(v2): Phase 3 Task 008 Google OAuth + admin guard + proxy whitelist

신규/수정:
- lib/supabase/proxy.ts: whitelist 확장 (auth/* + /admin/login + /invite/*)
  + 비로그인 redirect (admin → /admin/login, 그 외 → /auth/login)
- app/auth/login/page.tsx: Google OAuth 단일 흐름, v2.0 도메인 카피
- app/auth/callback/route.ts: next query param 보존 (로그인 후 redirect)
- app/admin/(authed)/ route group 도입: layout.tsx 첫 줄에서 requireAdmin()
- app/admin/login/page.tsx: Google OAuth + reason=not_admin 메시지

route group 이전:
- app/admin/page.tsx → app/admin/(authed)/page.tsx
- app/admin/events·users·analytics → app/admin/(authed)/...
- app/admin/login만 layout 외부 유지 (무한 redirect 회피)

Plan: docs/superpowers/plans/2026-05-25-event-platform-v2-phase3.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Event CRUD Server Action + Storage upload + invite_code (예제 Task 009)

**Files:**
- Create: `lib/actions/events.ts` (createEvent · updateEvent · deleteEvent)
- Create: `lib/storage/event-covers.ts` (uploadEventCover · deleteEventCover · getPublicUrl)
- Modify: `components/events/event-form.tsx` (Phase 2.1 TODO 해소 — Server Action + kstDateTimeLocalToIso + 커버 이미지 input)

### Step 1: `lib/storage/event-covers.ts`

Create:

```ts
import { createClient } from "@/lib/supabase/server";

const BUCKET = "event-covers";

/** 커버 이미지 업로드 (server-side, Server Action 내부에서 호출). 반환: public URL. */
export async function uploadEventCover(eventId: string, file: File): Promise<string> {
  const supabase = await createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `events/${eventId}/cover.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteEventCover(eventId: string): Promise<void> {
  const supabase = await createClient();
  // 가능한 확장자 시도 (실제 구현은 list → 일치 파일 삭제가 robust)
  const { data: list } = await supabase.storage.from(BUCKET).list(`events/${eventId}`);
  if (!list?.length) return;
  const paths = list.map((f) => `events/${eventId}/${f.name}`);
  await supabase.storage.from(BUCKET).remove(paths);
}
```

설명:
- file extension 보존 — DB에는 URL만 저장.
- `upsert: true` — 같은 이벤트 cover 교체 시 덮어쓰기.
- delete는 list → remove 패턴 (확장자 추측 회피).

### Step 2: `lib/actions/events.ts`

Create:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { uploadEventCover, deleteEventCover } from "@/lib/storage/event-covers";
import { kstDateTimeLocalToIso } from "@/lib/datetime";
import { makeEventFormSchema } from "@/components/events/event-form-schema";

// Server Action 입력 schema (form schema 재사용 + 추가)
const createSchema = makeEventFormSchema({ enforceFutureDate: true });
const updateSchema = makeEventFormSchema({ enforceFutureDate: false });

function generateInviteCode(): string {
  return randomBytes(32).toString("base64url");
}

export async function createEvent(formData: FormData): Promise<void> {
  const raw = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    eventDate: formData.get("eventDate") as string,
    location: formData.get("location") as string,
  };
  const cover = formData.get("cover") as File | null;

  const parsed = createSchema.parse(raw);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  // invite_code 재시도 (max 3회)
  let inviteCode = "";
  let inserted: { id: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    inviteCode = generateInviteCode();
    const eventDateIso = kstDateTimeLocalToIso(parsed.eventDate);
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
    if (error?.code !== "23505") {
      throw error;
    }
  }
  if (!inserted) throw new Error("invite_code 생성 3회 실패");

  if (cover && cover.size > 0) {
    const url = await uploadEventCover(inserted.id, cover);
    await supabase.from("v2_events").update({ cover_image_url: url }).eq("id", inserted.id);
  }

  revalidatePath("/");
  revalidatePath("/my-events");
  redirect(`/events/${inserted.id}`);
}

export async function updateEvent(eventId: string, formData: FormData): Promise<void> {
  const raw = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    eventDate: formData.get("eventDate") as string,
    location: formData.get("location") as string,
  };
  const cover = formData.get("cover") as File | null;

  const parsed = updateSchema.parse(raw);

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
    await supabase.from("v2_events").update({ cover_image_url: url }).eq("id", eventId);
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/my-events");
  redirect(`/events/${eventId}`);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const supabase = await createClient();
  await deleteEventCover(eventId).catch(() => {});
  const { error } = await supabase.from("v2_events").delete().eq("id", eventId);
  if (error) throw error;

  revalidatePath("/my-events");
  revalidatePath("/");
}
```

설명:
- `"use server"` 모듈 디렉티브 — 모든 export가 Server Action.
- `kstDateTimeLocalToIso` 사용 — Phase 2.1 TODO 해소.
- Zod schema 재사용 — client form과 동일 (Task 2의 schema factory).
- `revalidatePath` — Next.js 16 cache 무효화. Cache Components와 호환.
- RLS가 owner-only update/delete 보장하므로 server에서 추가 권한 체크 불필요.

### Step 3: `components/events/event-form.tsx` 정정 (Server Action 사용)

기존 onSubmit을 Server Action 호출로 교체. `<form action={createEvent}>` 패턴 사용:

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { makeEventFormSchema, type EventFormValues } from "./event-form-schema";
import { createEvent, updateEvent } from "@/lib/actions/events";

type Props = {
  mode: "create" | "edit";
  defaultValues?: Partial<EventFormValues>;
  eventId?: string;
};

export function EventForm({ mode, defaultValues, eventId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const schema = makeEventFormSchema({ enforceFutureDate: mode === "create" });
  const form = useForm<EventFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      eventDate: defaultValues?.eventDate ?? "",
      location: defaultValues?.location ?? "",
    },
  });

  function onSubmit(values: EventFormValues) {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("title", values.title);
        formData.set("description", values.description ?? "");
        formData.set("eventDate", values.eventDate);
        formData.set("location", values.location);
        const fileInput = document.getElementById("event-cover-input") as HTMLInputElement | null;
        if (fileInput?.files?.[0]) {
          formData.set("cover", fileInput.files[0]);
        }
        if (mode === "create") {
          await createEvent(formData);
        } else if (eventId) {
          await updateEvent(eventId, formData);
        }
        // redirect는 Server Action 내부에서 처리
      } catch (e) {
        const message = e instanceof Error ? e.message : "저장 실패";
        toast.error(message);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* ... (Phase 2 FormField 4개 그대로 — title, description, eventDate, location) ... */}

        {/* 추가: 커버 이미지 input (Phase 3 신규) */}
        <FormItem>
          <FormLabel>커버 이미지 (선택)</FormLabel>
          <FormControl>
            <Input id="event-cover-input" type="file" accept="image/*" />
          </FormControl>
          <FormDescription>jpg·png·webp 최대 2MB 권장</FormDescription>
        </FormItem>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? "저장 중..." : mode === "create" ? "이벤트 만들기" : "수정 저장"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

설명:
- `useTransition` — Server Action pending state.
- `FormData` 수동 구성 — RHF의 `getValues()` + 파일 input 결합.
- 커버 이미지 input은 RHF 외부 (`document.getElementById`)에서 접근 — uncontrolled file input.
- Server Action 내부에서 redirect 처리 → 클라이언트 router 호출 불필요.

> **간략화 주의**: 위 코드는 Phase 2 EventForm의 FormField 4개를 생략 `/* ... */`. 실제 구현 시 Phase 2 코드를 그대로 옮기고 onSubmit·커버 input·버튼 disabled state만 변경.

### Step 4: typecheck + lint + build

```bash
npx tsc --noEmit
npm run lint
npm run build 2>&1 | tail -30
```

Expected: 0 error, 빌드 성공.

### Step 5: 통합 동작 검증 (사용자 web UI 또는 Playwright MCP)

- 로그인 후 `/events/new` → 폼 입력 → "이벤트 만들기" 클릭
- Expected: Server Action 호출 → DB INSERT → invite_code 생성 → 커버 업로드(있으면) → `/events/{id}` redirect
- 생성된 이벤트 `/events/{id}/edit` → 수정 → 저장
- Expected: DB UPDATE → redirect

### Step 6: commit

```bash
git add lib/actions/events.ts lib/storage/event-covers.ts components/events/event-form.tsx
git commit -m "$(cat <<'EOF'
feat(v2): Phase 3 Task 009 Event CRUD Server Action + Storage 커버 업로드

신규:
- lib/actions/events.ts: createEvent · updateEvent · deleteEvent
  ("use server", Zod schema 재사용, kstDateTimeLocalToIso 호출 —
  Phase 2.1 TODO 해소, invite_code 충돌 시 3회 재시도, RLS owner-only
  강제, revalidatePath + redirect)
- lib/storage/event-covers.ts: uploadEventCover · deleteEventCover
  (event-covers 버킷, upsert:true, list→remove 패턴)

수정:
- components/events/event-form.tsx: onSubmit을 useTransition +
  Server Action으로 교체. 커버 이미지 input 추가 (uncontrolled file).
  Phase 2.1 TODO(kstDateTimeLocalToIso) 해소.

Plan: docs/superpowers/plans/2026-05-25-event-platform-v2-phase3.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 참여자 관리 + Realtime 참여자 수 + my-events 실데이터 (예제 Task 010)

**Files:**
- Create: `lib/actions/participants.ts` (joinEvent · leaveEvent)
- Create: `components/events/event-participants-count.tsx` (NEW — "use client", Realtime subscriber)
- Modify: `components/invite/invite-preview.tsx` (handleJoin → joinEvent Server Action)
- Modify: `components/events/event-detail-header.tsx` (participantCount → client component 분리)

### Step 1: `lib/actions/participants.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function joinEvent(eventId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=${encodeURIComponent(`/events/${eventId}`)}`);

  const { error } = await supabase.from("v2_event_participants").insert({
    event_id: eventId,
    user_id: user.id,
  });
  if (error && error.code !== "23505") throw error; // 중복은 silent

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/my-events");
  redirect(`/events/${eventId}`);
}

export async function leaveEvent(eventId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("v2_event_participants")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id);
  if (error) throw error;

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/my-events");
}
```

### Step 2: `components/events/event-participants-count.tsx` (NEW)

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users } from "lucide-react";

export function EventParticipantsCount({ eventId, initialCount }: { eventId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event:${eventId}:participants`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "v2_event_participants", filter: `event_id=eq.${eventId}` }, () => setCount((c) => c + 1))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "v2_event_participants", filter: `event_id=eq.${eventId}` }, () => setCount((c) => Math.max(0, c - 1)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  return (
    <p className="flex items-center gap-2">
      <Users className="h-4 w-4" />
      참여자 {count}명
    </p>
  );
}
```

### Step 3: `components/events/event-detail-header.tsx`의 "참여자 N명" line을 `<EventParticipantsCount>` client component로 교체

기존 inline `<p>...참여자 {participantCount}명</p>` → `<EventParticipantsCount eventId={event.id} initialCount={participantCount} />`. 나머지 JSX는 그대로.

### Step 4: `components/invite/invite-preview.tsx` 정정 (Server Action)

```tsx
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { formatKstDateLong } from "@/lib/datetime";
import { MapPin, Calendar as CalendarIcon } from "lucide-react";
import { joinEvent } from "@/lib/actions/participants";
import type { Event } from "@/types/event";

export function InvitePreview({ event }: { event: Event }) {
  const [isPending, startTransition] = useTransition();

  function handleJoin() {
    startTransition(async () => {
      try {
        await joinEvent(event.id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "참여 실패");
      }
    });
  }

  const canJoin = event.status === "upcoming" || event.status === "ongoing";

  return (
    <div className="mx-auto w-full max-w-md space-y-5 rounded-lg border p-6">
      <div className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">이벤트 초대</p>
        <h1 className="text-xl font-bold leading-tight">{event.title}</h1>
        <EventStatusBadge status={event.status} />
      </div>
      <div className="space-y-1.5 text-sm text-muted-foreground">
        <p className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" />{formatKstDateLong(event.eventDate)}</p>
        <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{event.location}</p>
      </div>
      {event.description ? <p className="text-sm leading-relaxed text-foreground/90">{event.description}</p> : null}
      <Button className="w-full" onClick={handleJoin} disabled={!canJoin || isPending}>
        {isPending ? "참여 중..." : canJoin ? "참여하기" : "참여 불가 (종료된 이벤트)"}
      </Button>
    </div>
  );
}
```

### Step 5: typecheck + lint + build → commit

```bash
npx tsc --noEmit && npm run lint && npm run build 2>&1 | tail -20
git add lib/actions/participants.ts components/events/event-participants-count.tsx components/events/event-detail-header.tsx components/invite/invite-preview.tsx
git commit -m "feat(v2): Phase 3 Task 010 참여자 관리 + Realtime + invite Server Action

joinEvent/leaveEvent + EventParticipantsCount postgres_changes 채널 +
InvitePreview handleJoin Server Action 전환.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Admin API (검색/필터/삭제 + 통계 + 페이지네이션) (예제 Task 011)

**Files:**
- Create: `lib/actions/admin-events.ts` (adminDeleteEvent)
- Create: `lib/actions/admin-users.ts` (adminDeleteUser)
- Modify: `components/admin/admin-events-table.tsx` (rowActions onConfirm)
- Modify: `components/admin/admin-users-table.tsx` (rowActions onConfirm)
- Modify: `app/admin/(authed)/page.tsx` (server fetch metric + 최근 이벤트)
- Modify: `app/admin/(authed)/analytics/page.tsx` (server fetch buildTrend/buildStatusSlices)

### Step 1: `lib/actions/admin-events.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { deleteEventCover } from "@/lib/storage/event-covers";

export async function adminDeleteEvent({ eventId, reason }: { eventId: string; reason: string }): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  console.log(`[admin] delete event ${eventId}, reason: ${reason || "(none)"}`);
  await deleteEventCover(eventId).catch(() => {});
  const { error } = await supabase.from("v2_events").delete().eq("id", eventId);
  if (error) throw error;
  revalidatePath("/admin/events");
  revalidatePath("/admin");
}
```

### Step 2: `lib/actions/admin-users.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function adminDeleteUser({ userId, reason }: { userId: string; reason: string }): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  console.log(`[admin] delete user ${userId}, reason: ${reason || "(none)"}`);
  const { error } = await supabase.from("v2_users").delete().eq("id", userId);
  if (error) throw error;
  revalidatePath("/admin/users");
}
```

설명:
- 첫 줄 `requireAdmin()` — 3중 가드 (proxy + layout + Server Action 재검증).
- 감사 로그는 학습 단계 console.log. production은 audit_logs 테이블 (v2.x).
- public.users 삭제 → cascade로 events·participants 정리. auth.users 삭제는 service_role 별도 (학습 단계 미구현).

### Step 3: Table wrapper의 onConfirm 정정

`components/admin/admin-events-table.tsx`의 rowActions:

```tsx
import { adminDeleteEvent } from "@/lib/actions/admin-events";

// rowActions:
rowActions={(e) => (
  <AdminDeleteConfirm
    itemLabel={e.title}
    resourceType="이벤트"
    onConfirm={async (reason) => {
      await adminDeleteEvent({ eventId: e.id, reason });
    }}
  />
)}
```

`admin-users-table.tsx` 동일 패턴 — `adminDeleteUser({ userId: u.id, reason })`.

### Step 4: `app/admin/(authed)/page.tsx` server fetch

```tsx
import Link from "next/link";
import { Calendar, Users as UsersIcon, CalendarCheck, CalendarX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import { getRecentEvents } from "@/lib/queries/events";

async function getDashboardMetrics() {
  const supabase = await createClient();
  const [total, upcoming, completed, users] = await Promise.all([
    supabase.from("v2_events").select("*", { count: "exact", head: true }),
    supabase.from("v2_events_with_status").select("*", { count: "exact", head: true }).eq("status", "upcoming"),
    supabase.from("v2_events_with_status").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("v2_users").select("*", { count: "exact", head: true }),
  ]);
  return {
    total: total.count ?? 0,
    upcoming: upcoming.count ?? 0,
    completed: completed.count ?? 0,
    users: users.count ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const [metrics, recent] = await Promise.all([getDashboardMetrics(), getRecentEvents(5)]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">플랫폼 전체 지표와 최근 활동을 한눈에 확인하세요.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="전체 이벤트" value={metrics.total} icon={Calendar} />
        <AdminStatCard label="예정 이벤트" value={metrics.upcoming} icon={CalendarCheck} hint="upcoming" />
        <AdminStatCard label="종료 이벤트" value={metrics.completed} icon={CalendarX} hint="completed" />
        <AdminStatCard label="가입자" value={metrics.users} icon={UsersIcon} />
      </div>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">최근 이벤트</h2>
          <Button asChild variant="ghost" size="sm"><Link href="/admin/events">전체 보기</Link></Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      </section>
    </div>
  );
}
```

### Step 5: `app/admin/(authed)/analytics/page.tsx` server fetch

```tsx
import { createClient } from "@/lib/supabase/server";
import { EventTrendChart, type TrendPoint } from "@/components/charts/event-trend-chart";
import { StatusPieChart, type StatusSlice } from "@/components/charts/status-pie-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function buildTrend(): Promise<TrendPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("v2_events").select("created_at");
  const counts = new Map<string, number>();
  for (const e of data ?? []) {
    const ym = e.created_at.slice(0, 7);
    counts.set(ym, (counts.get(ym) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));
}

async function buildStatusSlices(): Promise<StatusSlice[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("v2_events_with_status").select("status");
  const counts = { upcoming: 0, ongoing: 0, completed: 0 };
  for (const e of data ?? []) counts[e.status as keyof typeof counts]++;
  return [
    { status: "upcoming", count: counts.upcoming },
    { status: "ongoing", count: counts.ongoing },
    { status: "completed", count: counts.completed },
  ];
}

export default async function AdminAnalyticsPage() {
  const [trend, slices] = await Promise.all([buildTrend(), buildStatusSlices()]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">통계 분석</h1>
        <p className="mt-1 text-sm text-muted-foreground">이벤트 추세와 상태 분포를 확인하세요.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>월별 이벤트 생성 수</CardTitle></CardHeader>
          <CardContent><EventTrendChart data={trend} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>이벤트 상태 분포</CardTitle></CardHeader>
          <CardContent><StatusPieChart data={slices} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### Step 6: typecheck + lint + build → commit

```bash
npx tsc --noEmit && npm run lint && npm run build 2>&1 | tail -20
git add lib/actions/admin-events.ts lib/actions/admin-users.ts components/admin/admin-events-table.tsx components/admin/admin-users-table.tsx app/admin/
git commit -m "feat(v2): Phase 3 Task 011 admin Server Action + 대시보드/통계 server fetch

adminDeleteEvent/adminDeleteUser (3중 가드 requireAdmin) + 대시보드
4 metric Promise.all + analytics buildTrend/buildStatusSlices server.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Playwright MCP 통합 테스트 (예제 Task 012)

> 주최자/참여자/관리자 플로우 + 에러 케이스. 코드 변경 없음, 시나리오 실행 + 결과 기록.

**Files:**
- Create: `docs/v2-phase3/playwright-mcp-host-flow.md`
- Create: `docs/v2-phase3/playwright-mcp-participant-flow.md`
- Create: `docs/v2-phase3/playwright-mcp-admin-flow.md`
- Create: `docs/v2-phase3/playwright-mcp-error-cases.md`

### Step 1: 사전 조건 확인

- dev server 가동 (`npm run dev`, port 3000)
- 사용자 5명 Google OAuth 가입 완료 (Task 1 Step 7 seed 후 또는 dev에서 직접 가입)
- 첫 admin 부여 완료 (Task 1 0007 마이그레이션 — inmingoon@gmail.com)
- 0006 seed event 데이터 적용 완료 (또는 host1 계정으로 수동 이벤트 3개 생성)

### Step 2: 주최자 플로우 시나리오 — `docs/v2-phase3/playwright-mcp-host-flow.md`

Create:

```markdown
# Phase 3 Task 012 — 주최자 플로우 Playwright MCP 시나리오

## 시나리오 1: 이벤트 생성

1. `mcp__playwright__browser_navigate http://localhost:3000/auth/login`
2. `mcp__playwright__browser_click "Google로 계속하기"` → host1 계정 선택
3. callback redirect 후 `/` 도착
4. `mcp__playwright__browser_navigate http://localhost:3000/events/new`
5. `mcp__playwright__browser_fill_form` 4 input 채우기 (title·description·eventDate·location)
6. `mcp__playwright__browser_click "이벤트 만들기"`
7. Expected: `/events/{새 UUID}` redirect, EventDetailHeader에 입력값 + KST 일시 표시

PASS 기준:
- DB에 events row INSERT (id, created_by = host1, invite_code 32B base64url)
- redirect URL이 `/events/{uuid}` 패턴
- 이벤트 상세 페이지에 입력값 그대로 표시

## 시나리오 2: 커버 이미지 업로드

1. `/events/new`에서 4 input + 커버 이미지(jpg) 첨부
2. "이벤트 만들기" 클릭
3. Expected: events.cover_image_url에 public URL 저장, EventDetailHeader가 이미지 표시

## 시나리오 3: 이벤트 수정

1. `/events/{id}/edit` 진입 (host1 계정)
2. title 변경 + 저장
3. Expected: DB UPDATE, `/events/{id}` redirect, 변경된 title 표시

## 시나리오 4: 초대 링크 복사

1. `/events/{id}` 진입 (host1 계정)
2. "관리" 탭 클릭 → "링크 복사" 버튼 클릭
3. Expected: clipboard에 `${origin}/invite/{invite_code}` 저장, toast 표시

## 결과 (실행 후 기록)

| 시나리오 | 결과 | 비고 |
| --- | --- | --- |
| 1. 이벤트 생성 | TBD | |
| 2. 커버 업로드 | TBD | |
| 3. 이벤트 수정 | TBD | |
| 4. 초대 링크 복사 | TBD | clipboard 권한 거부 시 코드 검증으로 PASS |
```

### Step 3: 참여자 플로우 — `docs/v2-phase3/playwright-mcp-participant-flow.md`

Create:

```markdown
# Phase 3 Task 012 — 참여자 플로우 Playwright MCP 시나리오

## 시나리오 1: 초대 링크 가입

1. 시크릿 창에서 host1이 만든 이벤트의 invite_code 확인 (DB events 테이블)
2. `mcp__playwright__browser_navigate http://localhost:3000/invite/{code}` (비로그인)
3. Expected: InvitePreview 카드 + "참여하기" 버튼
4. "참여하기" 클릭 → `/auth/login?redirect=/events/{id}` redirect
5. participant1 계정 Google OAuth 로그인
6. callback 후 `/events/{id}` 도착 → joinEvent Server Action 호출
7. Expected: DB event_participants INSERT (event_id, user_id, joined_at)

## 시나리오 2: 참여자 목록 노출

1. participant1로 `/events/{id}` 진입
2. Expected: Tabs 없음 (호스트 아님), EventParticipantsList에 본인 + 다른 참여자 Avatar 표시

## 시나리오 3: my-events "참여한" 탭

1. participant1로 `/my-events` 진입
2. Expected: "주최한 (0)" / "참여한 (1+)" 탭. 참여한 탭에 가입한 이벤트 EventCard 표시

## 시나리오 4: 중복 참여 무해

1. participant1로 이미 가입한 이벤트의 invite/{code} 다시 방문
2. "참여하기" 클릭
3. Expected: PRIMARY KEY UNIQUE 위반은 silent → `/events/{id}` redirect, 카운트 변화 없음

## 결과 (실행 후 기록)

| 시나리오 | 결과 | 비고 |
| --- | --- | --- |
| 1. 초대 가입 | TBD | |
| 2. 참여자 목록 | TBD | |
| 3. my-events 참여한 탭 | TBD | |
| 4. 중복 참여 silent | TBD | |
```

### Step 4: 관리자 플로우 — `docs/v2-phase3/playwright-mcp-admin-flow.md`

Create:

```markdown
# Phase 3 Task 012 — 관리자 플로우 Playwright MCP 시나리오

## 시나리오 1: admin 로그인 + 대시보드

1. `mcp__playwright__browser_navigate http://localhost:3000/admin`
2. Expected: `/admin/login` redirect
3. "Google로 관리자 로그인" 클릭 → admin@example.com (또는 inmingoon@gmail.com)
4. callback 후 `/admin` 도착
5. Expected: StatCard 4개 (전체 이벤트 / 예정 / 종료 / 가입자) 모두 실데이터 + 최근 이벤트 5건

## 시나리오 2: 이벤트 관리 + 검색

1. `/admin/events` 진입
2. Expected: AdminDataTable에 모든 이벤트 row 표시
3. 검색창에 "Cache" 입력 → 200ms debounce 후 필터링
4. Expected: 제목/장소에 "Cache" 포함된 row만 표시

## 시나리오 3: 이벤트 삭제

1. `/admin/events` 한 row의 휴지통 클릭 → Dialog 노출
2. 사유 입력 → "삭제" 버튼
3. Expected: DB events row DELETE (cascade: event_participants도), storage cover 파일 제거, table revalidate

## 시나리오 4: 비-admin 접근 거부

1. participant1 계정으로 `/admin` 직접 진입
2. Expected: `requireAdmin()`이 `/admin/login?reason=not_admin` redirect, "관리자 권한이 없습니다" 메시지

## 시나리오 5: 통계 차트

1. `/admin/analytics` 진입
2. Expected: LineChart (월별 이벤트 수) + PieChart (status 분포). 다크모드 토글 시 색상 변경.

## 결과 (실행 후 기록)

| 시나리오 | 결과 | 비고 |
| --- | --- | --- |
| 1. admin 로그인 | TBD | |
| 2. 이벤트 검색 | TBD | |
| 3. 이벤트 삭제 | TBD | |
| 4. 비-admin 차단 | TBD | |
| 5. 통계 차트 | TBD | |
```

### Step 5: 에러 케이스 — `docs/v2-phase3/playwright-mcp-error-cases.md`

Create:

```markdown
# Phase 3 Task 012 — 에러 케이스 Playwright MCP 시나리오

## 시나리오 1: 존재하지 않는 이벤트 ID

1. `/events/nonexistent-uuid` 진입
2. Expected: notFound() → Next.js 기본 404 페이지

## 시나리오 2: 잘못된 invite_code

1. `/invite/wrong-code` 진입
2. Expected: notFound()

## 시나리오 3: EventForm validation

1. `/events/new`에서 title 비우고 제출
2. Expected: "제목을 입력하세요" 에러
3. eventDate에 과거 일시 입력 + 제출
4. Expected: "이벤트 일시는 미래여야 합니다" 에러

## 시나리오 4: 비로그인 사용자 protected 라우트

1. 시크릿 창에서 `/my-events` 진입
2. Expected: `/auth/login?redirect=/my-events` redirect

## 시나리오 5: RLS — 다른 사용자 이벤트 수정 시도

1. participant1로 host1 이벤트의 `/events/{id}/edit` 진입
2. 폼 수정 후 제출
3. Expected: Server Action에서 RLS UPDATE 거부 (owner 아님). toast.error로 안내.

## 시나리오 6: Storage RLS — 다른 사용자 cover 업로드 시도

1. participant1로 host1 이벤트의 cover 이미지 업로드 시도 (개발자 도구 또는 cURL)
2. Expected: Storage RLS INSERT 거부 (path 매칭 실패)

## 결과 (실행 후 기록)

| 시나리오 | 결과 | 비고 |
| --- | --- | --- |
| 1. 404 이벤트 | TBD | |
| 2. 404 invite | TBD | |
| 3. Zod validation | TBD | |
| 4. 비로그인 redirect | TBD | |
| 5. RLS UPDATE 거부 | TBD | |
| 6. Storage RLS 거부 | TBD | |
```

### Step 6: 시나리오 실행 후 결과 채우기 + commit

```bash
# Playwright MCP로 각 시나리오 수행 (controller가 또는 사용자가)
# 결과를 위 4 문서의 "결과" 표에 채워 넣고:

git add docs/v2-phase3/
git commit -m "$(cat <<'EOF'
docs(v2): Phase 3 Task 012 Playwright MCP 통합 테스트 시나리오 + 결과

신규 (docs/v2-phase3/):
- playwright-mcp-host-flow.md: 4 시나리오 (생성·커버 업로드·수정·복사)
- playwright-mcp-participant-flow.md: 4 시나리오 (초대 가입·목록·my-events·중복)
- playwright-mcp-admin-flow.md: 5 시나리오 (로그인·검색·삭제·차단·차트)
- playwright-mcp-error-cases.md: 6 시나리오 (404·validation·RLS·Storage)

Phase 3 Task 007~011 산출물 통합 검증. 결과 표는 실행 후 채워짐.

Plan: docs/superpowers/plans/2026-05-25-event-platform-v2-phase3.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 회귀 검증 + push + ROADMAP-v2 갱신

> Phase 3 마지막 단계. 코드 변경 없음.

### Step 1: 전체 build + lint + typecheck

```bash
npx tsc --noEmit
npm run lint
npm run build 2>&1 | tail -50
```

Expected:
- 0 error
- 0 warning
- 빌드 성공
- 25 routes 유지 (auth callback·confirm은 dynamic ƒ, 나머지는 static ○ 또는 partial ◐)

### Step 2: 통합 시나리오 결과 확인

Task 7의 4 문서 모두 결과 표가 PASS로 채워졌는지 확인. FAIL이 있으면 해당 task로 되돌아가 fix.

### Step 3: working tree + commit history 확인

```bash
git status --short
git log --oneline be4db91..HEAD
```

Expected:
- working tree clean (untracked만 OK)
- Phase 3 8 task commits 누적 (Task 7 시나리오 commit 포함, fix round는 별도)

### Step 4: feat/event-platform-v2 push

```bash
git push origin feat/event-platform-v2
```

### Step 5: `docs/ROADMAP-v2.md` Phase 3 ✅ 표기

기존 placeholder:
```
- **Phase 3: 데이터베이스 + 핵심 기능** (Task 007~012, Playwright MCP E2E 필수)
  - 스키마 + RLS + Supabase Storage (event-covers 버킷)
  - Google OAuth + admin 권한 미들웨어
  - 이벤트 CRUD + 초대 시스템
  - 참여자 관리 + Realtime
  - 관리자 백엔드 API
  - 핵심 기능 통합 테스트
```

다음으로 교체:
```
- **Phase 3: 데이터베이스 + 핵심 기능** ✅ 완료 (2026-MM-DD)
  - 기존 v1.0 Supabase project 재사용 + supabase/migrations/ 통합 (v2_ prefix 7개)
  - 핵심 테이블 4개 (v2_users·v2_events·v2_event_participants·v2_admin_users) + v2_is_admin RLS 헬퍼
  - v2_events_with_status view (status 동적 계산, cron 의존 없음)
  - v2_get_event_by_invite_code SECURITY DEFINER (anon invite 페이지)
  - event-covers Storage 버킷 + owner-only RLS
  - Google OAuth (v1.0 재사용) + v2_handle_new_user 트리거 (auth.users → v2_users upsert, v1.0 profiles 트리거와 병행)
  - admin 3중 가드 (proxy whitelist + (authed) layout requireAdmin + Server Action 재검증)
  - Server Action: createEvent·updateEvent·deleteEvent·joinEvent·leaveEvent·
    adminDeleteEvent·adminDeleteUser·updateProfile (모두 "use server")
  - Realtime EventParticipantsCount (postgres_changes 채널)
  - kstDateTimeLocalToIso 활용 (Phase 2.1 TODO 해소 — 9시간 shift bug 사전 방지)
  - lib/dummy 폐기 → lib/queries 1:1 시그니처 보존 교체
  - Playwright MCP E2E 19 시나리오 (주최자 4·참여자 4·관리자 5·에러 6)
  - Plan: `docs/superpowers/plans/2026-05-25-event-platform-v2-phase3.md`
```

Edit `docs/ROADMAP-v2.md`로 정정.

### Step 6: ROADMAP commit + push

```bash
git add docs/ROADMAP-v2.md
git commit -m "$(cat <<'EOF'
docs(v2): Phase 3 ✅ 완료 표기 (DB + 핵심 기능 — Task 007~012)

Plan 8 task 모두 PASS:
- Task 1: DB 스키마 + RLS + Storage 마이그레이션 (7 파일)
- Task 2: types regenerate + lib/queries + lib/auth (dummy 폐기)
- Task 3: Google OAuth + admin guard + proxy whitelist + (authed) route group
- Task 4: Event CRUD Server Action + Storage 커버 + invite_code 재시도
- Task 5: 참여자 Server Action + Realtime postgres_changes
- Task 6: admin Server Action + 대시보드/통계 server fetch
- Task 7: Playwright MCP 19 시나리오
- Task 8: 회귀 + push + ROADMAP

회귀:
- typecheck 0 errors
- lint 0 warnings
- build 25 routes (Cache Components + Server Action)
- Playwright MCP 19/19 PASS (또는 실행 결과 표)

dummy → 실데이터 swap 완료. v2.0은 v1.0과 같은 Supabase project 안에서 v2_ prefix로
격리 + production-grade RLS + Storage + Realtime + admin 3중 가드 적용.

다음 단계: Phase 3.5 Vercel 배포 (별도 plan).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)" && git push
```

---

## 회귀 검증 게이트 (Phase 3 완료 기준)

- [x] (Task 1) 7 마이그레이션 SQL Editor 또는 CLI 적용 + RLS 정책 검증
- [x] (Task 2) lib/queries 3 파일 + lib/auth 2 파일 + dummy 폐기 + 12 페이지 import 교체
- [x] (Task 3) proxy whitelist + (authed) route group + Google OAuth 로그인
- [x] (Task 4) Event CRUD Server Action + Storage 커버 업로드 + invite_code UNIQUE
- [x] (Task 5) joinEvent Server Action + Realtime EventParticipantsCount
- [x] (Task 6) admin Server Action 3중 가드 + 대시보드/통계 server fetch
- [x] (Task 7) Playwright MCP 19 시나리오 (host 4 + participant 4 + admin 5 + 에러 6)
- [x] (Task 8) ROADMAP-v2 Phase 3 ✅ 표기 + push

---

## Out of Scope (Phase 3 범위 외)

- Vercel 배포 (Phase 3.5 또는 별도 plan)
- Sentry 에러 모니터링 (v2.x)
- Google Analytics 또는 PostHog 분석 (v2.x)
- Lighthouse 90+ 최적화 / 코드 스플리팅 / `next/image` 전환 (v2.x)
- 무한 스크롤 / 가상화 리스트 / 서버 페이지네이션 (v2.x — 현재는 client memoization)
- robots.txt / sitemap.xml / Open Graph 동적 이미지 (v2.x)
- 카카오톡 알림톡 (사업자 등록 필요)
- 이벤트 정원 / 대기열 / 결제 (영구 비범위)
- audit_logs 테이블 (현재 console.log) → production 진입 시 추가
- service_role API로 auth.users 삭제 (admin 화면에서는 public.users만 삭제)
- 2FA / MFA (v2.x)
- i18n / 영어 locale (v2.x — 현재 한국어 고정)
- 다크모드 차트 색상 dynamic via CSS variable (Phase 2.1 trade-off로 hex 고정 — v2.x polish)

---

## 리스크 핸드오프

| 관찰 | 즉시 조치 |
| --- | --- |
| Task 1 사전 1 (새 Supabase project 생성) 사용자 작업 누락 | controller가 자동화 불가. plan 진행 중단 + 사용자에게 project URL·anon·service_role key 요청 |
| Task 1 Step 8 (0007 첫 admin 부여) 사용자 가입 전 실행 | DO 블록의 `raise notice`로 알림 출력. 사용자 가입 후 SQL Editor에 다시 붙여넣어 재실행 (idempotent on conflict do nothing) |
| Task 2 Step 2 supabase gen types 실패 (CLI 미설치) | Supabase Dashboard → API Docs → "Generate TypeScript types" 출력을 lib/database.types.ts에 복붙 |
| Task 2 Step 8 import 일괄 교체 누락 | typecheck가 잡음. tsc 0 errors 확인 |
| Task 3 admin/(authed) route group 도입 시 URL 변경 우려 | route group은 URL에 영향 없음 (괄호 안 이름은 URL 비포함). `/admin`·`/admin/events` 등 URL 유지 |
| Task 3 OAuth callback redirect URL 등록 누락 | Google Cloud Console + Supabase Dashboard 모두에 callback URL 등록 필수. 사전 4 단계 확인 |
| Task 4 invite_code UNIQUE 충돌 3회 재시도 실패 | crypto.randomBytes(32) 충돌 확률 무시 가능하지만 발생 시 사용자 보고 + DB 상태 점검 |
| Task 4 Storage upload size 초과 | Supabase 기본 50MB 제한. 클라이언트에서 사전 size check (Form에 안내 메시지). 학습 단계는 그대로 |
| Task 5 Realtime 구독 무료 한도 (200 동시) 초과 | 학습 단계 부담 없음. production 사용자 모집 시 Pro tier 검토 |
| Task 5 EventParticipantsCount cleanup 누락 | `useEffect` return의 `removeChannel` 확인. 누락 시 메모리 누수 |
| Task 6 admin Server Action에서 RLS 우회 시도 | requireAdmin이 3중 가드. 더하여 admin_users 테이블에 정책 없음 = service_role만 INSERT 가능 |
| Task 7 dev server에서 Playwright MCP 클립보드 권한 거부 | 코드 검증 PASS 처리 (Phase 2 패턴) |
| 본 plan 작성 시점에 v2.0 Supabase project 미생성 | 본 plan 실행 직전 사용자가 사전 1·2·4 web UI 작업 완료 필수 |

---

## 참고 링크

- **본 plan**: `docs/superpowers/plans/2026-05-25-event-platform-v2-phase3.md`
- **Spec**: `docs/superpowers/specs/2026-05-24-event-platform-v2-design.md`
- **Phase 1 plan**: `docs/superpowers/plans/2026-05-24-event-platform-v2-phase1.md`
- **Phase 2 plan**: `docs/superpowers/plans/2026-05-24-event-platform-v2-phase2.md`
- **v2.0 ROADMAP**: `docs/ROADMAP-v2.md` (Task 8 Step 5에서 갱신)
- **학습 출처**: https://github.com/gymcoding/nextjs-supabase-app/blob/main/docs/ROADMAP.md (Task 007~012)
- **Supabase RLS 학습**: https://supabase.com/docs/guides/database/postgres/row-level-security
- **Supabase Server Components**: https://supabase.com/docs/guides/auth/server-side/nextjs
- **Next.js Server Action**: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- **Recharts (Phase 2 자산)**: https://recharts.org/en-US/api
- **v1.0 학습 자산** (main): `supabase/migrations/` 7개 마이그레이션 (RLS 헬퍼 패턴 학습)

