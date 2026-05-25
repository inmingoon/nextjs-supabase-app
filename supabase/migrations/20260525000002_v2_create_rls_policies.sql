-- =============================================================================
-- v2.0 Phase 3 Task 007 — RLS 정책 (spec §5 high-level 매트릭스 구현, v2_ prefix)
-- =============================================================================

-- ============================ v2_users 테이블 ============================
create policy v2_users_select_self_or_admin on public.v2_users
  for select to authenticated
  using (auth.uid() = id or public.v2_is_admin(auth.uid()));

create policy v2_users_update_self on public.v2_users
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy v2_users_delete_admin_only on public.v2_users
  for delete to authenticated
  using (public.v2_is_admin(auth.uid()));

-- INSERT: v2_handle_new_user 트리거가 처리. 명시적 정책 없음.

-- ============================ v2_events 테이블 ============================
create policy v2_events_select_all_authenticated on public.v2_events
  for select to authenticated
  using (true);

-- 비인증 invite 페이지는 v2_get_event_by_invite_code SECURITY DEFINER 함수로 우회.
-- anon SELECT 정책 불필요.

create policy v2_events_insert_authenticated on public.v2_events
  for insert to authenticated
  with check (auth.uid() = created_by);

create policy v2_events_update_owner_or_admin on public.v2_events
  for update to authenticated
  using (auth.uid() = created_by or public.v2_is_admin(auth.uid()))
  with check (auth.uid() = created_by or public.v2_is_admin(auth.uid()));

create policy v2_events_delete_owner_or_admin on public.v2_events
  for delete to authenticated
  using (auth.uid() = created_by or public.v2_is_admin(auth.uid()));

-- ============================ v2_event_participants 테이블 ============================
create policy v2_event_participants_select on public.v2_event_participants
  for select to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.v2_events e where e.id = event_id and e.created_by = auth.uid())
    or public.v2_is_admin(auth.uid())
    or exists (select 1 from public.v2_event_participants p where p.event_id = v2_event_participants.event_id and p.user_id = auth.uid())
  );

create policy v2_event_participants_insert_self on public.v2_event_participants
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy v2_event_participants_delete on public.v2_event_participants
  for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.v2_events e where e.id = event_id and e.created_by = auth.uid())
    or public.v2_is_admin(auth.uid())
  );
