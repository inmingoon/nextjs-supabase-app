import type { User, UserRole } from "@/types/user";

/**
 * Phase 2 더미 사용자 — Phase 3에서 Supabase fetch로 교체 예정.
 * 호스트 2 · 참여자 2 · 관리자 1.
 */
export const DUMMY_USERS: User[] = [
  {
    id: "u-001",
    email: "host1@example.com",
    fullName: "김호스트",
    avatarUrl: null,
    role: "host",
    createdAt: "2026-01-10T00:00:00.000Z",
  },
  {
    id: "u-002",
    email: "host2@example.com",
    fullName: "이호스트",
    avatarUrl: null,
    role: "host",
    createdAt: "2026-02-15T00:00:00.000Z",
  },
  {
    id: "u-003",
    email: "participant1@example.com",
    fullName: "박참가",
    avatarUrl: null,
    role: "participant",
    createdAt: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "u-004",
    email: "participant2@example.com",
    fullName: "최참가",
    avatarUrl: null,
    role: "participant",
    createdAt: "2026-03-05T00:00:00.000Z",
  },
  {
    id: "u-005",
    email: "admin@example.com",
    fullName: "관리자",
    avatarUrl: null,
    role: "admin",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

/**
 * 현재 로그인된 더미 사용자 (host1) — Phase 3에서 실제 세션으로 교체.
 */
export const CURRENT_DUMMY_USER: User = DUMMY_USERS[0];

/** id로 더미 사용자 조회 */
export function getUserById(id: string): User | null {
  return DUMMY_USERS.find((u) => u.id === id) ?? null;
}

/** role로 더미 사용자 필터 */
export function getUsersByRole(role: UserRole): User[] {
  return DUMMY_USERS.filter((u) => u.role === role);
}
