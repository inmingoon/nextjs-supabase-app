import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvitePreview } from "@/components/invite/invite-preview";
import { getEventByInviteCode } from "@/lib/queries/events";
import { formatKstDateLong } from "@/lib/datetime";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const event = await getEventByInviteCode(code);
  if (!event) {
    return { title: "초대장을 찾을 수 없습니다", robots: { index: false } };
  }
  const title = `${event.title} — 초대장`;
  const description =
    event.description ??
    `${formatKstDateLong(event.eventDate)} · ${event.location}`;
  const images = event.coverImageUrl ? [event.coverImageUrl] : undefined;
  return {
    title,
    description,
    // 초대코드는 비밀 — page-level noindex 로 검색 색인만 차단(robots.txt disallow 와 달리
    // unfurler 의 OG fetch 는 유지되어 공유 미리보기는 살아 있음).
    robots: { index: false, follow: false },
    openGraph: { title, description, images, type: "website" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

async function InviteContent({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const event = await getEventByInviteCode(code);
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
