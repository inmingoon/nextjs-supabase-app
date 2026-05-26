import { Suspense } from "react";
import { listAllEventsForAdmin } from "@/lib/queries/events";
import { listAllUsersForAdmin } from "@/lib/queries/users";
import { AdminEventsTable } from "@/components/admin/admin-events-table";
import type { User } from "@/types/user";

async function AdminEventsTableContainer() {
  const [events, users] = await Promise.all([
    listAllEventsForAdmin(),
    listAllUsersForAdmin(),
  ]);
  // 주최자 컬럼 렌더링용 id→User 매핑
  const creators: Record<string, User> = {};
  for (const u of users) creators[u.id] = u;

  return <AdminEventsTable events={events} creators={creators} />;
}

export default function AdminEventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">이벤트 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 이벤트를 검색·정렬·삭제할 수 있습니다.
        </p>
      </div>
      <Suspense
        fallback={<p className="text-muted-foreground">로딩...</p>}
      >
        <AdminEventsTableContainer />
      </Suspense>
    </div>
  );
}
