"use server";

/**
 * Phase 3 Task 6에서 본격 구현 예정 — 현재는 placeholder.
 * AdminUsersTable의 rowActions onConfirm이 import만 하고 호출은 가능.
 */
export async function adminDeleteUser({
  userId,
  reason,
}: {
  userId: string;
  reason: string;
}): Promise<void> {
  void userId;
  void reason;
  throw new Error("Not implemented yet — built in Phase 3 Task 6");
}
