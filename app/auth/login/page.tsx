import { Suspense } from "react";
import { LoginCard } from "@/components/auth/login-card";

/**
 * v2.0 로그인 페이지 — Google OAuth 단일 흐름.
 * `useSearchParams()`는 Cache Components 상 uncached이므로 client component를
 * Suspense로 감싸 prerender를 막지 않도록 한다.
 */
export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={null}>
          <LoginCard />
        </Suspense>
      </div>
    </div>
  );
}
