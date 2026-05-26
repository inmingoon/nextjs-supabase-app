import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * admin 라우트 진입 시 첫 줄에서 호출.
 * 비로그인 → /admin/login, admin 아님 → /admin/login?reason=not_admin redirect.
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { count } = await supabase
    .from("v2_admin_users")
    .select("*", { count: "exact", head: true })
    .eq("id", user.id);

  if (!count || count === 0) {
    redirect("/admin/login?reason=not_admin");
  }

  return { userId: user.id };
}
