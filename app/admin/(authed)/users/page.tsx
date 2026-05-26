import { Suspense } from "react";
import { listAllUsersForAdmin } from "@/lib/queries/users";
import { AdminUsersTable } from "@/components/admin/admin-users-table";

async function AdminUsersTableContainer() {
  const users = await listAllUsersForAdmin();
  return <AdminUsersTable users={users} />;
}

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">사용자 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 사용자를 검색·필터·삭제할 수 있습니다.
        </p>
      </div>
      <Suspense
        fallback={<p className="text-muted-foreground">로딩...</p>}
      >
        <AdminUsersTableContainer />
      </Suspense>
    </div>
  );
}
