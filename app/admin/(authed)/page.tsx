import { Suspense } from "react";
import Link from "next/link";
import { Calendar, Users, CalendarCheck, CalendarX } from "lucide-react";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getRecentEvents } from "@/lib/queries/events";

/**
 * 4개 카운트 쿼리를 병렬 실행 — 전체 row를 fetch 하지 않고 count만 받는다.
 * head:true 로 row body 전송 생략 → 페이로드 최소화.
 * upcoming/completed는 v2_events_with_status view (status 계산 컬럼) 기준.
 */
async function getDashboardMetrics(): Promise<{
  totalEvents: number;
  upcomingCount: number;
  completedCount: number;
  totalUsers: number;
}> {
  const supabase = await createClient();
  const [totalEvents, upcomingCount, completedCount, totalUsers] =
    await Promise.all([
      supabase
        .from("v2_events")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("v2_events_with_status")
        .select("*", { count: "exact", head: true })
        .eq("status", "upcoming"),
      supabase
        .from("v2_events_with_status")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
      supabase
        .from("v2_users")
        .select("*", { count: "exact", head: true }),
    ]);

  return {
    totalEvents: totalEvents.count ?? 0,
    upcomingCount: upcomingCount.count ?? 0,
    completedCount: completedCount.count ?? 0,
    totalUsers: totalUsers.count ?? 0,
  };
}

async function DashboardStatsAndRecent() {
  const [metrics, recent] = await Promise.all([
    getDashboardMetrics(),
    getRecentEvents(5),
  ]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="전체 이벤트"
          value={metrics.totalEvents}
          icon={Calendar}
        />
        <AdminStatCard
          label="예정 이벤트"
          value={metrics.upcomingCount}
          icon={CalendarCheck}
          hint="upcoming"
        />
        <AdminStatCard
          label="종료 이벤트"
          value={metrics.completedCount}
          icon={CalendarX}
          hint="completed"
        />
        <AdminStatCard
          label="가입자"
          value={metrics.totalUsers}
          icon={Users}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">최근 이벤트</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/events">전체 보기</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>
    </>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          플랫폼 전체 지표와 최근 활동을 한눈에 확인하세요.
        </p>
      </div>
      <Suspense
        fallback={<p className="text-muted-foreground">로딩...</p>}
      >
        <DashboardStatsAndRecent />
      </Suspense>
    </div>
  );
}
