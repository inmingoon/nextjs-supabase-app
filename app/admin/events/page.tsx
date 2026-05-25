"use client";

import Link from "next/link";
import { AdminDataTable, type Column } from "@/components/admin/admin-data-table";
import { AdminDeleteConfirm } from "@/components/admin/admin-delete-confirm";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { formatKstDateShort } from "@/lib/datetime";
import { DUMMY_EVENTS } from "@/lib/dummy/events";
import { getUserById } from "@/lib/dummy/users";
import type { Event } from "@/types/event";

const COLUMNS: Column<Event>[] = [
  {
    key: "title",
    header: "제목",
    cell: (e) => (
      <Link href={`/events/${e.id}`} className="font-medium hover:underline">
        {e.title}
      </Link>
    ),
  },
  {
    key: "status",
    header: "상태",
    cell: (e) => <EventStatusBadge status={e.status} />,
  },
  {
    key: "eventDate",
    header: "일시 (KST)",
    cell: (e) => <span className="text-sm text-muted-foreground">{formatKstDateShort(e.eventDate)}</span>,
  },
  {
    key: "location",
    header: "장소",
    cell: (e) => <span className="text-sm">{e.location}</span>,
  },
  {
    key: "createdBy",
    header: "주최자",
    cell: (e) => {
      const u = getUserById(e.createdBy);
      return <span className="text-sm">{u?.fullName ?? "알 수 없음"}</span>;
    },
  },
];

const SEARCH_KEY = (e: Event) => `${e.title} ${e.location}`;
const GET_ROW_ID = (e: Event) => e.id;

export default function AdminEventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">이벤트 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 이벤트를 검색·정렬·삭제할 수 있습니다.
        </p>
      </div>

      <AdminDataTable<Event>
        items={DUMMY_EVENTS}
        columns={COLUMNS}
        searchKey={SEARCH_KEY}
        getRowId={GET_ROW_ID}
        searchPlaceholder="제목 또는 장소 검색..."
        rowActions={(e) => (
          <AdminDeleteConfirm
            itemLabel={e.title}
            resourceType="이벤트"
            onConfirm={(reason) => console.log("[Phase 2 dummy] delete event", e.id, { reason })}
          />
        )}
      />
    </div>
  );
}
