import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import type { Event } from "@/types/event";

const DUMMY_EVENTS: Event[] = []; // Phase 2 Task 004에서 채움

export default function MyEventsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold">내 이벤트</h1>
        <p className="mt-2 text-muted-foreground">
          (Phase 2 Task 004·005에서 주최자/참여자 뷰 분기, 더미 데이터로 리스트 UI)
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          현재 더미 이벤트: {DUMMY_EVENTS.length}건
        </p>
      </main>
      <MobileBottomNav />
    </div>
  );
}
