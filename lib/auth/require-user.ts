import { createClient } from "@/lib/supabase/server";

/**
 * Server Action 또는 server component에서 로그인 사용자가 필요할 때 호출.
 * 비로그인이면 throw — Server Action 호출자(client)의 try/catch에서 toast로 노출.
 *
 * 왜 RLS만으로 부족한가:
 * Supabase UPDATE/DELETE는 RLS로 필터된 row가 0개면 error를 던지지 않고 count=0으로 silent 반환.
 * 명시적 require-user 게이트가 있으면 비로그인 시점에 즉시 실패하고, redirect() 후의
 * "권한 없음을 모르는" UX를 막을 수 있다 (defense-in-depth).
 */
export async function requireUser(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");
  return { userId: user.id };
}
