-- =============================================================================
-- v2.0 Phase 3 Task 007 — dev seed data (Phase 2 lib/dummy 일관성 유지)
-- production 마이그레이션에는 포함 안 함 (파일 prefix '_seed_'로 분기 검토)
-- =============================================================================

-- 주의: auth.users 직접 INSERT는 dev에서만 권장. production에서는 OAuth 가입을 거쳐 생성.
-- 본 시드는 admin 차트 다양성 + 학습 화면 데모 용도.

-- ============================ 시드 사용자 (5명) ============================
-- 실제 auth.users 가입이 어려운 dev 환경 — Supabase Dashboard SQL Editor에서 수동 INSERT
-- 또는 admin API로 생성 후 본 마이그레이션의 public.users INSERT 부분만 실행

-- public.users INSERT (auth.users.id는 같은 값으로 미리 생성 가정)
-- dev에서 빠른 셋업: Supabase Dashboard에서 5명 가입 후 ID를 아래에 대입

-- 본 마이그레이션은 placeholder. 실제 dev 시 사용자가 가입한 ID로 SQL Editor에서 수동 INSERT.
-- 그러므로 본 파일은 '템플릿' 역할이고, controller가 실행 시 사용자에게 ID 매핑을 받아 작성한다.

-- 예시 (사용자가 가입 후 SQL Editor에서):
-- insert into public.events (id, title, description, event_date, location, invite_code, created_by) values
--   (gen_random_uuid(), 'Next.js 16 Cache Components 실습 모임', 'Cache Components와 Suspense 패턴을 실습하며 토론합니다.',
--    now() + interval '7 days', '강남역 모임공간 A호실',
--    encode(gen_random_bytes(32), 'base64'), '<host1-uuid>');
-- ...

-- 본 plan의 0006 마이그레이션은 위 패턴을 8개 이벤트 + 14 참여 관계로 확장한 SQL을 작성한다.
-- 정확한 UUID는 dev 환경 의존이므로 plan 작성 시 placeholder로 두고, 실행 시 controller가 채워 commit.

-- Phase 2 lib/dummy/events.ts 데이터와 동일 구조 (e-001~e-010, 6 upcoming / 1 ongoing / 3 completed).
-- 정확한 SQL은 Task 1 Step 7 실행 시점에 사용자 가입 ID를 받아 controller가 작성.
