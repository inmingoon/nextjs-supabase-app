import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

/**
 * Admin 권한 가드 — async server component.
 * cookies() / supabase.auth.getUser()는 Cache Components 상 uncached이므로
 * `<Suspense>` 경계 안에서 호출해야 prerender가 막히지 않는다.
 * 권한 없으면 `requireAdmin`이 server-side redirect.
 */
async function AdminGuard() {
  await requireAdmin();
  return null;
}

/**
 * Admin route group `(authed)` 공통 layout — `<AdminGuard>`로 인증 검증.
 * `/admin/login`은 본 layout 바깥에 위치 — 무한 redirect 방지.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <Suspense fallback={null}>
        <AdminGuard />
      </Suspense>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="border-b bg-background px-6 py-4 md:px-8">
          <p className="text-xs text-muted-foreground">v2.0 관리자 콘솔</p>
        </header>
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
