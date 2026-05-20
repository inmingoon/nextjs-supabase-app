-- 1. profiles 테이블: 회원가입 사용자의 부가 정보 저장
create table public.profiles (
  id          uuid        not null references auth.users (id) on delete cascade,
  username    text        unique,
  full_name   text,
  avatar_url  text,
  bio         text,
  website     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (id),
  constraint username_length check (username is null or char_length(username) >= 3)
);

comment on table public.profiles is '회원가입한 사용자의 부가 프로필 정보. id는 auth.users 참조.';

-- 2. RLS 활성화
alter table public.profiles enable row level security;

-- 3. RLS 정책: 본인 행만 (auth.uid()를 select로 감싸 per-statement 캐시)
create policy profiles_select_own on public.profiles
  for select using ( (select auth.uid()) = id );

create policy profiles_insert_own on public.profiles
  for insert with check ( (select auth.uid()) = id );

create policy profiles_update_own on public.profiles
  for update using ( (select auth.uid()) = id )
            with check ( (select auth.uid()) = id );

-- 4. updated_at 자동 갱신 트리거
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- 5. 신규 가입 시 프로필 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6. 기존 사용자 백필
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
