import { Suspense } from "react";
import {
  EventTrendChart,
  type TrendPoint,
} from "@/components/charts/event-trend-chart";
import {
  StatusPieChart,
  type StatusSlice,
} from "@/components/charts/status-pie-chart";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EventStatus } from "@/types/event";

/**
 * 월별 이벤트 생성 트렌드 — v2_events.created_at 컬럼만 select.
 * 전체 row를 가져오지 않아 페이로드 절감 + RLS 우회 위험 무관 (admin 라우트).
 */
async function buildTrend(): Promise<TrendPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v2_events")
    .select("created_at")
    .order("created_at", { ascending: true });

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.created_at) continue;
    const ym = row.created_at.slice(0, 7); // "2026-05"
    counts.set(ym, (counts.get(ym) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

/**
 * 상태 분포 — v2_events_with_status.status 컬럼만 select.
 * view에서 status가 계산되므로 client 집계 시 일관성 보장.
 */
async function buildStatusSlices(): Promise<StatusSlice[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v2_events_with_status")
    .select("status");

  const counts: Record<EventStatus, number> = {
    upcoming: 0,
    ongoing: 0,
    completed: 0,
  };
  for (const row of data ?? []) {
    const s = row.status as EventStatus | null;
    if (s && s in counts) counts[s]++;
  }
  return [
    { status: "upcoming", count: counts.upcoming },
    { status: "ongoing", count: counts.ongoing },
    { status: "completed", count: counts.completed },
  ];
}

async function AnalyticsCharts() {
  const [trend, slices] = await Promise.all([
    buildTrend(),
    buildStatusSlices(),
  ]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>월별 이벤트 생성 수</CardTitle>
        </CardHeader>
        <CardContent>
          <EventTrendChart data={trend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>이벤트 상태 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusPieChart data={slices} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">통계 분석</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          이벤트 추세와 상태 분포를 확인하세요.
        </p>
      </div>
      <Suspense
        fallback={<p className="text-muted-foreground">차트 로딩...</p>}
      >
        <AnalyticsCharts />
      </Suspense>
    </div>
  );
}
