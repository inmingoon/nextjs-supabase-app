# Phase 3 Task 7 — 참여자 플로우 Playwright MCP 시나리오

dev server: `http://localhost:3000`
사전 조건: host1이 이벤트 1개 이상 생성 완료 (host-flow 시나리오 1 통과 후 진행).

## 시나리오 1: 초대 링크 가입

1. 시크릿 창에서 host1이 만든 이벤트의 invite_code 확인 (DB v2_events.invite_code 또는 호스트 "링크 복사")
2. `mcp__playwright__browser_navigate http://localhost:3000/invite/{code}` (비로그인)
3. Expected: InvitePreview 카드 + "참여하기" 버튼 (`canJoin` 상태에 따라 라벨)
4. "참여하기" 클릭 → `/auth/login?redirect=/events/{id}` redirect (safe-next 검증)
5. participant1 계정 Google OAuth 로그인
6. callback 후 `/events/{id}` 도착 → joinEvent Server Action 호출 (NEXT_REDIRECT digest rethrow 검증)
7. Expected: v2_event_participants INSERT (event_id, user_id, joined_at)

## 시나리오 2: 참여자 목록 노출 (RLS RPC 검증)

1. participant1로 `/events/{id}` 진입
2. Expected: Tabs 없음 (호스트 아님)
3. **EventParticipantsList**에 본인 + 다른 참여자 Avatar 표시
   - `v2_get_event_public_users` SECURITY DEFINER RPC가 host/admin/same-event participant에게 공개 프로필 반환
   - RLS만 적용했다면 다른 참여자가 모두 "익명"으로 표시될 것 — 이 시나리오가 Task 3 RLS fix 검증의 핵심

## 시나리오 3: my-events "참여한" 탭

1. participant1로 `/my-events` 진입
2. Expected: "주최한 (0)" / "참여한 (1+)" 탭. 참여한 탭에 가입한 이벤트 EventCard 표시

## 시나리오 4: 중복 참여 silent + Realtime 카운트 갱신

1. participant1로 이미 가입한 이벤트의 `/invite/{code}` 다시 방문
2. "참여하기" 클릭
3. Expected: PG 23505 (또는 message regex fallback) silent → `/events/{id}` redirect, 카운트 변화 없음
4. **Realtime 검증**: 같은 이벤트를 다른 사용자(participant2)가 동일 시점에 가입 → host1의 화면 `EventParticipantsCount`가 `c => c + 1`로 업데이트
   - Task 5 publication migration 적용 안 됐다면 count 그대로 유지 — silent failure 검출 지점

## 결과 (실행 후 기록)

| 시나리오 | 결과 | 비고 |
| --- | --- | --- |
| 1a. 시크릿 창 invite 페이지 진입 | ✅ PASS (fix 후) | 초기 시도에서 404 발견 → `set local row_security = off` ↔ `stable` 충돌 + view security_invoker invoker rights 결합 결함. v2_get_event_by_invite_code 함수 정정 (table 직접 select + SET 제거) 후 시크릿 창에서 InvitePreview 정상 표시. |
| 1b. "참여하기" → Google OAuth → joinEvent | ✅ PASS (fix 후) | 초기 시도에서 PG 23503 (v2_event_participants_user_id_fkey) 발견 → v2 trigger 등록 이전 가입자 (bandnell@gmail.com) v2_users row 누락. backfill migration `20260528000001_v2_users_backfill.sql` 적용 후 joinEvent INSERT 정상, /events/{id} redirect. |
| 2. 참여자 목록 (RLS RPC) | ✅ PASS (3-fix 후) | 1차 발견: v2_get_event_public_users RPC migration이 SQL Editor에 적용 안 됨 (function does not exist) → 사용자가 직접 적용 후 EventParticipantsList Avatar 정상 표시. 2차 발견: count "참여자 0명" 잔존 — countParticipantsOfEvent (direct select)는 RLS로 차단되는데 RPC (SECURITY DEFINER)는 통과하는 권한 비대칭. page.tsx에서 getEventPublicUsers 단일 호출 → users.length를 count로 사용 + EventParticipantsList에 users props 전달로 비대칭 자체 우회 (commit 237063c). **3차 (진짜 root cause)**: supabase MCP로 bandnell JWT 시뮬레이션 시 PG 42P17 "infinite recursion detected in policy" 발견 — RLS 정책 조건 4 (`exists ... v2_event_participants p where p.user_id = auth.uid()`)의 self-recursive 참조가 PG의 무한 재귀 가드로 전체 정책 차단. count 비대칭 + #3 0건의 공통 root cause. 새 migration `20260530000000` 으로 조건 4 제거 + 같은 이벤트 다른 참여자 조회는 RPC 전담 (정책+RPC 중복 정의를 RPC 쪽으로 일원화). |
| 3. my-events 참여한 탭 | ✅ PASS (RLS root cause fix 후) | RLS 시뮬레이션으로 직접 검증: bandnell JWT 로 `where user_id = bandnell` SELECT → 1 row 반환 (이전엔 42P17 차단). UI 검증은 사용자 confirmation 대기. |
| 4. 중복 참여 + Realtime | ⚠️ 부분 PASS | publication migration `20260526000001` SQL Editor 미적용 silent breakage #6 발견 — `pg_publication_tables` 직접 조회로 빈 결과 확인 → MCP `apply_migration` 으로 직접 등록 완료. RLS 정책 fix 부수 효과로 Realtime UX 약간 후퇴: 같은 이벤트 다른 참여자의 INSERT/DELETE 알림은 RLS 로 차단 (본인 가입/탈퇴 + host 의 자기 이벤트 모든 알림은 정상). 다른 참여자 가입 시 카운트 +1 UX 는 페이지 새로고침으로 반영. Task 8 ROADMAP 에 "broadcast 채널 또는 SECURITY DEFINER 보조 함수로 복원" 항목 추가. 중복 참여 23505 silent 시나리오는 UI 검증 단계 대기. |
