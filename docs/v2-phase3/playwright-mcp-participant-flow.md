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
| 1b. "참여하기" → Google OAuth → joinEvent | TBD | participant1 계정으로 인증 후 검증 필요 |
| 2. 참여자 목록 (RLS RPC) | TBD | Task 3 v2_get_event_public_users — RLS 차단 시 모두 익명 |
| 3. my-events 참여한 탭 | TBD | |
| 4. 중복 참여 + Realtime | TBD | 23505 silent + Task 5 publication 적용 검증 |
