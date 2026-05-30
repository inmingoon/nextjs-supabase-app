# Phase 3 Task 7 — 관리자 플로우 Playwright MCP 시나리오

dev server: `http://localhost:3000`
사전 조건: `inmingoon@gmail.com` admin 부여 완료 (Task 1 0006 마이그레이션 적용 후). host1/participant1 계정도 가입돼 있어야 함.

## 시나리오 1: admin 로그인 + 대시보드 count 정확성

1. `mcp__playwright__browser_navigate http://localhost:3000/admin`
2. Expected: middleware/(authed) layout이 `requireAdmin` 호출 → 비로그인 → `/admin/login` redirect
3. "Google로 관리자 로그인" 클릭 → `inmingoon@gmail.com`
4. callback 후 `/admin` 도착
5. Expected: **AdminStatCard 4개** 모두 실데이터:
   - 전체 이벤트 (v2_events count)
   - 예정 이벤트 (v2_events_with_status WHERE status='upcoming')
   - 종료 이벤트 (v2_events_with_status WHERE status='completed')
   - 가입자 (v2_users count)
6. 시드 데이터로 정확성 확인 (예: 3 upcoming + 2 ongoing + 5 completed → total 10, upcoming 3, completed 5)
7. 최근 이벤트 5건 EventCard 표시

## 시나리오 2: 이벤트 관리 + 검색

1. `/admin/events` 진입
2. Expected: AdminDataTable에 모든 이벤트 row 표시
3. 검색창에 "Cache" 입력 → 200ms debounce 후 필터링
4. Expected: 제목/장소에 "Cache" 포함된 row만 표시

## 시나리오 3: 이벤트 삭제 (cascade orphan blob 관찰)

1. `/admin/events` 한 row의 휴지통 클릭 → AdminDeleteConfirm Dialog 노출
2. 사유 입력 → "삭제" 버튼
3. Expected:
   - v2_events row DELETE (cascade로 v2_event_participants도)
   - storage cover 파일 제거 (`deleteEventCover` 먼저 호출)
   - table revalidate (count card도 동시 갱신)
4. Server Action error 시 "이벤트 삭제에 실패했습니다" toast (PG error sanitize 검증)

## 시나리오 4: 비-admin 접근 거부

1. participant1 계정으로 `/admin` 직접 진입
2. Expected: `requireAdmin()`이 `/admin/login?reason=not_admin` redirect
3. 로그인 페이지에 "관리자 권한이 없습니다" 메시지 (Task 3 admin-login-card)

## 시나리오 5: 통계 차트

1. `/admin/analytics` 진입
2. Expected:
   - EventTrendChart (월별 이벤트 수) — `buildTrend` 좁은 SELECT
   - StatusPieChart (status 분포) — `buildStatusSlices` 좁은 SELECT
   - 다크모드 토글 시 색상 변경 (Phase 2.1 useTheme 분기)
3. 새 status (예: cancelled)가 view에 있다면 `console.warn`에서 Vercel 로그 확인

## 시나리오 6 (Task 6 review 권고): self-deletion guard

1. admin (`inmingoon@gmail.com`)으로 `/admin/users` 진입
2. 본인 row의 휴지통 클릭 → 사유 입력 → "삭제"
3. Expected: `adminDeleteUser`의 `adminId === userId` 가드 throw → "자기 자신을 삭제할 수 없습니다" toast
4. PG에 DELETE 발생하지 않음 + admin 세션 유지

## 시나리오 7 (Task 6 review 권고): 0-row error path

1. (개발자 도구 또는 fetch 직접 호출) 존재하지 않는 eventId/userId로 admin 액션 호출
2. Expected: `count: "exact"` 결과 0 → "이벤트를 찾을 수 없습니다" 또는 "사용자를 찾을 수 없습니다" throw
3. 동일 row 두 번 삭제 시도해도 동일 에러

## 시나리오 8 (Task 6 review 권고): cross-admin 삭제 (의도된 동작)

1. adminA가 adminB를 `/admin/users`에서 삭제 (테스트 환경에 admin 2명 필요)
2. Expected: 성공 (RLS admin-only이지만 self-guard만 차단)
3. adminB 재로그인 시 `/admin` → `requireAdmin` 실패 → `/admin/login?reason=not_admin`
4. cascade로 v2_events / v2_event_participants 정리 (cover blob은 미정리 — Task 8 추적)

## 결과 (실행 후 기록)

| 시나리오 | 결과 | 비고 |
| --- | --- | --- |
| 1. admin 로그인 + 대시보드 | ✅ requireAdmin SQL PASS | supabase MCP `set local request.jwt.claims = host1` 시뮬레이션 → `v2_admin_users` count = 1 (admin 통과). 데이터: total_events 9, upcoming 6, completed 3, total_users 2. UI 4 StatCard 렌더링은 사용자 confirmation 필요. **시나리오 진행 중 silent breakage #7 발견**: v2_is_admin 함수 stable+SET 충돌 (PG 0A000) — v2_get_event_by_invite_code 와 동일 패턴. fix migration `20260530000001` 적용. |
| 2. 이벤트 검색 | ⏳ UI only | 200ms debounce + 클라이언트 filter — 코드 정상이나 UX는 사용자 확인 |
| 3. 이벤트 삭제 + cover 정리 | ✅ 코드+FK PASS | `adminDeleteEvent` 흐름: requireAdmin → console.warn audit → deleteEventCover (silent fail OK) → count:exact delete → 0-row throw / PG error sanitize. cascade FK 직접 확인: v2_event_participants_event_id_fkey ON DELETE CASCADE. UI 휴지통 클릭 흐름은 사용자 confirmation 옵션. |
| 4. 비-admin 차단 | ✅ SQL PASS | bandnell JWT 시뮬레이션 → v2_admin_users count = 0. requireAdmin → `/admin/login?reason=not_admin` redirect 흐름. |
| 5. 통계 차트 + 다크모드 | ✅ 데이터 SQL PASS | buildStatusSlices 동등 query: upcoming 6 / completed 3 / ongoing 0. 시드 데이터에 ongoing 없음 — pie chart 렌더는 UI 확인. 다크모드 토글은 UI only. |
| 6. self-deletion guard | ✅ 코드 PASS | `adminDeleteUser` line 33-35: `if (adminId === userId) throw new Error("자기 자신을 삭제할 수 없습니다")` — spec 정확. |
| 7. 0-row error path | ✅ 코드 PASS | `adminDeleteUser` line 52-54 + `adminDeleteEvent` line 52-54 모두 `count === 0 → throw "사용자/이벤트를 찾을 수 없습니다"` — spec 정확. |
| 8. cross-admin 삭제 | ✅ 의도된 동작 PASS | `adminDeleteUser`에 self-guard 외 다른 admin 삭제 가드 없음 (spec 의도). cascade로 v2_events/v2_event_participants 정리. **cover blob orphan는 Task 8 추적 항목** — `adminDeleteEvent` 와 달리 `adminDeleteUser` 에서는 cover 정리 없이 cascade 만. |
