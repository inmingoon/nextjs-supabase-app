import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CreateGroupForm } from "./create-group-form";

export const metadata = {
  title: "새 그룹 만들기",
};

async function AuthGuardedContent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/auth/login?next=/groups/new");
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">새 그룹 만들기</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        그룹을 만든 뒤 초대 링크를 단톡방에 공유해 멤버를 모으세요.
      </p>
      <CreateGroupForm />
    </>
  );
}

export default function NewGroupPage() {
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <Suspense>
        <AuthGuardedContent />
      </Suspense>
    </main>
  );
}
