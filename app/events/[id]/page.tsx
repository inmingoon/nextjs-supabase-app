import { Suspense } from "react";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

async function EventDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="flex-1 px-4 py-6 pb-20">
      <h1 className="text-2xl font-bold">이벤트 상세</h1>
      <p className="mt-2 text-muted-foreground">ID: {id}</p>
      <p className="mt-2 text-muted-foreground">
        (Phase 2 Task 004·005에서 주최자/참여자 분기 UI 구현)
      </p>
    </main>
  );
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense
        fallback={
          <main className="flex-1 px-4 py-6 pb-20">
            <p className="text-muted-foreground">로딩...</p>
          </main>
        }
      >
        <EventDetailContent params={params} />
      </Suspense>
      <MobileBottomNav />
    </div>
  );
}
