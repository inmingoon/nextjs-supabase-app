-- Phase 3 Task 7 시점 발견 — RLS 정책의 self-recursive 조건 4 가 PG 42P17
-- (infinite recursion detected in policy for relation "v2_event_participants") 를
-- 일으켜 모든 RLS-applied SELECT 가 silent failure (0 rows / count 0) 로 떨어짐.
--
-- 진단 경로:
-- - participant-flow #2: countParticipantsOfEvent 가 0 반환, RPC v2_get_event_public_users
--   는 1 row 반환 → 같은 SSR 컨텍스트에서 권한 비대칭. 1차 우회는 단일 RPC + props
--   패턴 (commit 237063c). 그러나 root cause 미확정.
-- - participant-flow #3 진입 전 RLS 시뮬레이션: `set local request.jwt.claims = ...`
--   + select → PG 42P17. 자기 테이블 self-recursive 조건 4 가 컴파일 시점에 차단.
--
-- 원본 정책 (마이그레이션 20260525000002):
-- v2_event_participants_select 의 4 OR 조건:
--   1. auth.uid() = user_id                                    (self)
--   2. host: e.created_by = auth.uid()
--   3. public.v2_is_admin(auth.uid())
--   4. exists (... v2_event_participants p where p.user_id = auth.uid())  ← self-recursive
--
-- 해결:
-- 조건 4 제거. self/host/admin 3 조건만 유지.
-- "같은 이벤트 다른 참여자 직접 SELECT" 권한은 본 정책이 제공하지 않고
-- SECURITY DEFINER RPC `v2_get_event_public_users` 가 동일 검증 (host or participant)
-- 으로 안전하게 제공. 정책과 RPC 가 중복 정의하던 권한 매트릭스에서 정책 쪽이
-- 무한 재귀로 깨진 상황 → RPC 만 남기는 게 올바른 디자인.
--
-- 보안 영향:
-- - 본인 row SELECT: 조건 1 통과 (변경 없음)
-- - host 가 자기 이벤트 참여자 SELECT: 조건 2 통과 (변경 없음)
-- - admin: 조건 3 통과 (변경 없음)
-- - 같은 이벤트 다른 참여자: 정책으론 차단 → RPC v2_get_event_public_users 호출 필요
-- - 외부인: 모든 조건 false → 빈 결과 (정상 차단)
--
-- Realtime 영향:
-- v2_event_participants 의 Realtime 채널 (Task 5 EventParticipantsCount) 도 RLS 가
-- 동일 적용. 새 정책에서 같은 이벤트 다른 참여자의 INSERT/DELETE 는 RLS 로 차단되어
-- client 가 수신 못 함. 본인 가입/탈퇴 알림 + host 가 자기 이벤트 모든 알림은 정상.
-- "다른 참여자 가입 시 카운트 +1" UX 는 페이지 새로고침으로 반영되도록 약간 후퇴.
-- 본 trade-off 는 Task 8 ROADMAP 에 명시 — 필요 시 SECURITY DEFINER 보조 함수 또는
-- broadcast 채널로 추후 복원.
--
-- 멱등: drop policy if exists + create policy. 재적용 안전.

drop policy if exists v2_event_participants_select on public.v2_event_participants;

create policy v2_event_participants_select on public.v2_event_participants
  for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.v2_events e
      where e.id = event_id and e.created_by = auth.uid()
    )
    or public.v2_is_admin(auth.uid())
  );

comment on policy v2_event_participants_select on public.v2_event_participants is
  '본인 row + 호스트 + admin. 같은 이벤트 다른 참여자 조회는 v2_get_event_public_users RPC 로만 가능 (정책 self-recursive 회피).';
