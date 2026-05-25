"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AdminSearchBar } from "./admin-search-bar";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Column<T> = {
  key: string;
  header: string;
  cell: (item: T) => React.ReactNode;
};

type Props<T> = {
  items: T[];
  columns: Column<T>[];
  searchKey: (item: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  rowActions?: (item: T) => React.ReactNode;
};

export function AdminDataTable<T>({
  items,
  columns,
  searchKey,
  searchPlaceholder,
  pageSize = 10,
  rowActions,
}: Props<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => searchKey(item).toLowerCase().includes(q));
  }, [items, search, searchKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  return (
    <div className="space-y-4">
      <AdminSearchBar
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder={searchPlaceholder}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key}>{c.header}</TableHead>
              ))}
              {rowActions ? <TableHead className="w-12 text-right">액션</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (rowActions ? 1 : 0)}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  검색 결과가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              visible.map((item, idx) => (
                <TableRow key={idx}>
                  {columns.map((c) => (
                    <TableCell key={c.key}>{c.cell(item)}</TableCell>
                  ))}
                  {rowActions ? (
                    <TableCell className="text-right">{rowActions(item)}</TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          총 {filtered.length}건 · {currentPage} / {totalPages} 페이지
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
