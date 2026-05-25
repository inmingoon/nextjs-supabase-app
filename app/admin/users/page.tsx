"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminDataTable, type Column } from "@/components/admin/admin-data-table";
import { AdminDeleteConfirm } from "@/components/admin/admin-delete-confirm";
import { Badge } from "@/components/ui/badge";
import { DUMMY_USERS } from "@/lib/dummy/users";
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

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">사용자 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 사용자를 검색·필터·삭제할 수 있습니다.
        </p>
      </div>

      <AdminDataTable<User>
        items={DUMMY_USERS}
        columns={COLUMNS}
        searchKey={SEARCH_KEY}
        getRowId={GET_ROW_ID}
        searchPlaceholder="이름 또는 이메일 검색..."
        rowActions={(u) => (
          <AdminDeleteConfirm
            itemLabel={u.fullName ?? u.email}
            resourceType="사용자"
            onConfirm={(reason) => console.log("[Phase 2 dummy] delete user", u.id, { reason })}
          />
        )}
      />
    </div>
  );
}
