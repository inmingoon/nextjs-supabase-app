import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CopyInviteLinkButton } from "@/components/copy-invite-link-button";

/**
 * 그룹 상세 실제 콘텐츠 — PPR 환경에서 async 컴포넌트로 분리.
 * 인증·권한 검증과 데이터 fetching을 이 컴포넌트가 모두 담당.
 */
async function GroupDetailContent({ groupId }: { groupId: string }) {
  const supabase = await createClient();

  // 인증 검증
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) {
    redirect(`/auth/login?next=/groups/${groupId}`);
  }

  // 그룹 조회 — RLS가 비멤버에게 0 row 반환하므로 권한 검증도 겸함
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, owner_id, invite_token")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) notFound();

  // 멤버 수 조회
  const { count: memberCount } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);

  const isOwner = authData.claims.sub === group.owner_id;

  // 초대 URL 생성
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const inviteUrl = `${proto}://${host}/invite/${group.invite_token}`;

  return (
    <>
      <header className="mb-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{group.name}</h1>
            {group.description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {group.description}
              </p>
            ) : null}
          </div>
          {isOwner ? <CopyInviteLinkButton url={inviteUrl} /> : null}
        </div>
        <div className="text-sm text-muted-foreground">
          멤버 {memberCount ?? 0}명
        </div>
      </header>

      <section className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        다음 단계(Phase 2)에서 다가오는 회차·멤버 목록·출석률이 이 자리에 채워집니다.
      </section>
    </>
  );
}

export default async function GroupDetailPage(props: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await props.params;

  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <Suspense>
        <GroupDetailContent groupId={groupId} />
      </Suspense>
    </main>
  );
}
