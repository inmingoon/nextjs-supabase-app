-- owner가 본인 소유 그룹에 group_members 행을 직접 insert할 수 있도록 허용
-- (그 외 사용자는 여전히 join_group_by_token RPC로만 가입)
create policy group_members_insert_owner_self on public.group_members
  for insert with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.groups
      where id = group_members.group_id
        and owner_id = (select auth.uid())
    )
  );
