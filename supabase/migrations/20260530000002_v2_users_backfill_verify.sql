-- Phase 3 Task 8 code review I5 권고 — backfill 누락 silent 가드.
--
-- 마이그레이션 `20260528000001_v2_users_backfill.sql` 은 실행 컨텍스트의 owner 가
-- `auth.users` SELECT 권한이 없으면 silent 0-row INSERT 한다. 멱등 가드
-- (`where not exists` + `on conflict`) 가 안전성을 보장하나 누락 자체는 silent —
-- 향후 ephemeral 환경 (preview branch, CLI `supabase db push`) 적용 시 v2_users
-- 가 비어있는 상태로 v2 흐름 진입 → joinEvent 23503 재발.
--
-- 본 검증 마이그레이션은 backfill 누락이 발생했는지 raise warning 으로 표면화.
-- service_role (apply_migration / SQL Editor postgres owner) 으로 실행 시
-- auth.users 가 정상 SELECT 가능 — 누락 0 건이 정상.
--
-- 멱등: select only, raise warning. 재적용 안전.

do $$
declare
  missing int;
begin
  select count(*) into missing
  from auth.users u
  where not exists (
    select 1 from public.v2_users v where v.id = u.id
  );
  if missing > 0 then
    raise warning 'v2_users backfill 누락 % 건 — auth.users SELECT 권한 또는 backfill 마이그레이션 적용 상태 확인', missing;
  end if;
end $$;
