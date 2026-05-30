import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Service-role Supabase client — **server-only, secret**.
 * RLS 를 bypass 하므로 호출자가 권한 검증을 모두 책임진다.
 *
 * 사용 범위:
 * - lib/storage/event-covers.ts: cover upload/delete — Server Action 안에서만, path 가 우리 코드 통제.
 * - 그 외 admin 또는 storage 작업이 SSR client 로 안 풀리는 경우.
 *
 * 호출 규칙:
 * - **반드시** requireUser() 또는 requireAdmin() 으로 호출자 검증 이후에만 사용.
 * - **never** client component 에서 import. server-only secret 이라 번들에 들어가면 안 됨.
 * - Service-role key 가 환경 변수에 없으면 throw — silent anon-fallback 방지.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다 — .env.local 확인",
    );
  }
  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
