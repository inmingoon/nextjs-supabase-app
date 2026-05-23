# 모임 이벤트 관리 MVP — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 정기 운동 모임 MVP의 첫 번째 phase — 데이터 스키마(M1) + 그룹 생성·초대 가입 흐름(M2)을 구현해 "한 사용자가 그룹을 만들고 초대 링크로 다른 사용자를 합류시킬 수 있는" working software를 만든다.

**Architecture:** Supabase로 4개 신규 테이블(`groups`, `group_members`, `events`, `event_participations`) + 1 view + `join_group_by_token` RPC를 한 마이그레이션으로 생성하고, RLS 정책을 DB 레이어에 박아 권한을 강제한다. Next.js 15 App Router의 Server Component + Server Action 패턴으로 그룹 생성 폼과 초대 관문 페이지를 만들고, 클립보드·확인 버튼만 Client Component island로 분리한다.

**Tech Stack:** Next.js 15 + React 19 + Supabase(@supabase/ssr) + Tailwind + shadcn(radix) + TypeScript. Google OAuth는 기존 `feat/profiles-table` 인프라 재사용.

**Spec:** `docs/superpowers/specs/2026-05-23-meetup-mvp-design.md` — Phase 1은 spec의 §6 M1+M2 범위.

---

## File Structure

### 신규 파일

| 경로                                                                            | 책임                                                  |
| ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `supabase/migrations/20260523000000_create_event_tables.sql`                    | 4 테이블 + 인덱스 + RLS + view + RPC + profiles 보강  |
| `lib/tokens.ts`                                                                 | 초대 토큰 생성 유틸 (32-byte URL-safe base64)         |
| `app/groups/new/page.tsx`                                                       | 그룹 생성 폼 페이지 (Server Component, 인증 검증)      |
| `app/groups/new/create-group-form.tsx`                                          | 그룹 생성 폼 (Client Component)                        |
| `app/groups/new/actions.ts`                                                     | Server Action `createGroup`                            |
| `app/groups/[groupId]/layout.tsx`                                               | 그룹 권한 검증 + 그룹 정보 props (멤버만 통과)         |
| `app/groups/[groupId]/page.tsx`                                                 | 그룹 상세 (Phase 1엔 스텁: 이름 + 초대 링크 + 멤버 수) |
| `app/invite/[token]/page.tsx`                                                   | 초대 관문 (4분기: 비로그인/미가입/이미가입/무효)        |
| `app/invite/[token]/join-group-button.tsx`                                      | 가입 확인 버튼 (Client Component)                      |
| `app/invite/[token]/actions.ts`                                                 | Server Action `joinGroupByToken`                       |
| `components/copy-invite-link-button.tsx`                                        | 초대 링크 클립보드 복사 (Client Component, 재사용)     |
| `components/ui/textarea.tsx`                                                    | shadcn Textarea (그룹 description 입력)                |
| `components/ui/sonner.tsx`                                                      | shadcn Toaster 래퍼                                    |

### 수정 파일

| 경로                              | 변경 내용                                                                |
| --------------------------------- | ------------------------------------------------------------------------ |
| `lib/database.types.ts`           | Supabase MCP `generate_typescript_types`로 4 신규 테이블 + view 반영      |
| `app/layout.tsx`                  | `<Toaster />` 마운트 추가 (sonner)                                       |
| `app/page.tsx`                    | 로그인 사용자에게 "내 그룹 목록" + "새 그룹 만들기" 카드 노출            |
| `package.json` (간접, shadcn add) | `@radix-ui/react-toast` 또는 `sonner` 의존성 추가                        |

---

## Task 1 — 이벤트 도메인 마이그레이션 작성

**Files:**
- Create: `supabase/migrations/20260523000000_create_event_tables.sql`

이 task는 한 마이그레이션 파일을 점진적으로 채워간다. 각 step은 같은 파일을 추가 편집하는 형태.

- [ ] **Step 1: 마이그레이션 파일 골격 + 4 테이블 정의**

다음 내용으로 `supabase/migrations/20260523000000_create_event_tables.sql` 생성:

```sql
-- 모임 이벤트 관리 MVP (Phase 1)
-- spec: docs/superpowers/specs/2026-05-23-meetup-mvp-design.md

-- 1) groups: 영속 그룹. 1 그룹 = 1 주최자.
create table public.groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 50),
  description  text check (description is null or char_length(description) <= 500),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  invite_token text not null unique,
  created_at   timestamptz not null default now()
);

comment on table public.groups is '정기 운동 모임 그룹. invite_token으로 초대 가입.';

-- 2) group_members: 그룹 ↔ 사용자 N:M
create table public.group_members (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

comment on table public.group_members is '그룹 멤버십. 그룹 가입 = group_members 행 1개.';

-- 3) events: 회차(occurrence). 매 회차 수동 생성.
create table public.events (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  title      text check (title is null or char_length(title) between 1 and 100),
  starts_at  timestamptz not null,
  location   text not null check (char_length(location) between 1 and 200),
  memo       text not null check (char_length(memo)     between 1 and 1000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

comment on table public.events is '회차(occurrence). starts_at는 KST를 UTC로 저장. 응답 잠금의 기준.';

-- 4) event_participations: 회차별 RSVP. 3-상태.
create table public.event_participations (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  status       text not null check (status in ('going','not_going','pending')),
  responded_at timestamptz not null default now(),
  unique (event_id, user_id)
);

comment on table public.event_participations is 'RSVP. status=going은 출석으로 카운트.';

-- 인덱스 (unique 자동 생성분 제외)
create index events_group_starts_at_idx on public.events (group_id, starts_at desc);
```

- [ ] **Step 2: 같은 파일에 RLS enable + groups 정책 추가**

위 파일 끝에 append:

```sql
-- RLS enable
alter table public.groups               enable row level security;
alter table public.group_members        enable row level security;
alter table public.events               enable row level security;
alter table public.event_participations enable row level security;

-- groups 정책
create policy groups_select_member_or_owner on public.groups
  for select using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.group_members
      where group_id = groups.id and user_id = (select auth.uid())
    )
  );

create policy groups_insert_self_as_owner on public.groups
  for insert with check ( owner_id = (select auth.uid()) );

create policy groups_update_owner on public.groups
  for update using ( owner_id = (select auth.uid()) )
            with check ( owner_id = (select auth.uid()) );

create policy groups_delete_owner on public.groups
  for delete using ( owner_id = (select auth.uid()) );
```

- [ ] **Step 3: 같은 파일에 group_members 정책 추가**

파일 끝에 append:

```sql
-- group_members 정책

-- SECURITY DEFINER 헬퍼: group_members SELECT 정책에서 자기 테이블을 직접 참조하면
-- 무한 재귀(ERROR 42P17)가 발생한다. 헬퍼 함수는 RLS를 우회하여 재귀를 방지.
create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

-- SELECT: 같은 그룹의 멤버끼리 서로 보임 (헬퍼 함수로 재귀 방지)
create policy group_members_select_same_group on public.group_members
  for select using (
    public.is_group_member(group_id, (select auth.uid()))
  );

-- INSERT: 직접 insert 차단. 가입은 join_group_by_token RPC만 허용.
-- (정책 없음 = INSERT 거부)

-- DELETE: 본인 행만 (탈퇴)
create policy group_members_delete_self on public.group_members
  for delete using ( user_id = (select auth.uid()) );
```

- [ ] **Step 4: 같은 파일에 events 정책 추가**

파일 끝에 append:

```sql
-- events 정책
create policy events_select_group_member on public.events
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = events.group_id
        and user_id = (select auth.uid())
    )
  );

create policy events_insert_owner on public.events
  for insert with check (
    exists (
      select 1 from public.groups
      where id = events.group_id
        and owner_id = (select auth.uid())
    )
  );

create policy events_update_owner on public.events
  for update using (
    exists (
      select 1 from public.groups
      where id = events.group_id and owner_id = (select auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.groups
      where id = events.group_id and owner_id = (select auth.uid())
    )
  );

create policy events_delete_owner on public.events
  for delete using (
    exists (
      select 1 from public.groups
      where id = events.group_id and owner_id = (select auth.uid())
    )
  );
```

- [ ] **Step 5: 같은 파일에 event_participations 정책 추가 (응답 잠금 강제)**

파일 끝에 append:

```sql
-- event_participations 정책
-- SELECT: 같은 그룹 멤버 (응답 명단 공개)
create policy ep_select_group_member on public.event_participations
  for select using (
    exists (
      select 1 from public.events e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = event_participations.event_id
        and gm.user_id = (select auth.uid())
    )
  );

-- INSERT: 본인 행 + 회차 시작 전 (잠금)
create policy ep_insert_self_before_lock on public.event_participations
  for insert with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.events
      where id = event_participations.event_id
        and starts_at > now()
    )
  );

-- UPDATE: 본인 행 + 회차 시작 전 (잠금)
create policy ep_update_self_before_lock on public.event_participations
  for update using ( user_id = (select auth.uid()) )
            with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.events
      where id = event_participations.event_id
        and starts_at > now()
    )
  );

-- DELETE: 본인 행 (응답 취소, 잠금 무관)
create policy ep_delete_self on public.event_participations
  for delete using ( user_id = (select auth.uid()) );
```

- [ ] **Step 6: 같은 파일에 누적 출석률 view + 가입 RPC 추가**

파일 끝에 append:

```sql
-- 누적 출석률 view (security_invoker로 호출자의 RLS 상속)
create view public.group_attendance_stats with (security_invoker = true) as
select
  gm.group_id,
  gm.user_id,
  count(*) filter (where ep.status = 'going')   as attended,
  count(*) filter (where e.starts_at < now())   as total_past
from public.group_members gm
left join public.events e
  on e.group_id = gm.group_id
  and e.starts_at < now()
left join public.event_participations ep
  on ep.event_id = e.id
  and ep.user_id = gm.user_id
group by gm.group_id, gm.user_id;

-- 가입 RPC (security definer로 group_members INSERT 정책 우회)
create or replace function public.join_group_by_token(token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select id into v_group_id
  from public.groups
  where invite_token = token;

  if v_group_id is null then
    raise exception 'invalid_invite_token';
  end if;

  if exists (
    select 1 from public.group_members
    where group_id = v_group_id and user_id = auth.uid()
  ) then
    return v_group_id;
  end if;

  insert into public.group_members (group_id, user_id)
  values (v_group_id, auth.uid());

  return v_group_id;
end;
$$;

revoke all on function public.join_group_by_token(text) from public;
grant execute on function public.join_group_by_token(text) to authenticated;
```

- [ ] **Step 7: 같은 파일에 profiles RLS 보강 추가**

파일 끝에 append:

```sql
-- profiles 테이블 RLS 보강: 같은 그룹 멤버끼리 서로의 profile read
-- (기존 profiles_select_own 정책과 OR로 결합)
create policy profiles_select_group_members on public.profiles
  for select using (
    exists (
      select 1
      from public.group_members me
      join public.group_members other
        on me.group_id = other.group_id
      where me.user_id    = (select auth.uid())
        and other.user_id = profiles.id
    )
  );
```

- [ ] **Step 8: 마이그레이션 적용 (Supabase MCP)**

Supabase MCP의 `apply_migration` 도구로 마이그레이션 적용. 도구 호출 시 `name`은 `create_event_tables`, `query`는 위에서 작성한 전체 SQL 파일 내용.

> 운영자가 직접 적용한다면: `supabase db push` (Supabase CLI) 또는 Studio의 SQL Editor에서 파일 내용 실행.

기대: 에러 없이 적용 완료. `list_tables(['public'])`로 4 테이블 + 1 view 확인.

- [ ] **Step 9: TypeScript 타입 재생성**

Supabase MCP의 `generate_typescript_types` 호출 → 출력을 `lib/database.types.ts`에 덮어쓰기.

기대: `Database['public']['Tables']`에 `groups`, `group_members`, `events`, `event_participations` 4개 등장. `Views`에 `group_attendance_stats` 등장. `Functions`에 `join_group_by_token` 등장.

- [ ] **Step 10: 빌드 확인**

Run: `npm run build`

기대: 통과. 새 타입이 코드에 사용되지 않은 시점이라 단순 컴파일.

- [ ] **Step 11: 커밋**

```bash
git add supabase/migrations/20260523000000_create_event_tables.sql lib/database.types.ts
git commit -m "feat(db): 이벤트 도메인 4 테이블 + view + RPC + RLS 추가

groups/group_members/events/event_participations 4 테이블,
group_attendance_stats view, join_group_by_token RPC, RLS 정책 11개,
profiles_select_group_members 보강 정책 1개를 단일 마이그레이션으로 추가."
```

---

## Task 2 — RLS 침투 검증 (수동)

**Files:** (검증만, 코드 변경 없음)

목적: 마이그레이션이 의도대로 동작하는지 RLS 거부 동작을 확인. 시드 데이터는 service_role(또는 Studio)로 직접 삽입.

- [ ] **Step 1: 시드 데이터 삽입 (Supabase Studio SQL Editor 또는 MCP `execute_sql`)**

```sql
-- 더미 사용자 2명은 auth.users에 이미 존재한다고 가정 (Google OAuth로 로그인 1회 이상)
-- 실제 user id를 `select id, email from auth.users limit 2;`로 먼저 확인
-- 아래는 placeholder — <USER_A_ID>, <USER_B_ID>를 실제 UUID로 치환

insert into public.groups (name, description, owner_id, invite_token) values
  ('테스트 수영회', '검증용 그룹', '<USER_A_ID>', 'seed-token-aaaa-bbbb-cccc');

-- USER_A를 그룹 멤버에 자동 추가 (Server Action이 할 일을 시드에서 흉내)
insert into public.group_members (group_id, user_id)
select id, owner_id from public.groups where invite_token = 'seed-token-aaaa-bbbb-cccc';
```

기대: 1 행씩 삽입 성공. `select count(*) from public.groups;` → 1.

- [ ] **Step 2: anon 키로 `groups.select()` 시도 → 0 row 확인**

Supabase Studio의 SQL Editor에서:

```sql
-- anon role 시뮬레이션
set role anon;
select count(*) from public.groups;
reset role;
```

기대: count = 0 (RLS 정상). reset role 후 다시 select하면 시드 행 가시.

- [ ] **Step 3: 다른 사용자(USER_B)로 `groups.select()` 시도 → 0 row 확인**

MCP `execute_sql`이나 Studio에서 JWT 시뮬레이션이 어려우면, USER_B로 실제 로그인한 후 dev 환경에서 `supabase.from('groups').select('*')` 호출 결과를 콘솔로 확인. (Phase 1 검증 흐름의 일부로 실제 V2 시나리오에서 자연스럽게 확인됨)

- [ ] **Step 4: 결과 기록 (선택)**

검증 결과를 spec의 §7.3 RLS 침투 테스트 체크리스트 옆에 코멘트로 남기거나 PR 본문에 첨부.

> Task 2는 코드 변경이 없어 commit 생략. 검증 실패 시 Task 1의 SQL을 수정하고 Task 1 Step 11의 commit을 amend.

---

## Task 3 — 초대 토큰 유틸리티

**Files:**
- Create: `lib/tokens.ts`

- [ ] **Step 1: 토큰 유틸 작성**

`lib/tokens.ts`:

```ts
import { randomBytes } from "node:crypto";

/**
 * 초대 토큰을 생성한다. 32바이트 URL-safe base64.
 * Node.js 서버에서만 호출 (randomBytes는 node:crypto).
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}
```

- [ ] **Step 2: 빌드 + 토큰 형식 즉석 검증**

Run: `npm run build`

기대: 통과.

추가 즉석 검증 — 임시로 `app/page.tsx`나 별도 스크립트에서 `console.log(generateInviteToken())`을 두 번 호출해 두 값이 다르고 약 43자(32바이트 base64url) 길이임을 확인. 확인 후 console.log 제거.

- [ ] **Step 3: 커밋**

```bash
git add lib/tokens.ts
git commit -m "feat(lib): 초대 토큰 생성 유틸 추가 (32B URL-safe base64)"
```

---

## Task 4 — 누락된 shadcn 컴포넌트 추가

**Files:**
- Create: `components/ui/textarea.tsx`
- Create: `components/ui/sonner.tsx`
- Modify: `app/layout.tsx` (Toaster 마운트)
- Modify (자동): `package.json` (sonner 의존성)

- [ ] **Step 1: shadcn CLI로 textarea 추가**

Run (PowerShell 또는 Bash):
```bash
npx shadcn@latest add textarea
```

기대: `components/ui/textarea.tsx` 생성. 빌드 깨짐 없음.

- [ ] **Step 2: shadcn CLI로 sonner 추가**

Run:
```bash
npx shadcn@latest add sonner
```

기대: `components/ui/sonner.tsx` 생성. `package.json`에 `sonner` 의존성 추가. `node_modules`에 설치 완료.

- [ ] **Step 3: `app/layout.tsx`에 Toaster 마운트**

기존 `app/layout.tsx`를 열어 `<body>` 안 가장 아래(다른 children 다음, ThemeProvider 안쪽)에 추가:

```tsx
import { Toaster } from "@/components/ui/sonner";

// ... 기존 RootLayout ...

// body 안 마지막에:
<Toaster richColors position="top-center" />
```

정확한 삽입 위치는 기존 `app/layout.tsx` 구조에 맞춰 조정. ThemeProvider 자식 트리 안에 두면 다크모드 토스트도 자동 적용.

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`

기대: 통과.

- [ ] **Step 5: 커밋**

```bash
git add components/ui/textarea.tsx components/ui/sonner.tsx app/layout.tsx package.json package-lock.json
git commit -m "feat(ui): shadcn textarea + sonner 추가, layout에 Toaster 마운트"
```

---

## Task 5 — Server Action `createGroup` + owner self-join 정책

**Files:**
- Create: `supabase/migrations/20260523000001_allow_owner_self_join.sql`
- Create: `app/groups/new/actions.ts`

> **배경**: Task 1의 `group_members` INSERT 정책은 일반 사용자 직접 insert를 차단(가입은 `join_group_by_token` RPC만 허용). 그러나 그룹 생성자는 자기 그룹에 본인을 멤버로 넣어야 한다. RPC 호출은 토큰이 필요해 흐름이 어색하므로, 정책을 "owner가 본인 행 추가" 한 가지로 좁혀 허용한다. (spec §4 RLS 표의 group_members INSERT 항목이 이 결정을 반영하도록 함께 갱신.)

- [ ] **Step 1: owner self-join 정책 마이그레이션 추가**

`supabase/migrations/20260523000001_allow_owner_self_join.sql`:

```sql
-- owner가 본인 소유 그룹에 group_members 행을 직접 insert할 수 있도록 허용
-- (그 외 사용자는 여전히 join_group_by_token RPC로만 가입)
create policy group_members_insert_owner_self on public.group_members
  for insert with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.groups
      where id = group_members.group_id
        and owner_id = (select auth.uid())
    )
  );
```

Supabase MCP `apply_migration` 또는 `supabase db push`로 적용. 정책 추가는 타입에 영향 없어 `generate_typescript_types` 재생성은 생략 가능.

- [ ] **Step 2: `createGroup` Server Action 작성**

`app/groups/new/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateInviteToken } from "@/lib/tokens";

export type CreateGroupState = {
  error?: string;
};

/**
 * 그룹을 생성한다. 생성자는 자동으로 group_members에 추가되고
 * 생성된 그룹 상세 페이지로 redirect.
 */
export async function createGroupAction(
  _prev: CreateGroupState,
  formData: FormData,
): Promise<CreateGroupState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (name.length < 1 || name.length > 50) {
    return { error: "그룹 이름은 1~50자여야 합니다." };
  }
  if (description.length > 500) {
    return { error: "설명은 500자 이하여야 합니다." };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) {
    return { error: "로그인이 필요합니다." };
  }

  const inviteToken = generateInviteToken();

  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      name,
      description: description.length > 0 ? description : null,
      owner_id: userId,
      invite_token: inviteToken,
    })
    .select("id")
    .single();

  if (error || !group) {
    return { error: `그룹 생성에 실패했습니다: ${error?.message ?? "unknown"}` };
  }

  // 생성자를 멤버로 자동 추가 (group_members_insert_owner_self 정책 사용)
  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: userId });

  if (memberError) {
    return { error: `멤버십 생성 실패: ${memberError.message}` };
  }

  redirect(`/groups/${group.id}`);
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`

기대: 통과. (페이지·폼이 아직 없어 action이 호출되지는 않지만 컴파일 OK)

- [ ] **Step 4: 커밋**

```bash
git add app/groups/new/actions.ts supabase/migrations/20260523000001_allow_owner_self_join.sql
git commit -m "feat(groups): createGroupAction Server Action + owner self-join RLS 정책"
```

---

## Task 6 — 그룹 생성 페이지 + 폼

**Files:**
- Create: `app/groups/new/create-group-form.tsx`
- Create: `app/groups/new/page.tsx`

- [ ] **Step 1: Client 폼 컴포넌트 작성**

`app/groups/new/create-group-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createGroupAction, type CreateGroupState } from "./actions";

const initialState: CreateGroupState = {};

export function CreateGroupForm() {
  const [state, formAction, pending] = useActionState(
    createGroupAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">그룹 이름</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={50}
          placeholder="예: 강남 수영회"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">설명 (선택)</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={500}
          placeholder="모임 소개를 적어주세요"
          rows={4}
        />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "만드는 중…" : "그룹 만들기"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Server 페이지 작성 (인증 검증)**

`app/groups/new/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateGroupForm } from "./create-group-form";

export const metadata = {
  title: "새 그룹 만들기",
};

export default async function NewGroupPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/auth/login?next=/groups/new");
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="mb-2 text-2xl font-semibold">새 그룹 만들기</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        그룹을 만든 뒤 초대 링크를 단톡방에 공유해 멤버를 모으세요.
      </p>
      <CreateGroupForm />
    </main>
  );
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`

기대: 통과. 빌드 로그에 `ƒ /groups/new` (Dynamic) 표기.

- [ ] **Step 4: 수동 검증 — 그룹 생성**

Run: `npm run dev`

1. 비로그인 상태로 `http://localhost:3000/groups/new` 접근 → `/auth/login?next=/groups/new`로 redirect 확인
2. Google 로그인 후 같은 URL → 폼 노출
3. 이름 "테스트 그룹 1" 입력 → "그룹 만들기" 클릭
4. 기대: `/groups/<uuid>`로 redirect (페이지는 아직 Task 7에서 만들 예정이라 404 가능 — 정상)
5. Supabase Studio에서 `select * from public.groups order by created_at desc limit 1;` → 새 행 확인
6. `select * from public.group_members where user_id = '<내 id>';` → 본인 멤버십 자동 생성 확인

- [ ] **Step 5: 커밋**

```bash
git add app/groups/new/page.tsx app/groups/new/create-group-form.tsx
git commit -m "feat(groups): 그룹 생성 페이지 + 폼 (인증 검증 포함)"
```

---

## Task 7 — 그룹 상세 페이지 스텁 + 초대 링크 복사 버튼

**Files:**
- Create: `components/copy-invite-link-button.tsx`
- Create: `app/groups/[groupId]/layout.tsx`
- Create: `app/groups/[groupId]/page.tsx`

Phase 1에서는 그룹 상세 페이지를 **스텁**으로만 만든다 — 그룹 이름, 멤버 수, 초대 링크 복사 버튼만. 회차·멤버 목록·출석률은 Phase 2·Phase 3에서 채운다.

- [ ] **Step 1: 클립보드 복사 버튼 (Client Component)**

`components/copy-invite-link-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  url: string;
};

/**
 * 초대 링크를 클립보드에 복사하고 토스트로 피드백.
 * navigator.clipboard는 secure context(HTTPS, localhost) 필수.
 */
export function CopyInviteLinkButton({ url }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("초대 링크가 복사되었습니다");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("복사에 실패했습니다. 직접 복사해 주세요.");
    }
  }

  return (
    <Button variant="outline" onClick={handleCopy}>
      {copied ? "✓ 복사됨" : "초대 링크 복사"}
    </Button>
  );
}
```

- [ ] **Step 2: 그룹 권한 검증 layout (멤버만 통과)**

`app/groups/[groupId]/layout.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function GroupLayout(props: {
  params: Promise<{ groupId: string }>;
  children: React.ReactNode;
}) {
  const { groupId } = await props.params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect(`/auth/login?next=/groups/${groupId}`);
  }

  // RLS가 비멤버에게 0 row를 돌려주므로 그룹 조회로 권한 검증
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) {
    notFound();
  }

  return <>{props.children}</>;
}
```

- [ ] **Step 3: 그룹 상세 페이지 (스텁)**

`app/groups/[groupId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CopyInviteLinkButton } from "@/components/copy-invite-link-button";

export default async function GroupDetailPage(props: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await props.params;
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, owner_id, invite_token")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) notFound();

  const { count: memberCount } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);

  const { data: claims } = await supabase.auth.getClaims();
  const isOwner = claims?.claims?.sub === group.owner_id;

  // 초대 URL 합성 (서버에서 host 헤더 기반)
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const inviteUrl = `${proto}://${host}/invite/${group.invite_token}`;

  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <header className="mb-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{group.name}</h1>
            {group.description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {group.description}
              </p>
            ) : null}
          </div>
          {isOwner ? <CopyInviteLinkButton url={inviteUrl} /> : null}
        </div>
        <div className="text-sm text-muted-foreground">
          멤버 {memberCount ?? 0}명
        </div>
      </header>

      <section className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        다음 단계(Phase 2)에서 다가오는 회차·멤버 목록·출석률이 이 자리에 채워집니다.
      </section>
    </main>
  );
}
```

- [ ] **Step 4: 빌드 + V1 수동 검증**

Run: `npm run build` → 통과

Run: `npm run dev`

V1: 
1. 로그인 상태로 `/groups/new`에서 그룹 생성
2. `/groups/<uuid>`로 redirect, 그룹명·설명·"멤버 1명" 표시 확인
3. owner이므로 "초대 링크 복사" 버튼 보임 → 클릭 → 토스트 "초대 링크가 복사되었습니다"
4. 클립보드에 `http://localhost:3000/invite/<token>` 저장 확인 (Notepad 등에 붙여넣기)

- [ ] **Step 5: 커밋**

```bash
git add app/groups/[groupId]/layout.tsx app/groups/[groupId]/page.tsx components/copy-invite-link-button.tsx
git commit -m "feat(groups): 그룹 상세 스텁 + 초대 링크 복사 버튼"
```

---

## Task 8 — Server Action `joinGroupByToken`

**Files:**
- Create: `app/invite/[token]/actions.ts`

- [ ] **Step 1: `joinGroupByToken` Server Action 작성**

`app/invite/[token]/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type JoinGroupState = {
  error?: string;
};

/**
 * 초대 토큰으로 그룹에 가입한다.
 * - 비로그인 → 호출 자체가 정책상 거부됨. 호출 전에 페이지에서 분기
 * - 이미 가입 → RPC가 그룹 id 반환 (멱등)
 * - 무효 토큰 → RPC가 raise → error 상태 반환
 */
export async function joinGroupByTokenAction(
  _prev: JoinGroupState,
  formData: FormData,
): Promise<JoinGroupState> {
  const token = String(formData.get("token") ?? "");
  if (token.length === 0) {
    return { error: "초대 토큰이 비어 있습니다." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_group_by_token", { token });

  if (error || !data) {
    const msg = error?.message ?? "";
    if (msg.includes("invalid_invite_token")) {
      return { error: "유효하지 않은 초대 링크입니다." };
    }
    if (msg.includes("not_authenticated")) {
      return { error: "로그인이 필요합니다." };
    }
    return { error: `가입에 실패했습니다: ${msg || "unknown"}` };
  }

  redirect(`/groups/${data}`);
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`

기대: 통과. RPC 호출이 타입 안전(generate_typescript_types 결과에 `join_group_by_token` 시그니처 등록).

- [ ] **Step 3: 커밋**

```bash
git add app/invite/[token]/actions.ts
git commit -m "feat(invite): joinGroupByTokenAction Server Action"
```

---

## Task 9 — 초대 관문 페이지 + 가입 버튼

**Files:**
- Create: `app/invite/[token]/join-group-button.tsx`
- Create: `app/invite/[token]/page.tsx`

- [ ] **Step 1: 가입 확인 Client 버튼**

`app/invite/[token]/join-group-button.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  joinGroupByTokenAction,
  type JoinGroupState,
} from "./actions";

const initialState: JoinGroupState = {};

type Props = {
  token: string;
  groupName: string;
};

export function JoinGroupButton({ token, groupName }: Props) {
  const [state, formAction, pending] = useActionState(
    joinGroupByTokenAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <Button type="submit" disabled={pending}>
        {pending ? "가입 중…" : `${groupName} 그룹 가입하기`}
      </Button>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
    </form>
  );
}
```

- [ ] **Step 2: 초대 관문 페이지 (4분기)**

`app/invite/[token]/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { JoinGroupButton } from "./join-group-button";

export const metadata = {
  title: "그룹 초대",
};

export default async function InvitePage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;
  const supabase = await createClient();

  // 1) 토큰으로 그룹 조회 (RLS가 비멤버에게는 0 row 돌려주므로
  // 토큰만으로는 그룹 정보를 보기 위해 service_role이 필요해 보이지만,
  // groups_select 정책에 "owner OR 멤버"만 있어 비멤버는 미가입 분기에서
  // 그룹 이름을 못 본다. → invite_token으로 SELECT를 허용하는 별도 정책 필요)
  //
  // 해결: 초대 페이지에서 invite_token 일치 시 SELECT를 허용하는 정책을 추가
  // (Task 9 Step 3에서 마이그레이션 추가)
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description")
    .eq("invite_token", token)
    .maybeSingle();

  // 분기 (a) 토큰 무효
  if (!group) {
    return (
      <main className="mx-auto w-full max-w-md p-6 text-center">
        <h1 className="mb-2 text-xl font-semibold">유효하지 않은 초대 링크</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          링크가 잘못되었거나 만료되었습니다.
        </p>
        <Button asChild variant="outline">
          <Link href="/">홈으로</Link>
        </Button>
      </main>
    );
  }

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  // 분기 (b) 비로그인
  if (!userId) {
    return (
      <main className="mx-auto w-full max-w-md p-6">
        <h1 className="mb-2 text-xl font-semibold">{group.name}</h1>
        {group.description ? (
          <p className="mb-6 text-sm text-muted-foreground">
            {group.description}
          </p>
        ) : null}
        <p className="mb-4 text-sm">
          그룹에 가입하려면 먼저 로그인하세요.
        </p>
        <Button asChild>
          <Link href={`/auth/login?next=/invite/${token}`}>
            Google로 로그인
          </Link>
        </Button>
      </main>
    );
  }

  // 분기 (c) 이미 가입
  const { data: member } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (member) {
    redirect(`/groups/${group.id}`);
  }

  // 분기 (d) 로그인 + 미가입
  return (
    <main className="mx-auto w-full max-w-md p-6">
      <h1 className="mb-2 text-xl font-semibold">{group.name}</h1>
      {group.description ? (
        <p className="mb-6 text-sm text-muted-foreground">
          {group.description}
        </p>
      ) : null}
      <p className="mb-4 text-sm">이 그룹에 가입하시겠습니까?</p>
      <JoinGroupButton token={token} groupName={group.name} />
    </main>
  );
}
```

- [ ] **Step 3: `get_group_by_invite_token` RPC 마이그레이션 추가**

비멤버는 RLS상 `groups`를 SELECT할 수 없으므로 초대 관문에서 그룹 이름·설명을 표시하려면 RPC가 필요. `security definer`로 RLS를 우회하되 반환 컬럼에 `invite_token`을 제외해 토큰 유출을 막는다.

`supabase/migrations/20260523000002_get_group_by_invite_token.sql` 생성:

```sql
-- 초대 관문 페이지가 비멤버에게도 그룹 이름·설명을 보여주기 위한 RPC.
-- security definer로 RLS를 우회하되, invite_token 일치를 정책의 역할로 강제.
create or replace function public.get_group_by_invite_token(token text)
returns table (id uuid, name text, description text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    select g.id, g.name, g.description
    from public.groups g
    where g.invite_token = token;
end;
$$;

revoke all on function public.get_group_by_invite_token(text) from public;
grant execute on function public.get_group_by_invite_token(text) to anon, authenticated;
```

Supabase MCP `apply_migration`으로 적용 → `generate_typescript_types`로 `lib/database.types.ts` 갱신.

- [ ] **Step 4: `app/invite/[token]/page.tsx` 수정 — RPC 사용**

페이지의 그룹 조회 부분을 다음으로 교체:

```ts
  const { data: groups } = await supabase
    .rpc("get_group_by_invite_token", { token });
  const group = groups?.[0] ?? null;
```

기존 `supabase.from("groups").select(...).eq("invite_token", token)` 호출을 제거한다. 나머지 분기 로직은 그대로.

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`

기대: 통과. RPC 시그니처가 타입에 반영되어 `groups?.[0]`이 `{ id, name, description }`로 추론.

- [ ] **Step 6: V2, V3, V4 수동 검증**

Run: `npm run dev`

**V2 (다른 사용자가 초대 URL 클릭 → 가입)**:
1. 사용자 A로 그룹 생성 후 초대 URL 복사 (Task 7 결과)
2. 시크릿 창에서 사용자 B(다른 Google 계정)로 로그인
3. 시크릿 창에 초대 URL 붙여넣기 → "<그룹명> 그룹 가입하기" 버튼 노출
4. 버튼 클릭 → `/groups/<id>`로 redirect, "멤버 2명" 표시 확인

**V3 (이미 가입된 사용자가 같은 URL 재방문)**:
1. V2 이후 시크릿 창에서 초대 URL 다시 방문
2. 즉시 `/groups/<id>`로 redirect (가입 다이얼로그 X)

**V4 (무효 토큰)**:
1. URL을 `http://localhost:3000/invite/invalid-token-xxx`로 직접 입력
2. "유효하지 않은 초대 링크" 화면 + 홈 버튼만 노출 (그룹 정보 노출 0)

- [ ] **Step 7: 커밋**

```bash
git add app/invite/[token]/page.tsx app/invite/[token]/join-group-button.tsx \
  supabase/migrations/20260523000002_get_group_by_invite_token.sql \
  lib/database.types.ts
git commit -m "feat(invite): 초대 관문 페이지 (4분기) + get_group_by_invite_token RPC"
```

---

## Task 10 — 홈 페이지 "내 그룹 목록"

**Files:**
- Modify: `app/page.tsx`

기존 starter 템플릿의 홈 페이지를 갈아엎지 않고, **로그인 사용자에게는 그룹 목록 + 새 그룹 만들기 카드를 보여주고, 비로그인은 기존 starter UI 유지**.

- [ ] **Step 1: 홈 페이지 수정**

`app/page.tsx`를 다음으로 교체:

```tsx
import Link from "next/link";
import { Suspense } from "react";
import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { Hero } from "@/components/hero";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ConnectSupabaseSteps } from "@/components/tutorial/connect-supabase-steps";
import { SignUpUserSteps } from "@/components/tutorial/sign-up-user-steps";
import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function MyGroupsSection() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return null;

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name, description)")
    .order("joined_at", { ascending: false });

  return (
    <section className="w-full max-w-3xl px-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">내 그룹</h2>
        <Button asChild>
          <Link href="/groups/new">+ 새 그룹 만들기</Link>
        </Button>
      </div>
      {!memberships || memberships.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          아직 가입한 그룹이 없습니다. 초대 링크를 받았다면 그 URL로 접속하세요.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {memberships.map((m) => {
            const g = m.groups;
            if (!g) return null;
            return (
              <Card key={g.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    <Link
                      href={`/groups/${g.id}`}
                      className="hover:underline"
                    >
                      {g.name}
                    </Link>
                  </CardTitle>
                </CardHeader>
                {g.description ? (
                  <CardContent className="text-sm text-muted-foreground">
                    {g.description}
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-10 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"}>모임 관리</Link>
              <div className="flex items-center gap-2">
                <DeployButton />
              </div>
            </div>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>

        {isLoggedIn ? (
          <Suspense fallback={null}>
            <MyGroupsSection />
          </Suspense>
        ) : (
          <div className="flex-1 flex flex-col gap-10 max-w-5xl p-5">
            <Hero />
            <section className="flex-1 flex flex-col gap-6 px-4">
              <h2 className="font-medium text-xl mb-4">Next steps</h2>
              {hasEnvVars ? <SignUpUserSteps /> : <ConnectSupabaseSteps />}
            </section>
          </div>
        )}

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>모임 이벤트 관리 MVP</p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`

기대: 통과. `/`가 `ƒ (Dynamic)`로 표기 (서버에서 인증 상태 분기 → Dynamic).

- [ ] **Step 3: 수동 검증**

Run: `npm run dev`

1. 비로그인으로 `/` 접속 → Hero + "Next steps" (기존 starter UI) 노출
2. 로그인 후 `/` 접속 → "내 그룹" 헤더 + 가입된 그룹 카드 목록 + "+ 새 그룹 만들기" 버튼 노출
3. 카드 클릭 → `/groups/<id>` 진입
4. "+ 새 그룹 만들기" → `/groups/new` 진입

- [ ] **Step 4: 커밋**

```bash
git add app/page.tsx
git commit -m "feat(home): 로그인 사용자에게 내 그룹 목록 + 새 그룹 만들기 카드"
```

---

## Task 11 — Phase 1 회귀 검증

**Files:** (검증만)

- [ ] **Step 1: 자동 검증**

Run (순서대로):
```bash
npm run lint
npm run build
```

기대:
- `npm run lint`: 경고 0
- `npm run build`: 통과. 빌드 로그에서 다음 라우트가 모두 `ƒ (Dynamic)` 표기 확인:
  - `ƒ /`
  - `ƒ /groups/new`
  - `ƒ /groups/[groupId]`
  - `ƒ /invite/[token]`

- [ ] **Step 2: V1~V4 수동 시나리오 일괄 검증**

`npm run dev` 후 다음 순서로 실행:

| ID | 시나리오 | 기대 결과 |
|---|---|---|
| V1 | 로그인 → 그룹 생성 → 초대 URL 복사 | 클립보드 저장, 그룹 페이지 200 |
| V2 | 다른 사용자(시크릿 창)로 초대 URL 접속 → 가입 | 그룹 페이지 진입, "멤버 2명" 표시 |
| V3 | V2 사용자가 같은 URL 재방문 | 즉시 그룹 페이지 redirect |
| V4 | `/invite/invalid-token-xxx` 직접 접속 | "유효하지 않은 초대 링크" 화면, 그룹 정보 노출 0 |

추가 침투 검증:
- [ ] 그룹 A 멤버가 그룹 B의 `/groups/<B_ID>` URL 직접 접근 → 404 (layout의 `notFound()`)
- [ ] 비로그인이 `/groups/new` 직접 접근 → `/auth/login?next=/groups/new` redirect

- [ ] **Step 3: 결과 기록 + Phase 1 종료 커밋**

검증 결과를 plan 본 문서 끝에 "검증 결과" 섹션으로 추가하거나 PR description에 첨부.

```bash
# 검증만 했으면 별도 commit 없음.
# plan 문서 자체를 갱신했다면:
git add docs/superpowers/plans/2026-05-23-meetup-mvp-phase1.md
git commit -m "docs(plan): Phase 1 검증 결과 기록"
```

---

## Phase 1 완료 후 다음 단계

Phase 1이 완료되면 다음을 만족하는 working software가 생긴다:
- 사용자 A가 그룹을 만들고 초대 링크를 카카오 단톡방에 공유 가능
- 사용자 B가 단톡방 링크 클릭 → Google 로그인 → 가입 → 그룹 페이지 진입
- 그룹 페이지는 스텁(이름·멤버 수·초대 링크 복사만) — 회차/RSVP는 Phase 2에서 채움

**Phase 2 plan은 별도 문서로 작성**:
- `docs/superpowers/plans/<날짜>-meetup-mvp-phase2.md`
- 범위: spec M3 (회차 생성 + RSVP + 응답 잠금)
- 트리거: Phase 1 검증 완료 후 사용자가 `writing-plans` 스킬 재호출 또는 본 plan의 후속 작업으로 자연스럽게 진입
