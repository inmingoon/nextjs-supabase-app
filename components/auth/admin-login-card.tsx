"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
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
 * v2.0 관리자 로그인 카드 — Google OAuth + reason=not_admin 표시.
 * 콜백 후 항상 `/admin`으로 이동 (admin layout이 다시 권한 검증).
 */
export function AdminLoginCard() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/admin`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>관리자 로그인</CardTitle>
        <CardDescription>관리자 권한 계정만 접근 가능합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {reason === "not_admin" ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <p className="text-destructive">관리자 권한이 없습니다.</p>
          </div>
        ) : null}
        <Button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full"
        >
          {loading ? "이동 중..." : "Google로 관리자 로그인"}
        </Button>
      </CardContent>
    </Card>
  );
}
