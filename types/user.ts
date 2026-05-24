export type UserRole = "host" | "participant" | "admin";

export type User = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
};
