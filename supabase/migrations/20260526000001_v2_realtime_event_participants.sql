-- Phase 3 Task 5: v2_event_participants 를 supabase_realtime publication 에 등록.
-- postgres_changes Realtime 채널이 INSERT/DELETE 이벤트를 받으려면 publication 등록 필수.
-- 등록되지 않으면 EventParticipantsCount 의 채널은 영원히 0건 수신 → 실시간 카운트가
-- 갱신되지 않고 사용자에게는 stale count 가 그대로 노출되는 silent failure.
-- RLS 는 Realtime 에도 적용되므로 v2_event_participants_select 정책 (host/admin/같은
-- 이벤트 참여자) 이 그대로 작동 — 외부인은 다른 이벤트의 변화를 받지 못함.
alter publication supabase_realtime add table public.v2_event_participants;
