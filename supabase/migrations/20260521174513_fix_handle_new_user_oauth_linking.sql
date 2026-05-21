-- OAuth 계정 링킹 대응: handle_new_user 트리거 개선
--
-- 문제: 기존 on_auth_user_created 트리거는 auth.users의 INSERT에만 발화했다.
-- 같은 이메일로 이미 존재하는 유저가 Google OAuth로 로그인하면 Supabase는
-- 새 유저를 INSERT하지 않고 기존 auth.users 행을 UPDATE한다(identity 링크 +
-- raw_user_meta_data 갱신). 트리거가 UPDATE에는 발화하지 않으므로
-- profiles.full_name / avatar_url 이 비어 있는 채로 남았다.
--
-- 해결: 트리거를 INSERT·UPDATE 모두 대응으로 바꾸고, 함수를 upsert로 교체한다.

-- 1. handle_new_user를 upsert로 교체.
--    auth.users의 INSERT(신규 가입)와 UPDATE(OAuth 계정 링킹 등) 모두에서 호출된다.
--    profiles 행이 없으면 생성하고, 있으면 비어 있는 칸만 메타데이터로 채운다
--    (coalesce로 사용자가 직접 수정한 값은 보존).
--    Google OAuth는 full_name/name, avatar_url/picture 키를 모두 제공하므로 둘 다 대비.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles as p (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do update set
    full_name  = coalesce(p.full_name, excluded.full_name),
    avatar_url = coalesce(p.avatar_url, excluded.avatar_url)
  where p.full_name is null or p.avatar_url is null;
  return new;
end;
$$;

-- 2. 트리거를 INSERT 전용에서 INSERT·UPDATE 모두 대응으로 교체.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_user();

-- 3. 기존 유저 백필: 계정 링킹 등으로 메타데이터가 늦게 채워진 유저의 빈 프로필 칸을 채운다.
--    updated_at은 on_profiles_updated (before update) 트리거가 자동 갱신한다.
update public.profiles p
set
  full_name  = coalesce(p.full_name, u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  avatar_url = coalesce(p.avatar_url, u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
where p.id = u.id
  and (p.full_name is null or p.avatar_url is null);
