import { createClient } from "@/lib/supabase/server";
import { getUserById } from "@/lib/queries/users";
import type { User } from "@/types/user";

/** 현재 로그인된 사용자 조회. 미로그인 또는 v2_users 미존재 시 null. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;
  return getUserById(authUser.id);
}
