-- Phase 1 OAuth 수동 검증 중 발견된 RLS 무한 재귀 2차 fix.
--
-- 원인 1: is_group_member helper가 language sql + stable로 작성되어 PostgreSQL planner가
--         함수 본문을 호출 쿼리에 inline. inline 시 함수의 SET 옵션(row_security = off)이
--         무시되어 함수 내부 select가 group_members RLS 정책을 재호출 → 무한 재귀.
--
-- 원인 2: groups_select_member_or_owner 정책의 OR 두 번째 절이 group_members를 직접 참조해
--         group_members INSERT 흐름에서 self-reference 사이클 형성:
--         group_members INSERT → WITH CHECK → groups SELECT → group_members SELECT.
--
-- Fix 1: helper를 plpgsql로 변경(inline 방지) + body에 SET LOCAL row_security TO OFF +
--        owner를 postgres(BYPASSRLS 보유)로 명시 변경.
--
-- 주의: `stable`은 제거(=volatile)해야 한다. PostgreSQL은 `STABLE` 함수 body 안
-- `SET LOCAL`을 금지(ERROR 0A000: SET is not allowed in a non-volatile function).
-- helper가 sub-query에서 매번 호출되어도 RLS 평가는 query별로 한 번씩이라 비용 무관.
create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
-- volatile (stable 제거 — body의 SET LOCAL을 허용하기 위해)
set search_path = public
as $$
begin
  set local row_security to off;
  return exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  );
end;
$$;

alter function public.is_group_member(uuid, uuid) owner to postgres;

-- Fix 2: groups SELECT 정책의 group_members 직접 참조를 helper 호출로 교체해
--        self-reference 사이클 끊기.
drop policy if exists groups_select_member_or_owner on public.groups;

create policy groups_select_member_or_owner on public.groups
  for select using (
    owner_id = (select auth.uid())
    or public.is_group_member(id, (select auth.uid()))
  );
