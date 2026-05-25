import { Suspense } from "react";
import { notFound } from "next/navigation";
import { InvitePreview } from "@/components/invite/invite-preview";
import { getEventByInviteCode } from "@/lib/dummy/events";

async function InviteContent({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const event = getEventByInviteCode(code);
  if (!event) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <InvitePreview event={event} />
    </div>
  );
}

export default function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">로딩...</p>
        </div>
      }
    >
      <InviteContent params={params} />
    </Suspense>
  );
}
