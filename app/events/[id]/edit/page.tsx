import { Suspense } from "react";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

async function EditEventContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="flex-1 px-4 py-6 pb-20">
      <h1 className="text-2xl font-bold">이벤트 수정</h1>
      <p className="mt-2 text-muted-foreground">ID: {id}</p>
      <p className="mt-2 text-muted-foreground">
        (Phase 2 Task 004에서 주최자만 접근, 폼 구현)
      </p>
    </main>
  );
}

export default function EditEventPage({
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
        <EditEventContent params={params} />
      </Suspense>
      <MobileBottomNav />
    </div>
  );
}
