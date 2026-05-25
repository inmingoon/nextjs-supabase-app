-- =============================================================================
-- v2.0 Phase 3 Task 007 — event-covers Storage 버킷 (spec §3)
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('event-covers', 'event-covers', true)
on conflict (id) do nothing;

-- INSERT: v2_events 주최자만 (file path: events/{event_id}/cover.{ext})
create policy v2_event_covers_insert_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'event-covers'
    and exists (
      select 1 from public.v2_events e
      where e.created_by = auth.uid()
      and (storage.foldername(name))[1] = 'events'
      and (storage.foldername(name))[2] = e.id::text
    )
  );

create policy v2_event_covers_update_owner on storage.objects
  for update to authenticated
  using (
    bucket_id = 'event-covers'
    and exists (
      select 1 from public.v2_events e
      where e.created_by = auth.uid()
      and (storage.foldername(name))[1] = 'events'
      and (storage.foldername(name))[2] = e.id::text
    )
  );

create policy v2_event_covers_delete_owner_or_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'event-covers'
    and (
      public.v2_is_admin(auth.uid())
      or exists (
        select 1 from public.v2_events e
        where e.created_by = auth.uid()
        and (storage.foldername(name))[1] = 'events'
        and (storage.foldername(name))[2] = e.id::text
      )
    )
  );

-- SELECT: bucket이 public이므로 자동.
