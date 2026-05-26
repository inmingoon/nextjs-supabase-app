import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

/** Google OAuth 콜백: 인증 코드를 세션으로 교환한 뒤 next 경로로 리다이렉트한다. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  // next는 사용자 제어 param이므로 same-origin 절대 경로로만 허용 (open-redirect 방지).
  const next = safeNextPath(searchParams.get("next"));
  // 사용자가 Google 동의를 거부했거나 provider 오류가 난 경우
  const oauthError =
    searchParams.get("error_description") ?? searchParams.get("error");

  if (oauthError) {
    redirect(`/auth/error?error=${encodeURIComponent(oauthError)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next);
    }
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/auth/error?error=${encodeURIComponent("인증 코드가 없습니다")}`);
}
