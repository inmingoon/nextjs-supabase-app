"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * 관리자 전용 사용자 삭제 — Phase 3 Task 6.
 *
 * 3중 가드 + 자기 자신 삭제 차단:
 * - requireAdmin → 비-admin 즉시 redirect.
 * - adminId === userId 인 경우 throw — 자기 자신 잠금 사고 방지.
 *
 * 의도된 동작 (의도해서 막지 않은 것):
 * - 다른 admin 삭제는 허용 — admin 권한 회수 의도 시 사용. RLS가 admin-only로
 *   제한하고 self-guard가 마지막 admin 자가삭제만 차단. 운영상 "마지막 admin이
 *   누구냐" 추적은 v2.x audit_logs 도입 후. v2.0 internal admin 전제 하 허용.
 *
 * count:"exact" + 0-row 검증으로 silent success 차단.
 * v2_users 삭제는 FK cascade로 v2_events / v2_event_participants 정리.
 * (cascade로 사라진 events 의 cover blob 정리는 Task 8 추적 — 본 action 은 행 삭제만.)
 *
 * 감사 로그: console.warn (Vercel 로그 도달). production audit_logs는 v2.x.
 */
export async function adminDeleteUser({
  userId,
  reason,
}: {
  userId: string;
  reason: string;
}): Promise<void> {
  const { userId: adminId } = await requireAdmin();
  if (adminId === userId) {
    throw new Error("자기 자신을 삭제할 수 없습니다");
  }

  const supabase = await createClient();
  console.warn(`[admin] delete user ${userId}, reason: ${reason || "(none)"}`);

  const { error, count } = await supabase
    .from("v2_users")
    .delete({ count: "exact" })
    .eq("id", userId);

  if (error) {
    console.error("[adminDeleteUser] DB failure", {
      userId,
      code: error.code,
    });
    throw new Error("사용자 삭제에 실패했습니다");
  }
  if (count === 0) {
    throw new Error("사용자를 찾을 수 없습니다");
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}
