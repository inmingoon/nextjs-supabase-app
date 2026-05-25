-- =============================================================================
-- v2.0 Phase 3 Task 007 — 첫 v2_admin 부여 (spec §4 결정 3 하드코딩)
-- =============================================================================

do $$
declare
  target_email text := 'inmingoon@gmail.com';
  target_uid uuid;
begin
  select id into target_uid from auth.users where email = target_email limit 1;

  if target_uid is null then
    raise notice 'First v2 admin email % not registered yet. Re-run this migration after user signs up via Google OAuth.', target_email;
  else
    -- v2_users에도 row 있어야 FK 충족 (v2_handle_new_user 트리거가 INSERT 이후 자동 처리하지만, 사용자가 트리거 이전 가입한 경우 대비)
    insert into public.v2_users (id, email)
    values (target_uid, target_email)
    on conflict (id) do nothing;

    insert into public.v2_admin_users (id, granted_by, reason)
    values (target_uid, target_uid, 'First v2 admin — bootstrapped via v2_grant_first_admin migration')
    on conflict (id) do nothing;

    raise notice 'First v2 admin granted: %', target_email;
  end if;
end;
$$;
