"use server";

/**
 * Phase 3 Task 6에서 본격 구현 예정 — 현재는 placeholder.
 * AdminEventsTable의 rowActions onConfirm이 import만 하고 호출은 가능.
 */
export async function adminDeleteEvent({
  eventId,
  reason,
}: {
  eventId: string;
  reason: string;
}): Promise<void> {
  // Task 6 구현 전까지 명시적으로 throw — 실제 호출 시 즉시 인지 가능.
  void eventId;
  void reason;
  throw new Error("Not implemented yet — built in Phase 3 Task 6");
}
