-- Phase 3 Task 7 시점 발견 — v2_get_event_by_invite_code 가 anon 호출 시 NULL 반환하는 문제 해결.
--
-- 원인 (2단 결합):
-- 1) Task 1 fix(eb55b02) 에서 v2_events_with_status view 를 security_invoker = true 로
--    설정해 anon 의 view 직접 SELECT RLS bypass 위험 제거. 함수가 SECURITY DEFINER 임에도
--    view 가 invoker rights 라 함수 안에서 view select 시 호출자(anon) 권한으로 평가됨.
-- 2) 기존 함수의 `set local row_security = off` 가 `stable` declaration 과 충돌 — PG는
--    stable 함수에서 SET 을 거부 (`SET is not allowed in a non-volatile function`).
--    PostgREST 호출 시점에서도 같은 에러로 fail. dev server 의 200 응답은 not-found
--    페이지가 200 으로 잡힌 케이스로 보임.
--
-- 해결:
-- (a) 함수가 view 대신 v2_events table 을 직접 SELECT + status 를 함수 안에서 case 로 계산.
--     → invoker-rights view 우회.
-- (b) `set local row_security = off` 제거. SECURITY DEFINER + 함수 owner (postgres,
--     BYPASSRLS attribute) 가 RLS 를 자동 우회하므로 명시적 set 불필요.
--     → stable 충돌 해결.
--
-- 멱등: create or replace 만 사용. 재적용 안전.

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
  select
    e.*,
    (case
      when e.event_date > now() then 'upcoming'
      when e.event_date > now() - interval '4 hours' then 'ongoing'
      else 'completed'
    end)::text as status
  into result
  from public.v2_events e
  where e.invite_code = p_code
  limit 1;
  return result;
end;
$$;

comment on function public.v2_get_event_by_invite_code(text) is
  '비로그인 사용자도 초대 코드로 단일 v2_event 미리보기. v2_events table 직접 SELECT + status 인라인 계산 (view security_invoker = true 우회).';
