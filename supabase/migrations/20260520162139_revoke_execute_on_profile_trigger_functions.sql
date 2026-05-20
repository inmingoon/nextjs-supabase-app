-- 트리거 함수는 트리거 발화로만 실행되어야 하며 PostgREST RPC로 노출될 필요가 없다.
-- 함수 생성 시 PUBLIC에 자동 부여되는 EXECUTE 권한을 회수한다.
-- 트리거 발화는 EXECUTE 권한 검사를 거치지 않으므로 자동 생성/갱신은 정상 동작한다.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_updated_at() from public, anon, authenticated;
