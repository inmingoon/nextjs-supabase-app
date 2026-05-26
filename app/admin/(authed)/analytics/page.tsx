import { Suspense } from "react";
import { EventTrendChart, type TrendPoint } from "@/components/charts/event-trend-chart";
import { StatusPieChart, type StatusSlice } from "@/components/charts/status-pie-chart";
import { listAllEventsForAdmin } from "@/lib/queries/events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Event } from "@/types/event";

/** 월별 이벤트 생성 트렌드 집계. */
function buildTrend(events: Event[]): TrendPoint[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    const ym = e.createdAt.slice(0, 7); // "2026-05"
    counts.set(ym, (counts.get(ym) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

/** 상태별 분포 집계. */
function buildStatusSlices(events: Event[]): StatusSlice[] {
  const counts = { upcoming: 0, ongoing: 0, completed: 0 };
  for (const e of events) counts[e.status]++;
  return [
    { status: "upcoming", count: counts.upcoming },
    { status: "ongoing", count: counts.ongoing },
    { status: "completed", count: counts.completed },
  ];
}

async function AnalyticsCharts() {
  const events = await listAllEventsForAdmin();
  const trend = buildTrend(events);
  const slices = buildStatusSlices(events);

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
