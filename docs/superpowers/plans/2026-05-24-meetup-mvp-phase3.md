# 모임 이벤트 관리 MVP — Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** spec §6 M4 + M5 — 그룹 상세 페이지에 멤버별 누적 출석률 표 + 마이페이지(`/me`)를 추가해 MVP를 완성한다.

**Architecture:** Phase 1에서 생성된 `group_attendance_stats` view를 활용. 새 마이그레이션 0건, 새 client island 0건 기대. 모든 페이지는 Phase 1·2와 동일한 async content + `<Suspense>` PPR 패턴.

**Tech Stack:** Phase 1·2와 동일 — Next.js 15 + React 19 + Supabase(@supabase/ssr) + Tailwind + shadcn + TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-23-meetup-mvp-design.md`
- §3.3 view 정의
- §5.2 마이페이지 명세 ("다음 모임 카드(1~3개) + 그룹별 누적 출석률 표")
- §6 M4·M5 Done 기준

**Phase 1·2 학습 자산**:
- Server Component page는 async content + `<Suspense>` 패턴 (PPR `cacheComponents: true`)
- helper function 패턴(plpgsql + body `SET LOCAL row_security TO OFF` + owner `postgres`)
- proxy whitelist는 `/`, `/login*`, `/auth*`, `/invite/` — `/me`는 인증 필요라 추가 whitelist 불필요
- Supabase view는 nested FK select가 안 되므로 별도 query + client side join

**Phase 3 단순화 결정 (spec M4의 일부 항목을 v2+로 이연)**:
- M4 "다가오는 회차 카드 본인 응답 빠른 토글"은 YAGNI로 SKIP — 회차 상세 페이지에서 RSVP 가능하며, 빠른 토글은 추가 client island + 그룹 페이지 복잡도↑이고 핵심 가치는 회차 페이지에서 충분히 달성. v2+ 후보.

---

## File Structure

### 신규 파일

| 경로                       | 책임                                              |
| -------------------------- | ------------------------------------------------- |
| `app/me/page.tsx`          | 마이페이지 — 다음 모임 + 그룹별 본인 출석률 표    |

### 수정 파일

| 경로                              | 변경 내용                                              |
| --------------------------------- | ------------------------------------------------------ |
| `app/groups/[groupId]/page.tsx`   | 회차 목록(Phase 2) 다음에 "멤버 출석률 표" 섹션 추가   |

### DB

신규 마이그레이션 **없음**. Phase 1의 `group_attendance_stats` view 그대로 활용.

---

## Task 1 — 그룹 상세 페이지에 멤버 출석률 표

**Files:**
- Modify: `app/groups/[groupId]/page.tsx`

Phase 2의 그룹 상세 페이지(`GroupDetailContent`)에 "멤버 출석률" 섹션을 추가한다. 다가오는 회차 다음, 지난 회차 접힘 위에 위치.

- [ ] **Step 1: 멤버 출석률 query + 정렬 로직 추가**

`app/groups/[groupId]/page.tsx`의 `GroupDetailContent` 안, 기존 `pastEvents` query 이후·return 직전에 추가:

```ts
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
```

- [ ] **Step 2: 출석률 표 UI 렌더링 (지난 회차 위에 삽입)**

같은 파일에서 기존 "지난 회차" `<section>` 직전에 새 섹션 삽입:

```tsx
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
```

- [ ] **Step 3: `formatKstDate` 헬퍼를 `lib/datetime.ts`에 추가**

Phase 2의 `lib/datetime.ts`에 가입일 같은 date-only 표시를 위한 헬퍼 추가:

기존 파일 끝에 append:

```ts
/**
 * UTC ISO 문자열을 KST 날짜만으로 표시 (시간 제외).
 * 예: "2026-05-23T...Z" → "5월 23일"
 */
export function formatKstDate(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}
```

그리고 `app/groups/[groupId]/page.tsx`의 import에 `formatKstDate` 추가:

```ts
import { formatKst, formatKstDate } from "@/lib/datetime";
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`

기대: 통과. `◐ /groups/[groupId]` 그대로 PPR.

- [ ] **Step 5: 커밋**

```bash
git add app/groups/[groupId]/page.tsx lib/datetime.ts
git commit -m "feat(groups): 멤버 출석률 표 추가 (group_attendance_stats view 활용)"
```

---

## Task 2 — 마이페이지 `/me`

**Files:**
- Create: `app/me/page.tsx`

본인의 다음 모임(5개까지) + 가입한 모든 그룹의 누적 출석률 표.

- [ ] **Step 1: 마이페이지 작성**

`app/me/page.tsx`:

```tsx
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
    .filter((s): s is { group_id: string; attended: number | null; total_past: number | null } => Boolean(s.group_id))
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
                  <div className="text-sm text-muted-foreground">📍 {e.location}</div>
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
                  <th className="px-3 py-2 font-medium text-right">출석/전체</th>
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

export default function MyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <Suspense fallback={null}>
        <MyPageContent />
      </Suspense>
    </main>
  );
}
```

- [ ] **Step 2: 홈/네비게이션에 마이페이지 링크 추가 (선택)**

기존 `app/page.tsx`의 nav 또는 `components/auth-button.tsx`에 `/me` 링크 추가. 사용자 흐름상 마이페이지를 어떻게 접근할지 고민:

- 옵션 A: AuthButton dropdown에 "내 정보" 메뉴
- 옵션 B: 홈 nav에 "내 정보" 링크
- 옵션 C: 별도 진입 없이 직접 URL만

**Phase 3 단순화**: 옵션 C(직접 URL만). 추후 nav 정리는 v2+ 후보. 이 step은 작업 0건 — skip.

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`

기대: 통과. `◐ /me` (Partial Prerender) 등록.

- [ ] **Step 4: 커밋**

```bash
git add app/me/page.tsx
git commit -m "feat(me): 마이페이지 — 다음 모임 + 그룹별 출석률"
```

## Context

- **현재 branch**: `feat/meetup-events-phase3` (Phase 2 종료 후 main에서 갈라짐)
- **이미 존재**:
  - `lib/supabase/server.ts#createClient`
  - `lib/datetime.ts#formatKst` (Phase 2 Task 1)
  - DB: `group_attendance_stats` view (Phase 1) — security_invoker로 RLS 상속
  - DB: `events`, `event_participations`, `group_members`, `profiles` 모두 RLS 적용
- **PPR 환경**: cacheComponents: true. 모든 page는 async content + Suspense 패턴

---

## Task 3 — Phase 3 회귀 검증

**Files:** (검증만)

- [ ] **Step 1: 자동 검증**

Run:
```bash
npm run lint
npm run build
```

기대:
- lint 경고 0
- build 통과. 다음 라우트가 추가/유지:
  - `◐ /groups/[groupId]` (Phase 2 + Phase 3 모두 반영, 멤버 출석률 표 포함)
  - `◐ /me` (신규)

- [ ] **Step 2: V1~V8 자동 검증 가능한 항목 일괄 실행**

Phase 1·2에서 자동화한 시나리오를 한 번 더 돌려 회귀 확인:

| ID | 자동 검증 방식 | 기대 |
|---|---|---|
| V4 | Playwright `/invite/invalid-token` | "유효하지 않은 초대 링크" |
| V6 | Supabase MCP 시드 + JWT 시뮬레이션 INSERT | RLS 42501 거부 |
| V7 부가 | Playwright 비로그인 `/groups/<id>/events/new` | `/auth/login` redirect |
| V8 부가 | Playwright 비로그인 `/groups/<id>` | `/auth/login` redirect |

추가: `/me` 비로그인 진입 → `/auth/login` redirect 확인 (Playwright).

OAuth 의존 V1·V2·V3·V5·V5b·V7 본은 사용자 위임 (각 phase에서 검증된 회귀 항목이라 코드 review 충분).

- [ ] **Step 3: 결과 기록 + commit**

plan 끝 "Phase 3 회귀 결과" 섹션 추가 + commit:

```bash
git add docs/superpowers/plans/2026-05-24-meetup-mvp-phase3.md
git commit -m "docs(plan): Phase 3 회귀 결과 기록"
```

---

## Phase 3 완료 후 다음 단계

Phase 3가 완료되면 MVP의 In 범위(spec §1.4)가 모두 작동:
- 그룹 생성·초대·가입 (Phase 1)
- 회차 생성·RSVP·잠금·응답 명단 (Phase 2)
- 멤버별 누적 출석률 + 마이페이지 (Phase 3)

남은 작업 (MVP 출시 준비, spec §6 M5 일부):
- Vercel 환경변수 검증 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- Vercel 배포 + production URL 검증
- production grep으로 `SUPABASE_SERVICE_ROLE_KEY` 미포함 확인 (env에 추가했으니 빌드 산출물 점검)

이 출시 준비 단계는 Phase 3 종료 후 사용자가 결정. plan에 별도 task로 추가하지 않음 — 1회성 작업이라 사용자 직접 처리가 적합.
