"use server";

import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * Phase 3 Task 6에서 본격 구현 예정 — 현재는 placeholder.
 * AdminUsersTable의 rowActions onConfirm이 import만 하고 호출은 가능.
 * defense-in-depth: stub 단계부터 requireAdmin 가드를 둬 Task 6 누락 위험 차단.
 */
export async function adminDeleteUser({
  userId,
  reason,
}: {
  userId: string;
  reason: string;
}): Promise<void> {
  await requireAdmin();
  void userId;
  void reason;
  throw new Error("Not implemented yet — built in Phase 3 Task 6");
}
