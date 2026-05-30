-- Phase 3 Task 7 시점 발견 — v2_is_admin 함수의 stable + `set local row_security = off`
-- 충돌. 동일 패턴이 v2_get_event_by_invite_code 에서도 발견됐고 (commit 880c5fd) 같은
-- 정정 적용. admin-flow MCP 검증 단계에서 SQL Editor 직접 호출 시 PG 0A000
-- "SET is not allowed in a non-volatile function" 으로 발견.
--
-- 원인:
-- 함수 정의에 `stable` + `set local row_security = off` 가 함께 있음. stable 함수는
-- 결정적이어야 하므로 PG 가 SET 부수 효과 명령을 거부. PostgREST 호출 컨텍스트에서는
-- 함수가 query 에 inline 되어 SET 이 보이지 않을 수 있으나, 직접 호출 또는 RLS
-- 정책 평가 시 inline 되지 않으면 0A000.
--
-- 영향 범위:
-- v2_is_admin 은 5 개 admin RLS 정책에서 사용:
-- - v2_users_delete_admin_only
-- - v2_users_select_self_or_admin
-- - v2_events_update_owner_or_admin
-- - v2_events_delete_owner_or_admin
-- - v2_event_participants_select (조건 3)
-- - v2_admin_users_select_admin_only
-- - storage v2_event_covers_delete_owner_or_admin
-- 정책 안에서 inline 안 될 경우 admin 권한 검증 silent fail → admin 도 access denied
-- 가능성. v2_admin_users 의 SELECT 정책이 v2_is_admin 을 호출하는 chicken-and-egg
-- 도 잠재 (admin 권한을 확인하려면 admin 이어야 하는 패러독스).
--
-- 검증:
-- fix 후 SQL Editor 직접 호출 → v2_is_admin(host1) = true, v2_is_admin(bandnell) = false
-- 정상 반환. JWT 시뮬레이션으로 host1 의 v2_admin_users count = 1, bandnell = 0 확인.
--
-- 해결:
-- `set local row_security = off` 제거. SECURITY DEFINER + 함수 owner (postgres,
-- BYPASSRLS attribute) 가 v2_admin_users 의 RLS 를 자동 우회 — 명시적 SET 불필요.
-- v2_get_event_by_invite_code fix 패턴과 동일.
--
-- 멱등: create or replace 만 사용. 재적용 안전.

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
  select exists (
    select 1 from public.v2_admin_users where id = target_user_id
  ) into result;
  return result;
end;
$$;

comment on function public.v2_is_admin(uuid) is
  'v2.0 RLS 정책에서 admin 권한 체크 시 사용. SECURITY DEFINER + 함수 owner postgres (BYPASSRLS) 가 v2_admin_users 의 RLS 자동 우회 (명시 SET 불필요 — stable 함수 제약 회피).';
