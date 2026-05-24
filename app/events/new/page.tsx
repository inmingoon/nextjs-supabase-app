import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default function NewEventPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold">이벤트 만들기</h1>
        <p className="mt-2 text-muted-foreground">
          (Phase 2 Task 004에서 React Hook Form + Zod로 폼 구현)
        </p>
      </main>
      <MobileBottomNav />
    </div>
  );
}
