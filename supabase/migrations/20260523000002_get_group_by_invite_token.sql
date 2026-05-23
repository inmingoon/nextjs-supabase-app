-- 초대 관문 페이지가 비멤버에게도 그룹 이름·설명을 보여주기 위한 RPC.
-- security definer로 RLS를 우회하되, invite_token 일치를 정책의 역할로 강제.
create or replace function public.get_group_by_invite_token(token text)
returns table (id uuid, name text, description text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    select g.id, g.name, g.description
    from public.groups g
    where g.invite_token = token;
end;
$$;

revoke all on function public.get_group_by_invite_token(text) from public;
grant execute on function public.get_group_by_invite_token(text) to anon, authenticated;
