import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CopyInviteLinkButton } from "@/components/copy-invite-link-button";
import { formatKst, formatKstDate } from "@/lib/datetime";

/**
 * 그룹 상세 실제 콘텐츠 — PPR 환경에서 async 컴포넌트로 분리.
 * 다가오는 회차(최대 5개)·지난 회차(최대 10개)를 표시하고,
 * 그룹 오너에게 새 모임 만들기 버튼을 노출한다.
 */
async function GroupDetailContent({ groupId }: { groupId: string }) {
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, owner_id, invite_token")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) notFound();

  const { count: memberCount } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);

  const { data: claims } = await supabase.auth.getClaims();
  const isOwner = claims?.claims?.sub === group.owner_id;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const inviteUrl = `${proto}://${host}/invite/${group.invite_token}`;

  // 다가오는·지난 회차 분리
  const nowIso = new Date().toISOString();
  const { data: upcomingEvents } = await supabase
    .from("events")
    .select("id, title, starts_at, location")
    .eq("group_id", groupId)
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(5);

  const { data: pastEvents } = await supabase
    .from("events")
    .select("id, title, starts_at, location")
    .eq("group_id", groupId)
    .lt("starts_at", nowIso)
    .order("starts_at", { ascending: false })
    .limit(10);

  // 멤버 출석률 (view + 별도 profiles/members query를 client에서 join)
  // view는 nested FK select 불가라 분리.
  const [{ data: stats }, { data: membership }] = await Promise.all([
    supabase
      .from("group_attendance_stats")
      .select("user_id, attended, total_past")
      .eq("group_id", groupId),
    supabase
      .from("group_members")
      .select("user_id, joined_at, profiles(full_name, username)")
      .eq("group_id", groupId),
  ]);

  const statsByUserId = new Map<
    string,
    { attended: number; total_past: number }
  >();
  for (const s of stats ?? []) {
    if (s.user_id) {
      statsByUserId.set(s.user_id, {
        attended: s.attended ?? 0,
        total_past: s.total_past ?? 0,
      });
    }
  }

  // 출석률 내림차순 + 가입일 오름차순 정렬용 행 준비
  type Row = {
    userId: string;
    name: string;
    joinedAt: string;
    attended: number;
    totalPast: number;
  };

  const memberRows: Row[] = (membership ?? []).map((m) => {
    const s = statsByUserId.get(m.user_id) ?? { attended: 0, total_past: 0 };
    const profile = m.profiles as unknown as {
      full_name: string | null;
      username: string | null;
    } | null;
    const name =
      profile?.full_name?.trim() ||
      profile?.username?.trim() ||
      "(이름 미설정)";
    return {
      userId: m.user_id,
      name,
      joinedAt: m.joined_at,
      attended: s.attended,
      totalPast: s.total_past,
    };
  });

  memberRows.sort((a, b) => {
    // 1차: 출석률 내림차순 (total_past 0이면 마지막)
    const aRatio = a.totalPast > 0 ? a.attended / a.totalPast : -1;
    const bRatio = b.totalPast > 0 ? b.attended / b.totalPast : -1;
    if (aRatio !== bRatio) return bRatio - aRatio;
    // 2차: 가입일 오름차순 (오래된 멤버 우선)
    return a.joinedAt.localeCompare(b.joinedAt);
  });

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

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">다가오는 모임</h2>
          {isOwner ? (
            <Button asChild>
              <Link href={`/groups/${groupId}/events/new`}>+ 새 모임 만들기</Link>
            </Button>
          ) : null}
        </div>
        {!upcomingEvents || upcomingEvents.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            예정된 모임이 없습니다.
            {isOwner ? " '새 모임 만들기'로 회차를 추가하세요." : ""}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcomingEvents.map((e) => (
              <li
                key={e.id}
                className="rounded-md border p-4 hover:bg-accent transition-colors"
              >
                <Link
                  href={`/groups/${groupId}/events/${e.id}`}
                  className="block"
                >
                  <div className="font-medium">
                    {e.title ?? group.name} · {formatKst(e.starts_at)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    📍 {e.location}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">멤버 출석률</h2>
        {memberRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">멤버가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">이름</th>
                  <th className="px-3 py-2 font-medium text-right">출석/전체</th>
                  <th className="px-3 py-2 font-medium text-right">출석률</th>
                  <th className="px-3 py-2 font-medium text-right">가입일</th>
                </tr>
              </thead>
              <tbody>
                {memberRows.map((r) => {
                  const ratio =
                    r.totalPast > 0
                      ? Math.round((r.attended / r.totalPast) * 100)
                      : null;
                  return (
                    <tr key={r.userId} className="border-t">
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.attended}/{r.totalPast}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {ratio === null ? "—" : `${ratio}%`}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                        {formatKstDate(r.joinedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {pastEvents && pastEvents.length > 0 ? (
        <section>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              지난 회차 ({pastEvents.length}건)
            </summary>
            <ul className="mt-3 flex flex-col gap-2">
              {pastEvents.map((e) => (
                <li
                  key={e.id}
                  className="rounded-md border p-3 hover:bg-accent transition-colors"
                >
                  <Link
                    href={`/groups/${groupId}/events/${e.id}`}
                    className="block text-sm"
                  >
                    {formatKst(e.starts_at)} · 📍 {e.location}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </section>
      ) : null}
    </>
  );
}

export default async function GroupDetailPage(props: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await props.params;
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <Suspense fallback={null}>
        <GroupDetailContent groupId={groupId} />
      </Suspense>
    </main>
  );
}
