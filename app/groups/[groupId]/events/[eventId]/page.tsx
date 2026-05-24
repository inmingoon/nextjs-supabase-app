import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatKst, isPast } from "@/lib/datetime";
import { RsvpButtons } from "./rsvp-buttons";

type RsvpStatus = "going" | "not_going" | "pending";

/**
 * 멤버 프로필에서 표시 이름을 반환한다.
 * full_name → username → fallback 순으로 시도.
 */
function nameOf(profile: { full_name: string | null; username: string | null } | null): string {
  if (!profile) return "(이름 미설정)";
  return profile.full_name?.trim() || profile.username?.trim() || "(이름 미설정)";
}

/**
 * 회차 상세 콘텐츠. PPR 적응을 위해 async 컴포넌트로 분리 후 Suspense로 감싼다.
 * participations + members를 Promise.all로 병렬 fetch.
 */
async function EventContent({
  groupId,
  eventId,
}: {
  groupId: string;
  eventId: string;
}) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) {
    redirect(`/auth/login?next=/groups/${groupId}/events/${eventId}`);
  }

  // 회차 조회 (RLS가 비멤버에게 0 row)
  const { data: event } = await supabase
    .from("events")
    .select("id, title, starts_at, location, memo, group_id")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) notFound();
  if (event.group_id !== groupId) notFound();

  const locked = isPast(event.starts_at);

  // 본 회차의 모든 응답 + 같은 그룹의 모든 멤버 동시 fetch
  const [{ data: participations }, { data: members }] = await Promise.all([
    supabase
      .from("event_participations")
      .select("user_id, status")
      .eq("event_id", eventId),
    supabase
      .from("group_members")
      .select("user_id, profiles(full_name, username)")
      .eq("group_id", groupId),
  ]);

  // status 매핑
  const statusByUserId = new Map<string, RsvpStatus>();
  for (const p of participations ?? []) {
    statusByUserId.set(p.user_id, p.status as RsvpStatus);
  }

  const myStatus = statusByUserId.get(userId) ?? "pending";

  // 응답 명단 3그룹 (응답 안 한 멤버는 pending으로 처리)
  const going: string[] = [];
  const notGoing: string[] = [];
  const pending: string[] = [];
  for (const m of members ?? []) {
    const status = statusByUserId.get(m.user_id) ?? "pending";
    const label = nameOf(m.profiles as unknown as { full_name: string | null; username: string | null } | null);
    if (status === "going") going.push(label);
    else if (status === "not_going") notGoing.push(label);
    else pending.push(label);
  }

  return (
    <>
      <Link
        href={`/groups/${groupId}`}
        className="mb-4 inline-block text-sm text-muted-foreground hover:underline"
      >
        ← 그룹으로
      </Link>

      <header className="mb-6 flex flex-col gap-2">
        {event.title ? (
          <h1 className="text-2xl font-semibold">{event.title}</h1>
        ) : null}
        <div className="text-base">📅 {formatKst(event.starts_at)} ~</div>
        <div className="text-base">📍 {event.location}</div>
        <div className="text-sm text-muted-foreground whitespace-pre-line">
          💬 {event.memo}
        </div>
      </header>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-medium">내 응답</h2>
        <RsvpButtons
          eventId={eventId}
          groupId={groupId}
          initialStatus={myStatus}
          locked={locked}
        />
      </section>

      <section className="grid gap-4">
        <div>
          <h3 className="mb-1 text-sm font-medium">
            ✅ 갈게요 <span className="text-muted-foreground">{going.length}명</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            {going.length === 0 ? "아직 없음" : going.join(", ")}
          </p>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-medium">
            ❌ 못 가요 <span className="text-muted-foreground">{notGoing.length}명</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            {notGoing.length === 0 ? "아직 없음" : notGoing.join(", ")}
          </p>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-medium">
            ❓ 미응답 <span className="text-muted-foreground">{pending.length}명</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            {pending.length === 0 ? "없음" : pending.join(", ")}
          </p>
        </div>
      </section>
    </>
  );
}

export default async function EventPage(props: {
  params: Promise<{ groupId: string; eventId: string }>;
}) {
  const { groupId, eventId } = await props.params;
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <Suspense fallback={null}>
        <EventContent groupId={groupId} eventId={eventId} />
      </Suspense>
    </main>
  );
}
