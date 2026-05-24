import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CreateEventForm } from "./create-event-form";

export const metadata = {
  title: "새 모임 만들기",
};

async function NewEventContent({ groupId }: { groupId: string }) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) {
    redirect(`/auth/login?next=/groups/${groupId}/events/new`);
  }

  // 그룹 owner 검증 (RLS가 비멤버에게는 0 row 돌려주므로 단순 .eq 비교)
  const { data: group } = await supabase
    .from("groups")
    .select("id, owner_id, name")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) notFound();
  if (group.owner_id !== userId) {
    // 비-owner는 그룹 페이지로 redirect (V7 시나리오)
    redirect(`/groups/${groupId}`);
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">새 모임 만들기</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        그룹 &quot;{group.name}&quot;의 새 회차를 만듭니다. 만든 뒤 회차 URL을 단톡방에 공유하세요.
      </p>
      <CreateEventForm groupId={groupId} />
    </>
  );
}

export default async function NewEventPage(props: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await props.params;
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <Suspense fallback={null}>
        <NewEventContent groupId={groupId} />
      </Suspense>
    </main>
  );
}
