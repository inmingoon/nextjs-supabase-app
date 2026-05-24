import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default function MyEventsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold">내 이벤트</h1>
        <p className="mt-2 text-muted-foreground">
          (Phase 2 Task 004·005에서 주최자/참여자 뷰 분기, 더미 데이터로 리스트 UI)
        </p>
      </main>
      <MobileBottomNav />
    </div>
  );
}
