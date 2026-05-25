-- =============================================================================
-- v2.0 Phase 3 Task 007 — 핵심 도메인 테이블 (v2_users · v2_events · v2_event_participants)
-- REVISION: v1.0 project 재사용. 모든 객체에 v2_ prefix.
-- =============================================================================

-- public.v2_users: auth.users 확장 프로필 (v1.0 public.profiles와 별개)
create table public.v2_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.v2_users is 'v2.0 1회성 이벤트 도메인 사용자 프로필. v1.0 profiles와 별개. role은 v2_admin_users 테이블로 분리 (spec §4 결정 B).';

-- public.v2_events: 1회성 이벤트 (v1.0 events는 회차 — 별개)
create table public.v2_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  description text check (char_length(description) <= 1000),
  cover_image_url text,
  event_date timestamptz not null,
  location text not null check (char_length(location) between 1 and 200),
  invite_code text unique not null,
  created_by uuid not null references public.v2_users(id) on delete cascade,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.v2_events is 'v2.0 1회성 이벤트. v1.0 events(회차)와 prefix로 분리.';
comment on column public.v2_events.invite_code is 'crypto.randomBytes(32).toString("base64url"). UNIQUE 제약 + Server Action에서 충돌 시 재시도.';
comment on column public.v2_events.event_date is 'UTC 저장 (timestamptz). KST 입력은 클라이언트가 kstDateTimeLocalToIso로 변환 후 전달.';

-- status 컬럼은 view(v2_events_with_status)에서 계산. 테이블에는 저장 안 함.

-- public.v2_event_participants: 참여 관계 (composite key)
create table public.v2_event_participants (
  event_id uuid not null references public.v2_events(id) on delete cascade,
  user_id uuid not null references public.v2_users(id) on delete cascade,
  joined_at timestamptz default now() not null,
  primary key (event_id, user_id)
);

-- 인덱스 (이름에도 v2_ prefix — 같은 schema 내 unique 필요)
create index v2_events_invite_code_idx on public.v2_events(invite_code);
create index v2_events_created_by_idx on public.v2_events(created_by);
create index v2_events_event_date_idx on public.v2_events(event_date);
create index v2_event_participants_user_id_idx on public.v2_event_participants(user_id);

-- v1.0 public.handle_updated_at() 함수는 이미 존재 → 재사용 (정의 안 함).
-- updated_at 자동 갱신 트리거만 추가
create trigger v2_users_updated_at before update on public.v2_users
  for each row execute function public.handle_updated_at();

create trigger v2_events_updated_at before update on public.v2_events
  for each row execute function public.handle_updated_at();

-- auth.users INSERT 시 v2_users 자동 생성 (v1.0의 handle_new_user는 profiles 처리 — 병행 실행)
create or replace function public.v2_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.v2_users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_v2
  after insert on auth.users
  for each row execute function public.v2_handle_new_user();

-- RLS 활성화 (정책은 v2_create_rls_policies 마이그레이션에서)
alter table public.v2_users enable row level security;
alter table public.v2_events enable row level security;
alter table public.v2_event_participants enable row level security;
