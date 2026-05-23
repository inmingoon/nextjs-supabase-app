import Link from "next/link";
import { Suspense } from "react";
import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { Hero } from "@/components/hero";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ConnectSupabaseSteps } from "@/components/tutorial/connect-supabase-steps";
import { SignUpUserSteps } from "@/components/tutorial/sign-up-user-steps";
import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * 로그인 사용자의 그룹 목록을 렌더링하는 async 컴포넌트.
 * PPR 환경에서 getClaims()를 Suspense 경계 안으로 격리.
 */
async function MyGroupsSection() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return null;

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name, description)")
    .order("joined_at", { ascending: false });

  return (
    <section className="w-full max-w-3xl px-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">내 그룹</h2>
        <Button asChild>
          <Link href="/groups/new">+ 새 그룹 만들기</Link>
        </Button>
      </div>
      {!memberships || memberships.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          아직 가입한 그룹이 없습니다. 초대 링크를 받았다면 그 URL로 접속하세요.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {memberships.map((m) => {
            const g = Array.isArray(m.groups) ? m.groups[0] : m.groups;
            if (!g) return null;
            return (
              <Card key={g.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    <Link href={`/groups/${g.id}`} className="hover:underline">
                      {g.name}
                    </Link>
                  </CardTitle>
                </CardHeader>
                {g.description ? (
                  <CardContent className="text-sm text-muted-foreground">
                    {g.description}
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

/**
 * 인증 상태에 따라 로그인/비로그인 콘텐츠를 분기하는 async 컴포넌트.
 * PPR 환경에서 Suspense 경계 안에서만 await 사용.
 */
async function HomeContent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  if (isLoggedIn) {
    return <MyGroupsSection />;
  }

  return (
    <div className="flex-1 flex flex-col gap-10 max-w-5xl p-5">
      <Hero />
      <section className="flex-1 flex flex-col gap-6 px-4">
        <h2 className="font-medium text-xl mb-4">Next steps</h2>
        {hasEnvVars ? <SignUpUserSteps /> : <ConnectSupabaseSteps />}
      </section>
    </div>
  );
}

/** 홈 페이지 — 동기 컴포넌트. 인증/데이터 fetching은 Suspense 자식에서 처리. */
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-10 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"}>모임 관리</Link>
              <div className="flex items-center gap-2">
                <DeployButton />
              </div>
            </div>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>

        <Suspense fallback={null}>
          <HomeContent />
        </Suspense>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>모임 이벤트 관리 MVP</p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
