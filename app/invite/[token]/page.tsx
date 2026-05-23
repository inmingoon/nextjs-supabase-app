import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { JoinGroupButton } from "./join-group-button";

export const metadata = {
  title: "그룹 초대",
};

/**
 * 초대 토큰으로 그룹 정보를 조회하고 4분기 UI를 렌더링하는 async 컴포넌트.
 * PPR 환경에서 최상위 await를 피하기 위해 분리.
 */
async function InviteContent({ token }: { token: string }) {
  const supabase = await createClient();

  const { data: groups } = await supabase.rpc("get_group_by_invite_token", { token });
  const group = groups?.[0] ?? null;

  // 분기 (a) 토큰 무효
  if (!group) {
    return (
      <div className="text-center">
        <h1 className="mb-2 text-xl font-semibold">유효하지 않은 초대 링크</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          링크가 잘못되었거나 만료되었습니다.
        </p>
        <Button asChild variant="outline">
          <Link href="/">홈으로</Link>
        </Button>
      </div>
    );
  }

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  // 분기 (b) 비로그인
  if (!userId) {
    return (
      <>
        <h1 className="mb-2 text-xl font-semibold">{group.name}</h1>
        {group.description ? (
          <p className="mb-6 text-sm text-muted-foreground">
            {group.description}
          </p>
        ) : null}
        <p className="mb-4 text-sm">
          그룹에 가입하려면 먼저 로그인하세요.
        </p>
        <Button asChild>
          <Link href={`/auth/login?next=/invite/${token}`}>
            Google로 로그인
          </Link>
        </Button>
      </>
    );
  }

  // 분기 (c) 이미 가입
  const { data: member } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (member) {
    redirect(`/groups/${group.id}`);
  }

  // 분기 (d) 로그인 + 미가입
  return (
    <>
      <h1 className="mb-2 text-xl font-semibold">{group.name}</h1>
      {group.description ? (
        <p className="mb-6 text-sm text-muted-foreground">
          {group.description}
        </p>
      ) : null}
      <p className="mb-4 text-sm">이 그룹에 가입하시겠습니까?</p>
      <JoinGroupButton token={token} groupName={group.name} />
    </>
  );
}

/**
 * params를 받아 InviteContent로 전달하는 async 래퍼.
 * params await도 Suspense 내부에서 수행되도록 별도 컴포넌트로 분리.
 */
async function InviteContentWrapper({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InviteContent token={token} />;
}

/** 초대 관문 페이지. PPR 패턴: 모든 async 작업을 Suspense로 래핑. */
export default function InvitePage(props: {
  params: Promise<{ token: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-md p-6">
      <Suspense>
        <InviteContentWrapper params={props.params} />
      </Suspense>
    </main>
  );
}
