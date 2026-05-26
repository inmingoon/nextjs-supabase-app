"use client";

import Link from "next/link";
import { AdminDataTable, type Column } from "./admin-data-table";
import { AdminDeleteConfirm } from "./admin-delete-confirm";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { formatKstDateShort } from "@/lib/datetime";
import { adminDeleteEvent } from "@/lib/actions/admin-events";
import type { Event } from "@/types/event";
import type { User } from "@/types/user";

const COLUMNS_BASE: Column<Event>[] = [
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
    cell: (e) => (
      <span className="text-sm text-muted-foreground">
        {formatKstDateShort(e.eventDate)}
      </span>
    ),
  },
  {
    key: "location",
    header: "장소",
    cell: (e) => <span className="text-sm">{e.location}</span>,
  },
];

const SEARCH_KEY = (e: Event) => `${e.title} ${e.location}`;
const GET_ROW_ID = (e: Event) => e.id;

/**
 * Phase 2의 admin/events page client 로직을 분리.
 * page는 server 컴포넌트로 환원, 이 컴포넌트는 검색·정렬 state만 담당.
 */
export function AdminEventsTable({
  events,
  creators,
}: {
  events: Event[];
  creators: Record<string, User>;
}) {
  const COLUMNS: Column<Event>[] = [
    ...COLUMNS_BASE,
    {
      key: "createdBy",
      header: "주최자",
      cell: (e) => {
        const u = creators[e.createdBy];
        return <span className="text-sm">{u?.fullName ?? "알 수 없음"}</span>;
      },
    },
  ];

  return (
    <AdminDataTable<Event>
      items={events}
      columns={COLUMNS}
      searchKey={SEARCH_KEY}
      getRowId={GET_ROW_ID}
      searchPlaceholder="제목 또는 장소 검색..."
      rowActions={(e) => (
        <AdminDeleteConfirm
          itemLabel={e.title}
          resourceType="이벤트"
          onConfirm={async (reason) => {
            await adminDeleteEvent({ eventId: e.id, reason });
          }}
        />
      )}
    />
  );
}
