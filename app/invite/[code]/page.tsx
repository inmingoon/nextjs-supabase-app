import { Suspense } from "react";

async function InviteContent({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <div className="w-full max-w-md space-y-4 text-center">
      <h1 className="text-2xl font-bold">이벤트 초대</h1>
      <p className="text-muted-foreground">코드: {code}</p>
      <p className="text-sm text-muted-foreground">
        (Phase 2 Task 005에서 이벤트 미리보기 + 참여 확인 UI 구현)
      </p>
    </div>
  );
}

export default function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md text-center text-muted-foreground">
            로딩...
          </div>
        }
      >
        <InviteContent params={params} />
      </Suspense>
    </div>
  );
}
