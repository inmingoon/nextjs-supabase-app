import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold">프로필</h1>
        <p className="mt-2 text-muted-foreground">
          (Phase 2 Task 004에서 본인 정보 표시 + 수정 UI)
        </p>
      </main>
      <MobileBottomNav />
    </div>
  );
}
