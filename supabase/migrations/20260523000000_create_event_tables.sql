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
create index ep_user_id_idx on public.event_participations (user_id);

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

-- group_members 정책
-- SECURITY DEFINER 헬퍼: group_members SELECT 정책에서 자기 테이블을 직접 참조하면
-- 무한 재귀(42P17)가 발생한다. 헬퍼 함수는 RLS를 우회하여 재귀를 방지.
-- 주의: security definer만으로는 RLS 우회가 보장 안 됨 — set row_security = off 명시.
-- 누락 시 함수 내부 select가 group_members RLS 정책을 다시 호출 → 또 다른 재귀.
create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
set row_security = off
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
  for update using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.events
      where id = event_participations.event_id
        and starts_at > now()
    )
  ) with check (
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
  -- 함수 본문의 auth.uid() 직접 호출은 RLS 정책의 (select auth.uid()) 캐시 패턴과
  -- 다르다. PL/pgSQL function context에서는 캐시 이점이 없으므로 직접 호출이 정상.
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
