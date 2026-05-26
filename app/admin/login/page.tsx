import { Suspense } from "react";
import { AdminLoginCard } from "@/components/auth/admin-login-card";

/**
 * v2.0 관리자 로그인 페이지 — Google OAuth + not_admin reason 표시.
 * `useSearchParams()` Suspense 경계.
 */
export default function AdminLoginPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={null}>
          <AdminLoginCard />
        </Suspense>
      </div>
    </div>
  );
}
