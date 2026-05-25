import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { EventForm } from "@/components/events/event-form";

export default function NewEventPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold">이벤트 만들기</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          기본 정보를 입력하면 초대 링크가 자동 생성됩니다.
        </p>
        <div className="mt-6">
          <EventForm mode="create" />
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
