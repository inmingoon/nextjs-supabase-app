"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminDataTable, type Column } from "./admin-data-table";
import { AdminDeleteConfirm } from "./admin-delete-confirm";
import { Badge } from "@/components/ui/badge";
import { adminDeleteUser } from "@/lib/actions/admin-users";
import type { User } from "@/types/user";

const ROLE_LABEL: Record<User["role"], string> = {
  host: "주최자",
  participant: "참여자",
  admin: "관리자",
};

const COLUMNS: Column<User>[] = [
  {
    key: "user",
    header: "사용자",
    cell: (u) => {
      const name = u.fullName ?? u.email;
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={u.avatarUrl ?? undefined} alt={name} />
            <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      );
    },
  },
  {
    key: "role",
    header: "역할",
    cell: (u) => <Badge variant="outline">{ROLE_LABEL[u.role]}</Badge>,
  },
  {
    key: "createdAt",
    header: "가입일",
    cell: (u) => (
      <span className="text-sm text-muted-foreground">
        {u.createdAt.slice(0, 10)}
      </span>
    ),
  },
];

const SEARCH_KEY = (u: User) => `${u.fullName ?? ""} ${u.email}`;
const GET_ROW_ID = (u: User) => u.id;

/**
 * Phase 2의 admin/users page client 로직을 분리.
 * page는 server 컴포넌트로 환원, 이 컴포넌트는 검색·정렬 state만 담당.
 */
export function AdminUsersTable({ users }: { users: User[] }) {
  return (
    <AdminDataTable<User>
      items={users}
      columns={COLUMNS}
      searchKey={SEARCH_KEY}
      getRowId={GET_ROW_ID}
      searchPlaceholder="이름 또는 이메일 검색..."
      rowActions={(u) => (
        <AdminDeleteConfirm
          itemLabel={u.fullName ?? u.email}
          resourceType="사용자"
          onConfirm={async (reason) => {
            await adminDeleteUser({ userId: u.id, reason });
          }}
        />
      )}
    />
  );
}
