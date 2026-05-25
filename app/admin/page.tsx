import Link from "next/link";
import { Calendar, Users, CalendarCheck, CalendarX } from "lucide-react";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import { DUMMY_EVENTS, getRecentEvents } from "@/lib/dummy/events";
import { DUMMY_USERS } from "@/lib/dummy/users";

export default function AdminDashboardPage() {
  const totalEvents = DUMMY_EVENTS.length;
  const upcomingCount = DUMMY_EVENTS.filter((e) => e.status === "upcoming").length;
  const completedCount = DUMMY_EVENTS.filter((e) => e.status === "completed").length;
  const totalUsers = DUMMY_USERS.length;
  const recent = getRecentEvents(5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          플랫폼 전체 지표와 최근 활동을 한눈에 확인하세요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="전체 이벤트" value={totalEvents} icon={Calendar} />
        <AdminStatCard label="예정 이벤트" value={upcomingCount} icon={CalendarCheck} hint="upcoming" />
        <AdminStatCard label="종료 이벤트" value={completedCount} icon={CalendarX} hint="completed" />
        <AdminStatCard label="가입자" value={totalUsers} icon={Users} />
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
    </div>
  );
}
