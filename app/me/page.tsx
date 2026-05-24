import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatKst } from "@/lib/datetime";

export const metadata = {
  title: "내 정보",
};

type EventRow = {
  id: string;
  title: string | null;
  starts_at: string;
  location: string;
  group_id: string;
};

async function MyPageContent() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) {
    redirect("/auth/login?next=/me");
  }

  const nowIso = new Date().toISOString();

  // 본인이 멤버인 모든 그룹의 다음 모임 (RLS가 비멤버 그룹 자동 제외)
  const [{ data: upcomingEvents }, { data: stats }, { data: memberships }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, title, starts_at, location, group_id")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(5),
      supabase
        .from("group_attendance_stats")
        .select("group_id, attended, total_past")
        .eq("user_id", userId),
      supabase
        .from("group_members")
        .select("group_id, groups(id, name)")
        .eq("user_id", userId),
    ]);

  // 그룹 id → 그룹명 매핑 (memberships의 nested groups 활용)
  const groupNameMap = new Map<string, string>();
  for (const m of memberships ?? []) {
    const g = m.groups as unknown as { id: string; name: string } | null;
    if (g?.id) groupNameMap.set(g.id, g.name);
  }

  // 출석률 행 정리 (출석률 내림차순)
  type StatRow = {
    groupId: string;
    groupName: string;
    attended: number;
    totalPast: number;
  };

  const statRows: StatRow[] = (stats ?? [])
    .filter(
      (
        s
      ): s is {
        group_id: string;
        attended: number | null;
        total_past: number | null;
      } => Boolean(s.group_id)
    )
    .map((s) => ({
      groupId: s.group_id,
      groupName: groupNameMap.get(s.group_id) ?? "(그룹명 미상)",
      attended: s.attended ?? 0,
      totalPast: s.total_past ?? 0,
    }));

  statRows.sort((a, b) => {
    const aRatio = a.totalPast > 0 ? a.attended / a.totalPast : -1;
    const bRatio = b.totalPast > 0 ? b.attended / b.totalPast : -1;
    return bRatio - aRatio;
  });

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">내 정보</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">다음 모임</h2>
        {!upcomingEvents || upcomingEvents.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            예정된 모임이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcomingEvents.map((e: EventRow) => (
              <li
                key={e.id}
                className="rounded-md border p-4 hover:bg-accent transition-colors"
              >
                <Link
                  href={`/groups/${e.group_id}/events/${e.id}`}
                  className="block"
                >
                  <div className="text-sm text-muted-foreground">
                    {groupNameMap.get(e.group_id) ?? "(그룹명 미상)"}
                  </div>
                  <div className="font-medium">
                    {e.title ?? "회차"} · {formatKst(e.starts_at)}
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

      <section>
        <h2 className="mb-3 text-lg font-medium">그룹별 출석률</h2>
        {statRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            가입한 그룹이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">그룹</th>
                  <th className="px-3 py-2 font-medium text-right">
                    출석/전체
                  </th>
                  <th className="px-3 py-2 font-medium text-right">출석률</th>
                </tr>
              </thead>
              <tbody>
                {statRows.map((r) => {
                  const ratio =
                    r.totalPast > 0
                      ? Math.round((r.attended / r.totalPast) * 100)
                      : null;
                  return (
                    <tr key={r.groupId} className="border-t">
                      <td className="px-3 py-2">
                        <Link
                          href={`/groups/${r.groupId}`}
                          className="hover:underline"
                        >
                          {r.groupName}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.attended}/{r.totalPast}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {ratio === null ? "—" : `${ratio}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

/** PPR 적응: page는 동기, async content는 Suspense 안에서 실행 */
export default function MyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <Suspense fallback={null}>
        <MyPageContent />
      </Suspense>
    </main>
  );
}
