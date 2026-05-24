# 모임 이벤트 관리 MVP — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** spec §6 M3 — 회차 생성 + RSVP + 응답 명단을 구현해 "주최자가 회차를 만들고 멤버가 갈게요/못 가요 응답하며, 회차 시작 후엔 응답이 자동 잠긴다"는 핵심 RSVP 흐름 working software를 만든다.

**Architecture:** Phase 1에서 만든 `events`·`event_participations` 테이블 + RLS 정책을 활용. 새 마이그레이션 0건 기대. Next.js 15 + PPR 환경에서 Server Component page는 async content + `<Suspense>` 패턴, RSVP 버튼·DateTime 입력은 Client Component island. KST 타임존 입력은 `datetime-local` → ISO 직렬화 유틸로 처리.

**Tech Stack:** Phase 1과 동일 — Next.js 15 + React 19 + Supabase(@supabase/ssr) + Tailwind + shadcn + TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-23-meetup-mvp-design.md`
- §5.2 회차 상세 화면 명세
- §5.3 `createEvent`, `respondToEvent` Server Actions
- §5.4 `RsvpButtons`, `EventDateTimePicker` islands
- §5.5 PPR 적응 패턴 (cacheComponents: true)
- §6 M3 Done 기준
- §7.1 V5·V6·V7 검증 시나리오

**Phase 1 학습 자산 (자동 회피)**:
- Server Component page는 async content + `<Suspense>` 패턴 (PPR 호환)
- helper function 도입 시 plpgsql + body `SET LOCAL row_security TO OFF` + owner `postgres` (BYPASSRLS) — Phase 2에선 신규 helper 0개 기대지만 필요 시 같은 패턴
- proxy whitelist는 `/`, `/login*`, `/auth*`, `/invite/` — `/groups/*/events/*`는 인증 필요라 추가 whitelist 불필요

---

## File Structure

### 신규 파일

| 경로                                                                  | 책임                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------- |
| `lib/datetime.ts`                                                     | `datetime-local` 입력 ↔ ISO 변환 + KST 포맷                   |
| `app/groups/[groupId]/events/new/actions.ts`                          | Server Action `createEventAction`                             |
| `app/groups/[groupId]/events/new/create-event-form.tsx`               | Client Component — 회차 생성 폼 (날짜·시간·장소·메모)         |
| `app/groups/[groupId]/events/new/page.tsx`                            | Server Component — owner 검증 + 폼 렌더                       |
| `app/groups/[groupId]/events/[eventId]/actions.ts`                    | Server Action `respondToEventAction`                          |
| `app/groups/[groupId]/events/[eventId]/rsvp-buttons.tsx`              | Client Component — 3-상태 RSVP 토글 (useTransition)           |
| `app/groups/[groupId]/events/[eventId]/page.tsx`                      | Server Component — 회차 상세 + 응답 명단                      |

### 수정 파일

| 경로                                              | 변경 내용                                                                                          |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `app/groups/[groupId]/page.tsx`                   | Phase 1 스텁에 "다가오는 회차 목록" + "새 모임 만들기"(owner) + "지난 회차 목록(접힘)" 추가         |

### DB

신규 마이그레이션 **없음**. Phase 1의 `events`·`event_participations`·RLS 정책·is_group_member helper 그대로 활용.

---

## Task 1 — DateTime 유틸 + `createEvent` Server Action

**Files:**
- Create: `lib/datetime.ts`
- Create: `app/groups/[groupId]/events/new/actions.ts`

- [ ] **Step 1: `lib/datetime.ts` 작성**

KST 타임존 변환 유틸. `datetime-local` input은 사용자의 로컬 시간을 반환하는데, 본 MVP는 KST 고정이라 KST로 해석 후 UTC ISO로 직렬화.

```ts
/**
 * datetime-local input 값(예: "2026-05-25T19:00")을 KST로 해석한 뒤
 * UTC ISO 문자열로 반환한다. 서버는 timestamptz로 저장하므로 UTC 기준.
 */
export function kstDateTimeLocalToIso(value: string): string {
  if (!value) throw new Error("datetime-local value is empty");
  // KST = UTC+09:00. "+09:00" suffix로 명시.
  const withSeconds = /\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  const dt = new Date(`${withSeconds}+09:00`);
  if (Number.isNaN(dt.getTime())) {
    throw new Error(`invalid datetime-local: ${value}`);
  }
  return dt.toISOString();
}

/**
 * UTC ISO 문자열을 KST 표시 형식으로 변환한다.
 * 예: "2026-05-25T10:00:00.000Z" → "5월 25일 (월) 19:00"
 */
export function formatKst(
  iso: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const dt = new Date(iso);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...options,
  }).format(dt);
}

/**
 * "지난 회차"·"다가오는 회차" 분기 판단. 회차 시작 시간이 지났는지.
 */
export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}
```

- [ ] **Step 2: `createEventAction` Server Action 작성**

`app/groups/[groupId]/events/new/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { kstDateTimeLocalToIso } from "@/lib/datetime";

export type CreateEventState = {
  error?: string;
};

/**
 * 회차를 생성한다. RLS의 events_insert_owner 정책이 owner 검증을 강제하므로
 * 비-owner의 호출은 DB 레이어에서 거부된다. groupId는 URL이 아닌 hidden input
 * 으로 전달되며 RLS가 신뢰 경계.
 */
export async function createEventAction(
  _prev: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const groupId = String(formData.get("groupId") ?? "");
  const startsAtLocal = String(formData.get("startsAt") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!groupId) return { error: "그룹 정보가 없습니다." };
  if (!startsAtLocal) return { error: "회차 시작 시간을 입력해 주세요." };
  if (location.length < 1 || location.length > 200) {
    return { error: "장소는 1~200자여야 합니다." };
  }
  if (memo.length < 1 || memo.length > 1000) {
    return { error: "메모는 1~1000자여야 합니다." };
  }

  let startsAtIso: string;
  try {
    startsAtIso = kstDateTimeLocalToIso(startsAtLocal);
  } catch {
    return { error: "회차 시작 시간이 올바르지 않습니다." };
  }

  // 과거 시점 차단 (UX 친화 — RLS는 INSERT 자체는 허용하지만 응답이 즉시 잠김)
  if (new Date(startsAtIso).getTime() < Date.now()) {
    return { error: "과거 시점은 등록할 수 없습니다." };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "로그인이 필요합니다." };

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      group_id: groupId,
      title: title.length > 0 ? title : null,
      starts_at: startsAtIso,
      location,
      memo,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !event) {
    return { error: `회차 생성에 실패했습니다: ${error?.message ?? "unknown"}` };
  }

  redirect(`/groups/${groupId}/events/${event.id}`);
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`

기대: 통과. `events` 테이블 타입 시그니처가 Phase 1의 `lib/database.types.ts`에 이미 등록되어 있어 타입 추론 OK.

- [ ] **Step 4: 커밋**

```bash
git add lib/datetime.ts app/groups/[groupId]/events/new/actions.ts
git commit -m "feat(events): KST datetime 유틸 + createEventAction Server Action"
```

---

## Task 2 — 회차 생성 페이지 + 폼

**Files:**
- Create: `app/groups/[groupId]/events/new/create-event-form.tsx`
- Create: `app/groups/[groupId]/events/new/page.tsx`

- [ ] **Step 1: Client 폼 컴포넌트 작성**

`app/groups/[groupId]/events/new/create-event-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEventAction, type CreateEventState } from "./actions";

const initialState: CreateEventState = {};

type Props = {
  groupId: string;
};

export function CreateEventForm({ groupId }: Props) {
  const [state, formAction, pending] = useActionState(
    createEventAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <input type="hidden" name="groupId" value={groupId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="startsAt">회차 시작 시간 (KST)</Label>
        <Input
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="location">장소</Label>
        <Input
          id="location"
          name="location"
          required
          maxLength={200}
          placeholder="예: 강남 수영장 자유 레인"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="memo">메모</Label>
        <Textarea
          id="memo"
          name="memo"
          required
          maxLength={1000}
          placeholder="예: 수영복 챙겨오세요"
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">제목 (선택)</Label>
        <Input
          id="title"
          name="title"
          maxLength={100}
          placeholder="기본은 그룹명을 사용합니다"
        />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "만드는 중…" : "회차 만들기"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Server 페이지 (owner 검증 + PPR 적응)**

`app/groups/[groupId]/events/new/page.tsx`:

```tsx
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
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`

기대: 통과. 빌드 로그에 `◐ /groups/[groupId]/events/new` (Partial Prerender) 표기.

- [ ] **Step 4: 커밋**

```bash
git add app/groups/[groupId]/events/new/page.tsx app/groups/[groupId]/events/new/create-event-form.tsx
git commit -m "feat(events): 회차 생성 페이지 + 폼 (owner 검증)"
```

---

## Task 3 — `respondToEvent` Server Action

**Files:**
- Create: `app/groups/[groupId]/events/[eventId]/actions.ts`

- [ ] **Step 1: Server Action 작성**

`app/groups/[groupId]/events/[eventId]/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RespondState = {
  error?: string;
  status?: "going" | "not_going" | "pending";
};

type RsvpStatus = "going" | "not_going" | "pending";

const VALID_STATUSES: ReadonlySet<RsvpStatus> = new Set([
  "going",
  "not_going",
  "pending",
]);

function isValidStatus(value: unknown): value is RsvpStatus {
  return typeof value === "string" && VALID_STATUSES.has(value as RsvpStatus);
}

/**
 * 회차 RSVP를 upsert한다. RLS의 `ep_insert_self_before_lock` /
 * `ep_update_self_before_lock`가 `events.starts_at > now()` 조건을 강제하므로
 * 회차 시작 시간 이후 호출은 DB 거부.
 *
 * 응답: success 시 새 status 반환, 잠금/RLS 거부 시 user-friendly error 메시지.
 */
export async function respondToEventAction(
  _prev: RespondState,
  formData: FormData,
): Promise<RespondState> {
  const eventId = String(formData.get("eventId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!eventId) return { error: "회차 정보가 없습니다." };
  if (!isValidStatus(status)) return { error: "잘못된 응답 상태입니다." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("event_participations")
    .upsert(
      { event_id: eventId, user_id: userId, status, responded_at: new Date().toISOString() },
      { onConflict: "event_id,user_id" },
    );

  if (error) {
    // RLS WITH CHECK 위반은 PostgreSQL 에러 코드 42501 (insufficient_privilege)
    // 또는 23514 (check_violation)로 옴. 메시지는 user-friendly로 매핑.
    const msg = error.message ?? "";
    if (
      msg.includes("row-level security") ||
      msg.includes("violates check constraint") ||
      error.code === "42501"
    ) {
      return { error: "응답이 마감되었습니다." };
    }
    return { error: `응답에 실패했습니다: ${msg || "unknown"}` };
  }

  // 응답 명단·count가 즉시 반영되도록 회차 상세 path 무효화
  if (groupId) {
    revalidatePath(`/groups/${groupId}/events/${eventId}`);
  }

  return { status };
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`

기대: 통과. `event_participations` upsert는 `lib/database.types.ts`의 시그니처와 일치.

- [ ] **Step 3: 커밋**

```bash
git add app/groups/[groupId]/events/[eventId]/actions.ts
git commit -m "feat(events): respondToEventAction Server Action (잠금은 RLS WITH CHECK)"
```

---

## Task 4 — 회차 상세 페이지 + RSVP 버튼

**Files:**
- Create: `app/groups/[groupId]/events/[eventId]/rsvp-buttons.tsx`
- Create: `app/groups/[groupId]/events/[eventId]/page.tsx`

- [ ] **Step 1: Client RSVP 버튼**

`app/groups/[groupId]/events/[eventId]/rsvp-buttons.tsx`:

```tsx
"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  respondToEventAction,
  type RespondState,
} from "./actions";

const initialState: RespondState = {};

type Props = {
  eventId: string;
  groupId: string;
  initialStatus: "going" | "not_going" | "pending";
  locked: boolean;
};

const STATUS_LABEL: Record<"going" | "not_going" | "pending", string> = {
  going: "✓ 갈게요",
  not_going: "못 가요",
  pending: "미정",
};

export function RsvpButtons({ eventId, groupId, initialStatus, locked }: Props) {
  const [state, formAction, pending] = useActionState(
    respondToEventAction,
    initialState,
  );

  // server action 응답 후 토스트 (strict mode 이중 render 방지를 위해 useEffect)
  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    } else if (state.status) {
      toast.success("응답이 저장되었습니다");
    }
  }, [state.error, state.status]);

  const current = state.status ?? initialStatus;

  if (locked) {
    return (
      <div className="rounded-md border bg-muted px-4 py-3 text-sm text-muted-foreground">
        🔒 응답 마감 — 현재 응답: {STATUS_LABEL[current]}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(["going", "not_going", "pending"] as const).map((opt) => (
        <form key={opt} action={formAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="status" value={opt} />
          <Button
            type="submit"
            variant={current === opt ? "default" : "outline"}
            disabled={pending}
          >
            {STATUS_LABEL[opt]}
          </Button>
        </form>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Server 페이지 (PPR 적응)**

`app/groups/[groupId]/events/[eventId]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatKst, isPast } from "@/lib/datetime";
import { RsvpButtons } from "./rsvp-buttons";

type RsvpStatus = "going" | "not_going" | "pending";

function nameOf(profile: { full_name: string | null; username: string | null } | null): string {
  if (!profile) return "(이름 미설정)";
  return profile.full_name?.trim() || profile.username?.trim() || "(이름 미설정)";
}

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
    const label = nameOf(m.profiles as { full_name: string | null; username: string | null } | null);
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
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`

기대: 통과. 빌드 로그에 `◐ /groups/[groupId]/events/[eventId]` (Partial Prerender) 표기.

- [ ] **Step 4: 커밋**

```bash
git add app/groups/[groupId]/events/[eventId]/page.tsx app/groups/[groupId]/events/[eventId]/rsvp-buttons.tsx
git commit -m "feat(events): 회차 상세 페이지 + RSVP 3-상태 토글 + 응답 명단"
```

---

## Task 5 — 그룹 상세 페이지에 회차 목록 추가

**Files:**
- Modify: `app/groups/[groupId]/page.tsx` (Phase 1 스텁을 회차 목록으로 갱신)

- [ ] **Step 1: 그룹 상세 페이지 갱신**

Phase 1의 점선 박스 자리에 회차 목록을 채운다. `app/groups/[groupId]/page.tsx`를 다음으로 교체:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CopyInviteLinkButton } from "@/components/copy-invite-link-button";
import { formatKst } from "@/lib/datetime";

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
```

기존 Phase 1의 점선 박스("Phase 2에서 채워집니다") 섹션이 제거되고 회차 목록으로 대체된다.

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`

기대: 통과. `◐ /groups/[groupId]` 그대로 PPR.

- [ ] **Step 3: 커밋**

```bash
git add app/groups/[groupId]/page.tsx
git commit -m "feat(groups): 그룹 상세에 다가오는/지난 회차 목록 + 새 모임 버튼"
```

---

## Task 6 — Phase 2 회귀 검증

**Files:** (검증만)

- [ ] **Step 1: 자동 검증**

Run:
```bash
npm run lint
npm run build
```

기대:
- lint 경고 0
- build 통과. 빌드 로그에서 다음 라우트가 모두 `◐ Partial Prerender` 표기 확인:
  - `◐ /groups/[groupId]` (갱신)
  - `◐ /groups/[groupId]/events/new` (신규)
  - `◐ /groups/[groupId]/events/[eventId]` (신규)

- [ ] **Step 2: V5·V6·V7 수동 검증 시나리오 (사용자 위임 or Playwright magic-link 자동화)**

| ID  | 시나리오                                                                | 기대 결과                                                                            |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| V5  | 주최자가 `/groups/<id>` → "+ 새 모임 만들기" → 폼 입력 → 회차 생성       | `/groups/<id>/events/<eid>`로 redirect, 일시·장소·메모 표시, 응답 명단에 미응답 멤버 |
| V5b | 멤버가 회차 페이지에서 "✓ 갈게요" 클릭                                  | 토스트 "응답이 저장되었습니다", 본인 이름이 ✅ 갈게요 명단에 이동                    |
| V6  | 회차 시작 시간을 과거로 설정한 행을 만들어 응답 시도 (시드 또는 시간 대기) | UI에 "🔒 응답 마감" 배지, 클릭 시도 시 DB 거부 + "응답이 마감되었습니다" 토스트       |
| V7  | 비-owner 멤버가 `/groups/<id>/events/new` URL 직접 진입                  | `/groups/<id>`로 redirect (회차 생성 폼 노출 X)                                      |

V6의 "과거 회차"는 createEventAction의 과거 차단을 우회하기 위해 service_role로 직접 시드:
```sql
insert into public.events (group_id, starts_at, location, memo, created_by)
values ('<group_id>', now() - interval '1 hour', '검증용', '잠금 검증', '<owner_id>')
returning id;
```

- [ ] **Step 3: 결과 기록**

검증 결과를 plan 끝 "Phase 2 회귀 결과" 섹션으로 추가하고 commit.

```bash
git add docs/superpowers/plans/2026-05-24-meetup-mvp-phase2.md
git commit -m "docs(plan): Phase 2 회귀 결과 기록"
```

---

## Phase 2 완료 후 다음 단계

Phase 2가 완료되면 working software가 다음을 추가로 지원:
- 주최자가 회차 생성 (KST 입력 → UTC 저장 → KST 표시)
- 멤버가 RSVP 3-상태 토글
- 회차 시작 시간 이후 응답 자동 잠금
- 그룹 상세 페이지에 다가오는/지난 회차 목록 + 새 모임 버튼

남은 작업 (Phase 3 / M4·M5 범위):
- 멤버별 누적 출석률 표 (`group_attendance_stats` view 활용)
- 그룹 상세에 멤버 출석률 카드
- 마이페이지 (`/me`) — 다음 모임 + 본인 출석률
- Phase 3 회귀 + 출시 준비

Phase 3 plan은 별도 문서로 작성: `docs/superpowers/plans/<날짜>-meetup-mvp-phase3.md`.
