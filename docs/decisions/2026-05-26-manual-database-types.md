# lib/database.types.ts 수동 유지보수

Date: 2026-05-26
Phase: 3 / Task 2
Decision: `lib/database.types.ts`의 v2_* 타입을 Supabase CLI `gen types` 없이 migration SQL에서 직접 옮겨 작성한다.

## 배경

- Phase 3 Task 2 시점에 Supabase CLI 사용 불가:
  - Docker Desktop 미설치 → `supabase start` 차단
  - `supabase login` 미수행 → access token 없음
  - `npx supabase gen types --linked` 호출 시 인증 실패
- v2.0 마이그레이션은 Dashboard SQL Editor로 수동 적용 → CLI link 가정도 깨짐.

## 적용 방식

- v1.0 generated 타입은 기존 출력을 그대로 유지 (`lib/database.types.ts` 상단부).
- v2.0 신규 객체 타입은 migration SQL을 1:1 옮겨 작성:
  - Tables: `v2_users`, `v2_events`, `v2_event_participants`, `v2_admin_users`
  - View: `v2_events_with_status`
  - Functions: `v2_get_event_by_invite_code`, `v2_is_admin`
  - 컬럼명·nullability·FK 모두 `supabase/migrations/20260525000000_v2_* ~ 20260525000006_v2_*.sql` 기준.

## 위험과 mitigation

- **drift 위험**: 향후 v2_* 컬럼 추가·이름 변경 시 타입과 실제 DB 스키마가 어긋날 수 있음. tsc는 통과하지만 runtime에서 실패.
- **대응**:
  1. 새 v2_* migration이 추가될 때마다 해당 타입 블록을 동일 패턴으로 보강한다.
  2. `supabase login`이 가능해지는 시점에 CLI 재생성으로 일괄 sanity check:
     ```bash
     supabase login
     npx supabase link --project-ref <project-ref>
     npx supabase gen types typescript --linked --schema public > lib/database.types.ts
     ```
     생성 결과와 현재 파일을 diff하여 drift 없음 확인.
- Phase 3 Task 8 (회귀 검증) 단계에서 CLI 재생성을 시도하고 diff 결과를 commit으로 남긴다.

## 관련

- 마이그레이션: `supabase/migrations/20260525000000_v2_*` ~ `20260525000006_v2_*.sql`
- Plan: `docs/superpowers/plans/2026-05-25-event-platform-v2-phase3.md` (Task 2 Step 2)
- Code review: 2026-05-26 Phase 3 Task 2 review, Important #5
