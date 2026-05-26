"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * v2.0 일반 사용자 로그인 카드 — Google OAuth 단일 진입점.
 * `redirect` 쿼리 파라미터가 있으면 콜백 후 해당 경로로 이동.
 */
export function LoginCard() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback${
      redirect ? `?next=${encodeURIComponent(redirect)}` : ""
    }`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>이벤트에 참여하기</CardTitle>
        <CardDescription>Google 계정으로 빠르게 시작하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full"
        >
          {loading ? "이동 중..." : "Google로 계속하기"}
        </Button>
      </CardContent>
    </Card>
  );
}
