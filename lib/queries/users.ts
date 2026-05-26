import { createClient } from "@/lib/supabase/server";
import type { User } from "@/types/user";
import type { Database } from "@/lib/database.types";

type V2UserRow = Database["public"]["Tables"]["v2_users"]["Row"];

/** v2_users DB row → 외부 User 타입 변환. role은 admin/participant만 결정 (host는 컨텍스트 의존). */
function mapUserRow(row: V2UserRow, isAdmin: boolean): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: isAdmin ? "admin" : "participant",
    createdAt: row.created_at,
  };
}

/** id로 사용자 조회. v2_admin_users 존재 여부로 admin 판단. */
export async function getUserById(id: string): Promise<User | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v2_users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const { count } = await supabase
    .from("v2_admin_users")
    .select("*", { count: "exact", head: true })
    .eq("id", id);
  return mapUserRow(data, (count ?? 0) > 0);
}

/**
 * role로 사용자 필터. admin은 v2_admin_users join, 그 외는 v2_users 전체.
 * 현재 호출처 없음 — Phase 3 Task 6 admin 필터 UI에서 사용 예정.
 */
export async function getUsersByRole(role: User["role"]): Promise<User[]> {
  const supabase = await createClient();
  if (role === "admin") {
    // 두 개의 FK(id, granted_by)가 있어 PostgREST embed에 컬럼 hint 필요.
    const { data } = await supabase
      .from("v2_admin_users")
      .select("id, v2_users:v2_users!v2_admin_users_id_fkey!inner(*)")
      .order("granted_at", { ascending: false });
    return (data ?? []).map((r) =>
      mapUserRow(r.v2_users as unknown as V2UserRow, true),
    );
  }
  const { data } = await supabase
    .from("v2_users")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => mapUserRow(r, false));
}

/** 관리자 페이지용 전체 사용자 목록 — admin 여부 일괄 표시. */
export async function listAllUsersForAdmin(): Promise<User[]> {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("v2_users")
    .select("*")
    .order("created_at", { ascending: false });
  if (!users) return [];
  const { data: admins } = await supabase.from("v2_admin_users").select("id");
  const adminSet = new Set((admins ?? []).map((a) => a.id));
  return users.map((u) => mapUserRow(u, adminSet.has(u.id)));
}
