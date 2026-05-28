-- Phase 3 Task 7 시점 발견 — v2_users backfill (trigger 등록 이전 가입자 보완).
--
-- 원인:
-- migration 0000 의 `on_auth_user_created_v2` trigger 는 등록 이후의 새 auth.users
-- INSERT 만 처리. v1.0 시기 또는 v2 마이그레이션 0000 적용 이전에 이미 OAuth 로 가입한
-- 사용자는 auth.users 에는 있으나 public.v2_users 에는 row 가 없음.
-- 결과: 해당 사용자가 v2 흐름 (joinEvent · createEvent 등) 진입 시 v2_users FK 위반.
-- 실제 발견 경로: Task 7 participant-flow #1b — joinEvent 시
-- `insert or update on table "v2_event_participants" violates foreign key constraint
-- "v2_event_participants_user_id_fkey"` (PG 23503).
--
-- 해결:
-- 모든 auth.users 에 대해 v2_users 에 row 가 없으면 INSERT.
-- raw_user_meta_data 에서 Google OAuth 가 채우는 full_name/name · avatar_url/picture
-- 두 패턴 모두 시도.
--
-- 멱등: `where not exists` + `on conflict do nothing` 이중 가드. 재적용 안전.

insert into public.v2_users (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name'
  ),
  coalesce(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  )
from auth.users u
where not exists (
  select 1 from public.v2_users v where v.id = u.id
)
on conflict (id) do nothing;
