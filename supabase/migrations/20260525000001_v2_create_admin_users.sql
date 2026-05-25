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
