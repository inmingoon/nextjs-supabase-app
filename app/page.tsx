import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-8 pb-20 md:pb-8">
        <section className="mx-auto max-w-2xl space-y-6 text-center">
          <h1 className="text-3xl font-bold">1회성 이벤트, 5초 만에 시작</h1>
          <p className="text-muted-foreground">
            모임·세미나·소규모 행사를 초대 링크 하나로 만들고 관리하세요.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild>
              <Link href="/events/new">이벤트 만들기</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/my-events">내 이벤트</Link>
            </Button>
          </div>
        </section>
      </main>
      <MobileBottomNav />
    </div>
  );
}
