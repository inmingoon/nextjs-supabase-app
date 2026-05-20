import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트를 생성한다.
 * Database 제네릭으로 profiles 등 테이블 쿼리가 타입 안전해진다.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
