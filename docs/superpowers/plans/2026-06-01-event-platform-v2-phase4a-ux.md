# Phase 4-A 체감 UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 이벤트 그리드 무한 스크롤, 참여자 카운트 실시간 복원(서버 broadcast), 로딩 스켈레톤을 추가해 체감 UX를 끌어올린다.

**Architecture:** 무한 스크롤은 `v2_events_with_status` view를 offset 페이징하는 쿼리 + Server Action + native IntersectionObserver 클라이언트로 구성한다. Realtime은 `postgres_changes` 구독을 버리고, Server Action(`joinEvent`/`leaveEvent`)이 DB 변경 성공 시 서버에서 broadcast(`channel.send` → HTTP)를 쏘고 클라이언트가 broadcast를 구독한다. 스켈레톤은 shadcn `Skeleton` 기반 컴포넌트로 Suspense fallback과 `loading.tsx`에 적용한다.

**Tech Stack:** Next.js 15(App Router, RSC, Server Actions), Supabase JS(`@supabase/ssr`, Realtime broadcast), shadcn/ui(`Skeleton`, `Card`), TypeScript.

---

## 검증 모델 (이 프로젝트 고유 — 읽고 시작할 것)

이 저장소에는 **단위 테스트 러너가 없다**(jest/vitest 미설치). Phase 1~3과 동일하게 검증
게이트는 다음이다:

- `npx tsc --noEmit` → 0 errors
- `npm run lint` → 0 problems
- `npm run build` → 모든 route PASS
- 동작 검증은 **Playwright MCP 시나리오**(에이전트가 직접 구동)로 수행 — 자동화된 npm test 아님.

따라서 각 Task는 "실패 테스트 작성"이 아니라 **코드 작성 → tsc/lint → (해당 시) 동작 검증 →
commit** 순서를 따른다. 이는 superpowers TDD 기본형을 이 코드베이스의 검증 도구에 맞춘 것이다
(사용자 워크플로 우선).

---

## File Structure

| 파일 | 책임 | 신규/수정 |
| --- | --- | --- |
| `lib/queries/events.ts` | `getUpcomingEventsPage` 추가, `UPCOMING_PAGE_SIZE` export, `getUpcomingEvents` 제거 | 수정 |
| `lib/actions/events.ts` | `loadMoreUpcomingEvents` Server Action 추가 | 수정 |
| `components/events/upcoming-events-infinite.tsx` | 홈 무한 스크롤 클라이언트 컴포넌트 | 신규 |
| `app/page.tsx` | 첫 페이지 SSR → 무한 스크롤 컴포넌트로 위임, Suspense fallback 스켈레톤화 | 수정 |
| `lib/actions/participants.ts` | join/leave 성공 시 서버 broadcast 송신 | 수정 |
| `components/events/event-participants-count.tsx` | broadcast 구독으로 교체 + 재동기화 | 수정 |
| `components/events/event-card-skeleton.tsx` | `EventCardSkeleton`, `EventListSkeleton` | 신규 |
| `app/events/[id]/page.tsx` | 상세 Suspense fallback 스켈레톤화 | 수정 |
| `app/my-events/loading.tsx` | my-events 라우트 로딩 스켈레톤 | 신규 |
| `app/admin/(authed)/loading.tsx` | admin 라우트 로딩 스켈레톤 | 신규 |
| `docs/v2-phase4/ux-toast-debounce-audit.md` | Toast/debounce audit 결과 기록 | 신규 |

---

## Task 1: `getUpcomingEventsPage` 쿼리 + `UPCOMING_PAGE_SIZE`

**Files:**
- Modify: `lib/queries/events.ts`

- [ ] **Step 1: `UPCOMING_PAGE_SIZE` 상수와 `getUpcomingEventsPage` 추가**

`lib/queries/events.ts` 의 `getUpcomingEvents`(line 68~78) **바로 위**에 상수를, 그리고 함수를 추가한다:

```ts
/** 홈 무한 스크롤 한 페이지 크기 (3열 × 3행). 클라이언트/액션이 공유. */
export const UPCOMING_PAGE_SIZE = 9;

/**
 * upcoming 이벤트 한 페이지.
 * 정렬은 (event_date asc, id asc) — 동일 일자 tie-break 으로 페이지 경계 중복/누락 방지.
 */
export async function getUpcomingEventsPage(
  offset: number,
  limit: number,
): Promise<Event[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v2_events_with_status")
    .select("*")
    .eq("status", "upcoming")
    .order("event_date", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);
  return (data ?? []).map(mapEventRow);
}
```

- [ ] **Step 2: 기존 `getUpcomingEvents` 제거**

`getUpcomingEvents`(line 68~78) 함수를 통째로 삭제한다. (호출처는 `app/page.tsx` 한 곳뿐이며 Task 3에서 교체된다. `getRecentEvents`는 admin 에서 사용하므로 **건드리지 않는다**.)

- [ ] **Step 3: tsc — 일시적 에러 확인**

Run: `npx tsc --noEmit`
Expected: `app/page.tsx` 에서 `getUpcomingEvents` 가 사라져 에러 1건 (Task 3에서 해소). 그 외 `lib/queries/events.ts` 자체는 에러 없어야 함.

- [ ] **Step 4: commit**

```bash
git add lib/queries/events.ts
git commit -m "feat(v2): getUpcomingEventsPage offset 페이징 쿼리 + UPCOMING_PAGE_SIZE"
```

---

## Task 2: `loadMoreUpcomingEvents` Server Action

**Files:**
- Modify: `lib/actions/events.ts`

- [ ] **Step 1: import 추가**

`lib/actions/events.ts` 상단 import 블록에 추가한다:

```ts
import { getUpcomingEventsPage, UPCOMING_PAGE_SIZE } from "@/lib/queries/events";
import type { Event } from "@/types/event";
```

(`Event` 타입이 이미 import 되어 있으면 중복 추가하지 말 것 — 파일 상단을 먼저 확인.)

- [ ] **Step 2: 파일 끝에 액션 추가**

```ts
/**
 * 홈 "다가오는 이벤트" 무한 스크롤 — offset 이후 다음 페이지를 반환.
 * offset 음수/비정수는 0 으로 방어 (클라이언트 입력 신뢰 금지).
 */
export async function loadMoreUpcomingEvents(offset: number): Promise<Event[]> {
  const safeOffset = Number.isInteger(offset) && offset > 0 ? offset : 0;
  return getUpcomingEventsPage(safeOffset, UPCOMING_PAGE_SIZE);
}
```

- [ ] **Step 3: tsc + lint**

Run: `npx tsc --noEmit; npm run lint`
Expected: `lib/actions/events.ts` 관련 에러 없음 (`app/page.tsx` 잔여 에러는 Task 3에서 해소).

- [ ] **Step 4: commit**

```bash
git add lib/actions/events.ts
git commit -m "feat(v2): loadMoreUpcomingEvents Server Action (offset 가드)"
```

---

## Task 3: 무한 스크롤 클라이언트 컴포넌트 + 홈 통합

**Files:**
- Create: `components/events/upcoming-events-infinite.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: 무한 스크롤 컴포넌트 생성**

`components/events/upcoming-events-infinite.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EventCard } from "@/components/events/event-card";
import { EventCardSkeleton } from "@/components/events/event-card-skeleton";
import { loadMoreUpcomingEvents } from "@/lib/actions/events";
import { UPCOMING_PAGE_SIZE } from "@/lib/queries/events";
import type { Event } from "@/types/event";

type Props = {
  initialEvents: Event[];
};

/**
 * 홈 "다가오는 이벤트" 무한 스크롤.
 * 초기 페이지는 서버에서 SSR 후 props 로 전달되고, 이후 IntersectionObserver
 * 센티넬이 viewport 에 들어오면 다음 페이지를 append 한다.
 */
export function UpcomingEventsInfinite({ initialEvents }: Props) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [hasMore, setHasMore] = useState(
    initialEvents.length === UPCOMING_PAGE_SIZE,
  );
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const next = await loadMoreUpcomingEvents(events.length);
      setEvents((prev) => [...prev, ...next]);
      if (next.length < UPCOMING_PAGE_SIZE) setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [events.length, hasMore, isLoading]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <EventCardSkeleton key={`loading-${i}`} />
            ))
          : null}
      </div>
      {hasMore ? <div ref={sentinelRef} className="h-4 w-full" /> : null}
    </>
  );
}
```

(이 컴포넌트는 `EventCardSkeleton` 에 의존한다 — Task 6 전에 tsc 가 통과하려면 Task 6의 `event-card-skeleton.tsx` 를 먼저 만들어도 된다. 순서를 지키려면 Step 4 tsc 는 Task 6 완료 후 통과한다. 아래 Step 3 참고.)

- [ ] **Step 2: `app/page.tsx` 를 무한 스크롤로 교체**

`app/page.tsx` 의 import 두 줄을 교체:

```ts
// 삭제
import { getUpcomingEvents } from "@/lib/queries/events";
// 추가
import { EventListSkeleton } from "@/components/events/event-card-skeleton";
import { UpcomingEventsInfinite } from "@/components/events/upcoming-events-infinite";
import { getUpcomingEventsPage, UPCOMING_PAGE_SIZE } from "@/lib/queries/events";
```

(`app/page.tsx` 에서 직접 쓰는 건 `EventListSkeleton`·`UpcomingEventsInfinite`·`getUpcomingEventsPage`·`UPCOMING_PAGE_SIZE` 뿐이다. shadcn `Skeleton` 원시 컴포넌트는 import 하지 않는다 — lint no-unused-vars 회피.)

`UpcomingEventsSection` 함수를 교체:

```tsx
async function UpcomingEventsSection() {
  const upcoming = await getUpcomingEventsPage(0, UPCOMING_PAGE_SIZE);
  if (upcoming.length === 0) {
    return (
      <EventListEmpty
        title="아직 이벤트가 없습니다"
        description="첫 이벤트를 만들어보세요."
        action={
          <Button asChild size="sm">
            <Link href="/events/new">이벤트 만들기</Link>
          </Button>
        }
      />
    );
  }
  return <UpcomingEventsInfinite initialEvents={upcoming} />;
}
```

`HomePage` 내 Suspense fallback 을 스켈레톤으로 교체:

```tsx
<Suspense fallback={<EventListSkeleton count={6} />}>
  <UpcomingEventsSection />
</Suspense>
```

- [ ] **Step 3: tsc + lint (Task 6 의존)**

Run: `npx tsc --noEmit; npm run lint`
Expected: `EventCardSkeleton`/`EventListSkeleton` 미존재 에러가 나면 Task 6 을 먼저 수행한 뒤 재실행. 둘 다 존재하면 0 errors / 0 problems.

- [ ] **Step 4: build + 홈 동작 확인**

Run: `npm run build`
Expected: 모든 route PASS.

Playwright MCP: dev 서버(`npm run dev`) 기동 후 `/` 접속 → "다가오는 이벤트" 그리드 렌더 확인. (데이터가 9개 미만이면 센티넬 미표시 = 정상. 9개 이상이면 스크롤 시 추가 로드 — Task 8 에서 데이터 보강 후 정식 검증.)

- [ ] **Step 5: commit**

```bash
git add components/events/upcoming-events-infinite.tsx app/page.tsx
git commit -m "feat(v2): 홈 이벤트 그리드 무한 스크롤 (native IntersectionObserver)"
```

---

## Task 4: join/leave 서버 broadcast 송신

**Files:**
- Modify: `lib/actions/participants.ts`

- [ ] **Step 1: `joinEvent` — 신규 insert 시에만 +1 broadcast**

`lib/actions/participants.ts` 의 `joinEvent`(line 14~43) 에서 insert 결과 처리부를 교체한다.
기존:

```ts
  const { error } = await supabase.from("v2_event_participants").insert({
    event_id: eventId,
    user_id: user.id,
  });
  // 23505 = unique_violation (이미 참여 중) → idempotent silent pass.
  // supabase-js 가 향후 error.code 표면을 바꿔도 message regex 가 fallback.
  if (error) {
    const isDuplicate =
      error.code === "23505" || /duplicate key/i.test(error.message);
    if (!isDuplicate) {
      console.error("[joinEvent] DB failure", { eventId, code: error.code });
      throw new Error("이벤트 참여에 실패했습니다");
    }
  }

  revalidatePath(`/events/${eventId}`);
```

교체:

```ts
  const { error } = await supabase.from("v2_event_participants").insert({
    event_id: eventId,
    user_id: user.id,
  });
  // 23505 = unique_violation (이미 참여 중) → idempotent silent pass.
  // supabase-js 가 향후 error.code 표면을 바꿔도 message regex 가 fallback.
  let inserted = true;
  if (error) {
    const isDuplicate =
      error.code === "23505" || /duplicate key/i.test(error.message);
    if (!isDuplicate) {
      console.error("[joinEvent] DB failure", { eventId, code: error.code });
      throw new Error("이벤트 참여에 실패했습니다");
    }
    inserted = false; // 이미 참여 중 → 카운트 변동 없음 (broadcast 생략)
  }

  // 신규 참여일 때만 카운트 +1 broadcast (서버 권위, best-effort).
  if (inserted) {
    await broadcastParticipantChange(supabase, eventId, 1);
  }

  revalidatePath(`/events/${eventId}`);
```

- [ ] **Step 2: `leaveEvent` — 실제 삭제 시 -1 broadcast**

`leaveEvent`(line 51~73) 의 `count === 0` throw **다음**, `revalidatePath` **앞**에 추가한다:

```ts
  if (count === 0) {
    throw new Error("참여 기록을 찾을 수 없습니다");
  }

  // 실제 삭제됨 (count > 0) → 카운트 -1 broadcast.
  await broadcastParticipantChange(supabase, eventId, -1);

  revalidatePath(`/events/${eventId}`);
```

- [ ] **Step 3: broadcast 헬퍼 추가**

파일 끝에 추가한다. `supabase` 타입은 `joinEvent`/`leaveEvent` 가 쓰는 `createClient()` 반환과 동일하므로 `Awaited<ReturnType<typeof createClient>>` 로 받는다:

```ts
/**
 * 참여자 카운트 변동을 broadcast 로 송신.
 * subscribe() 하지 않은 채널에 send → supabase-js 가 HTTP 로 전송하므로
 * 짧게 사는 Server Action 에 적합. 표시용 카운트라 공개 broadcast(private 미설정).
 * best-effort: 실패해도 DB 변경은 이미 커밋됐으므로 흐름을 막지 않는다.
 */
async function broadcastParticipantChange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  delta: 1 | -1,
): Promise<void> {
  try {
    await supabase.channel(`event:${eventId}:participants`).send({
      type: "broadcast",
      event: "participant_change",
      payload: { delta },
    });
  } catch (e) {
    console.error("[broadcastParticipantChange] failed", { eventId, delta });
  }
}
```

(`e` 가 lint no-unused-vars 에 걸리면 `catch (e)` → `catch` 로 변경. ESLint 설정 확인 후 결정.)

- [ ] **Step 4: tsc + lint**

Run: `npx tsc --noEmit; npm run lint`
Expected: 0 errors / 0 problems.

- [ ] **Step 5: commit**

```bash
git add lib/actions/participants.ts
git commit -m "feat(v2): join/leave 시 참여자 카운트 broadcast 송신 (서버 권위)"
```

---

## Task 5: 카운트 컴포넌트 broadcast 구독 + 재동기화

**Files:**
- Modify: `components/events/event-participants-count.tsx`

- [ ] **Step 1: 컴포넌트 전체 교체**

`components/events/event-participants-count.tsx` 전체를 교체한다:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  eventId: string;
  initialCount: number;
};

/**
 * 참여자 카운트를 broadcast 로 실시간 갱신.
 *
 * 모델 (Phase 4-A):
 *   joinEvent/leaveEvent Server Action 이 DB 변경 성공 시 서버에서
 *   `event:{id}:participants` 채널로 { delta:±1 } broadcast 를 송신한다.
 *   이 컴포넌트는 그 broadcast 를 구독해 카운트를 누적 갱신한다.
 *   postgres_changes(=RLS·publication 의존) 를 쓰지 않으므로 호스트/참여자/비참여자
 *   전원이 동일하게 수신한다 (Phase 3 후속 추적 #1 복원).
 *
 * drift 보정:
 *   broadcast 는 best-effort 라 메시지 유실 시 카운트가 어긋날 수 있다.
 *   구독 성공(SUBSCRIBED) 시 + 탭 재가시화 시 서버 카운트를 1회 재조회해 덮어쓴다.
 *
 * 초기값:
 *   page.tsx 가 getEventPublicUsers RPC 결과 length 로 계산해 prop 으로 전달.
 */
export function EventParticipantsCount({ eventId, initialCount }: Props) {
  const [count, setCount] = useState(initialCount);

  // 서버 카운트 1회 재조회 (broadcast 유실 보정). 클라이언트도 같은 RPC 호출 가능.
  const resync = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.rpc("v2_get_event_public_users", {
      p_event_id: eventId,
    });
    if (data) setCount(data.length);
  }, [eventId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event:${eventId}:participants`)
      .on("broadcast", { event: "participant_change" }, ({ payload }) => {
        const delta = (payload as { delta?: number }).delta ?? 0;
        setCount((c) => Math.max(0, c + delta));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") resync();
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") resync();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [eventId, resync]);

  return (
    <p className="flex items-center gap-2">
      <Users className="h-4 w-4" />
      참여자 {count}명
    </p>
  );
}
```

- [ ] **Step 2: tsc + lint**

Run: `npx tsc --noEmit; npm run lint`
Expected: 0 errors / 0 problems.

- [ ] **Step 3: commit**

```bash
git add components/events/event-participants-count.tsx
git commit -m "feat(v2): 참여자 카운트 broadcast 구독 + 재동기화 (postgres_changes 제거)"
```

---

## Task 6: 스켈레톤 컴포넌트 + loading.tsx

**Files:**
- Create: `components/events/event-card-skeleton.tsx`
- Modify: `app/events/[id]/page.tsx`
- Create: `app/my-events/loading.tsx`
- Create: `app/admin/(authed)/loading.tsx`

- [ ] **Step 1: 스켈레톤 컴포넌트 생성**

`components/events/event-card-skeleton.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** EventCard 로딩 자리 — 카드 높이/형태를 맞춰 layout shift 를 줄인다. */
export function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-32 w-full rounded-none" />
      <CardContent className="space-y-2 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3.5 w-2/3" />
      </CardContent>
    </Card>
  );
}

/** 카드 그리드 스켈레톤 (기본 6개). 그리드 클래스는 EventCard 그리드와 동일. */
export function EventListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 이벤트 상세 Suspense fallback 스켈레톤화**

`app/events/[id]/page.tsx` 상단에 import 추가:

```ts
import { Skeleton } from "@/components/ui/skeleton";
```

`EventDetailPage`(line 70~89) 의 Suspense fallback 을 교체:

```tsx
<Suspense
  fallback={
    <main className="flex-1 space-y-6 px-4 py-6 pb-20">
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </main>
  }
>
  <EventDetailContent params={params} />
</Suspense>
```

- [ ] **Step 3: my-events 로딩**

`app/my-events/loading.tsx` 생성. (loading.tsx 는 해당 segment 의 layout 안에서 렌더되므로
하단 nav 등 레이아웃은 자동 유지 — 내부 콘텐츠 스켈레톤만 그린다.)

```tsx
import { EventListSkeleton } from "@/components/events/event-card-skeleton";

export default function MyEventsLoading() {
  return (
    <main className="flex-1 px-4 py-6 pb-20">
      <EventListSkeleton count={4} />
    </main>
  );
}
```

- [ ] **Step 4: admin 로딩**

`app/admin/(authed)/loading.tsx` 생성. admin 은 테이블 위주라 행 스켈레톤을 그린다:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: tsc + lint + build**

Run: `npx tsc --noEmit; npm run lint; npm run build`
Expected: 0 errors / 0 problems / 모든 route PASS (Task 3 의 `EventCardSkeleton`/`EventListSkeleton` 의존도 여기서 해소되어 Task 3 Step 3/4 도 통과).

- [ ] **Step 6: commit**

```bash
git add components/events/event-card-skeleton.tsx app/events/[id]/page.tsx app/my-events/loading.tsx "app/admin/(authed)/loading.tsx"
git commit -m "feat(v2): 로딩 스켈레톤 컴포넌트 + Suspense fallback/loading.tsx 적용"
```

---

## Task 7: Toast / debounce audit

**Files:**
- Create: `docs/v2-phase4/ux-toast-debounce-audit.md`
- Modify: (audit 결과 누락 발견 시 해당 컴포넌트)

- [ ] **Step 1: mutation 컴포넌트 toast 점검**

다음 7개 파일을 열어 mutation(성공/실패) 경로에 `toast.success`/`toast.error` 가 있는지 확인:
- `components/admin/admin-delete-confirm.tsx`
- `components/copy-invite-link-button.tsx`
- `components/events/event-form.tsx`
- `components/events/event-share-actions.tsx`
- `components/invite/invite-preview.tsx`
- `components/profile/profile-form.tsx`

각 파일에서: 성공 시 `toast.success(...)`, 실패(throw/error) 시 `toast.error(...)` 가 사용자에게
노출되는지. 누락된 경로가 있으면 해당 핸들러에 추가한다. 예 (event-form 제출 실패 시):

```ts
} catch {
  toast.error("저장에 실패했습니다. 다시 시도해주세요.");
}
```

- [ ] **Step 2: 검색 debounce 동작 확인 (#6)**

`components/admin/admin-search-bar.tsx` 의 200ms debounce 가 동작하는지 코드 확인 + Playwright MCP
로 admin 검색 입력 시 200ms 후 필터링되는지 관찰. **코드 정상이면 변경 없음** — 관찰 결과만 기록.

- [ ] **Step 3: audit 결과 기록**

`docs/v2-phase4/ux-toast-debounce-audit.md` 에 7개 컴포넌트별 toast 유무 표 + debounce 확인 결과 +
(있었다면) 추가한 fix 목록을 적는다.

- [ ] **Step 4: tsc + lint (fix 있었을 경우)**

Run: `npx tsc --noEmit; npm run lint`
Expected: 0 errors / 0 problems.

- [ ] **Step 5: commit**

```bash
git add docs/v2-phase4/ux-toast-debounce-audit.md
# fix 가 있었으면 해당 컴포넌트도 add
git commit -m "docs(v2): Toast/debounce audit + (필요 시) 누락 toast 보충"
```

---

## Task 8: 회귀 + Playwright MCP 검증 + ROADMAP 갱신

**Files:**
- Modify: `docs/ROADMAP-v2.md`
- Create: `docs/v2-phase4/playwright-mcp-ux.md`

- [ ] **Step 1: 전체 회귀**

Run: `npx tsc --noEmit; npm run lint; npm run build`
Expected: 0 errors / 0 problems / 모든 route PASS.

- [ ] **Step 2: Realtime 카운트 — 2세션 검증 (Playwright MCP)**

준비: dev 서버 기동. host1(inmingoon) 세션에서 이벤트 상세 열기. 시크릿 세션 bandnell 로 같은
이벤트 invite 링크 통해 참여.
검증:
- bandnell 가입 직후 **host 세션의 "참여자 N명" 이 +1** 로 즉시 변동(새로고침 없이).
- bandnell 탈퇴 시 host 세션 -1 즉시 반영.
- 비호스트(bandnell) 세션에서도 본인 외 변동이 broadcast 로 반영되는지(가능하면 3번째 참여자).
- 탭 백그라운드 → 포그라운드 복귀 시 카운트가 서버값으로 재동기화되는지.
기록: `docs/v2-phase4/playwright-mcp-ux.md`.

- [ ] **Step 3: 무한 스크롤 검증 (Playwright MCP)**

upcoming 이벤트가 9개를 초과하도록 데이터 확보(필요 시 supabase MCP `execute_sql` 로 더미
upcoming 이벤트 삽입 — created_by 는 host1 `c51ee9e2-2350-4f6d-a302-f4d47088f48b`).
검증: `/` 에서 아래로 스크롤 → 센티넬 진입 시 다음 9개 로드, 로딩 중 스켈레톤 3개 표시, 끝
도달 시 추가 로드 중단(센티넬 제거). 결과 기록.

- [ ] **Step 4: 스켈레톤 노출 검증**

Playwright MCP 로 느린 네트워크(또는 네비게이션 순간) 캡처해 홈/상세/my-events/admin 진입 시
스켈레톤이 보이는지 스크린샷. 결과 기록.

- [ ] **Step 5: ROADMAP 갱신**

`docs/ROADMAP-v2.md` 의 Phase 4 섹션(line 68~73)에 4-A 완료 표기 + 후속 추적 #1(Realtime 복원)
**해소** 표기 + #6(debounce 확인) **확인 완료** 표기. 4-B/4-C/4-D 는 미착수로 명시.

- [ ] **Step 6: 최종 commit + push**

```bash
git add docs/ROADMAP-v2.md docs/v2-phase4/playwright-mcp-ux.md
git commit -m "docs(v2): Phase 4-A UX 검증 결과 + ROADMAP 갱신 (#1 복원, #6 확인)"
git push
```

---

## 미해결 / 후속 (이 plan 밖)

- 서버 측 `channel.send` HTTP 송신이 Vercel serverless(Phase 4-C 배포 후)에서 동일 동작하는지
  배포 환경 재확인 — Phase 4-C 에서 검증.
- Step 3 에서 삽입한 더미 upcoming 이벤트는 검증 후 정리(또는 보존) 결정 — Step 3 기록에 명시.
- 무한 스크롤을 my-events/admin 으로 확장(Phase 4-A 비범위)은 필요 시 별도 작업.
