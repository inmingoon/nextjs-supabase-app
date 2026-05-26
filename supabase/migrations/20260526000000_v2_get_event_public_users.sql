-- Phase 3 Task 3 RLS-relaxation: 이벤트 참여자가 같은 이벤트의 다른 참여자의
-- 공개 프로필(id, full_name, avatar_url)을 읽을 수 있도록 SECURITY DEFINER 함수 신설.
-- v2_users RLS 정책 자체는 self/admin only로 유지 (email 등 비공개 필드 보호).
-- 호출자는 (a) 이벤트 host이거나 (b) 같은 이벤트 참여자여야 함 — 그 외는 빈 배열.

create or replace function public.v2_get_event_public_users(p_event_id uuid)
returns table (
  id uuid,
  full_name text,
  avatar_url text
)
language sql
security definer
set search_path = public
stable
as $$
  with caller as (
    select auth.uid() as uid
  ),
  visible as (
    -- 호출자가 host이거나 참여자인 경우에만 진행
    select 1
    from v2_events e
    left join v2_event_participants p on p.event_id = e.id
    cross join caller c
    where e.id = p_event_id
      and (e.created_by = c.uid or p.user_id = c.uid)
    limit 1
  )
  select u.id, u.full_name, u.avatar_url
  from v2_users u
  join v2_event_participants ep on ep.user_id = u.id
  where ep.event_id = p_event_id
    and exists (select 1 from visible)
  order by ep.joined_at asc;
$$;

grant execute on function public.v2_get_event_public_users(uuid) to authenticated, anon;

comment on function public.v2_get_event_public_users(uuid) is
  'SECURITY DEFINER: returns id/full_name/avatar_url of event participants. Caller must be host or participant of the event.';
