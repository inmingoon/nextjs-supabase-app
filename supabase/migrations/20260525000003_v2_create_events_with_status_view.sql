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
