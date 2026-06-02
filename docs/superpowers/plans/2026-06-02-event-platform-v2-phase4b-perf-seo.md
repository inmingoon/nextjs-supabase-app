# Phase 4-B 성능·SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** raw `<img>` 2곳을 `next/image`로 전환하고, `/invite/[code]` 공유 OG 카드 + 인증 앱용 robots/sitemap + admin Recharts 지연 로드로 production `/invite` Lighthouse 90+를 달성한다.

**Architecture:** 점진적·되돌리기 쉬운 변경 4 워크스트림. 공통 origin은 `lib/site-url.ts`로 중앙화하고 metadataBase·robots·sitemap이 공유. OG 데이터 조회는 `React.cache`로 요청 내 dedup. Recharts는 `"use client"` lazy 래퍼로 서버 번들에서 격리.

**Tech Stack:** Next.js 16(App Router, `cacheComponents: true`), `next/image`, Next Metadata API(`generateMetadata`/`robots.ts`/`sitemap.ts`), Supabase Storage public URL, Recharts(`next/dynamic` `ssr:false`).

**Spec:** `docs/superpowers/specs/2026-06-02-event-platform-v2-phase4b-perf-seo-design.md`

---

## 공유 컨텍스트 (모든 Task 공통)

**정적 게이트 명령 (PowerShell):**
- `npm run lint` → 기대: `0 problems` (warning/error 0)
- `npx tsc --noEmit` → 기대: 출력 없음(에러 0)
- `npm run build` → 기대: 빌드 성공, 0 warning. robots/sitemap 추가 후 route 수 25 → 27.

**런타임 검증 환경(이미지·OG 시각 확인용 — Task 2/3/8):**
이 앱은 인증 게이트라 EventCard/EventDetailHeader가 보이는 페이지는 로그인이 필요하다. 로컬 production 서버 + magiclink 우회 인증 + 시드 이벤트로 확인한다.
1. 로컬 production 서버: `npm run build` 후 `npm run start` (dev 서버는 Turbopack 워커 flakiness로 `/events/[id]` 500 — 코드 무관, spec 참조).
2. cover 있는 시드 이벤트 생성(Supabase MCP `execute_sql`): host1(`c51ee9e2-2350-4f6d-a302-f4d47088f48b`)로 `v2_events` insert, `invite_code` `'P4B-TEST'`, `cover_image_url`은 기존 업로드된 cover 또는 임의 public URL.
3. magiclink 인증: service_role로 `POST {SUPABASE_URL}/auth/v1/admin/generate_link` `{type:'magiclink', email:'inmingoon@gmail.com'}` → `hashed_token` → 브라우저 `/auth/confirm?token_hash=...&type=magiclink&next=/`.
4. 정리: `delete from v2_events where invite_code like 'P4B-%'` (FK CASCADE로 참여 row 자동 삭제).

---

## File Structure

**신규 (3):**
- `lib/site-url.ts` — 배포 환경별 canonical origin 단일 소스. (Task 1)
- `app/robots.ts` — robots.txt 생성. (Task 5)
- `app/sitemap.ts` — sitemap.xml 생성. (Task 5)
- `components/charts/event-trend-chart-lazy.tsx` — Recharts 지연 로드 client 래퍼. (Task 6)
- `components/charts/status-pie-chart-lazy.tsx` — 동일. (Task 6)

**수정:**
- `next.config.ts` — `images.remotePatterns`. (Task 2)
- `app/layout.tsx` — `metadataBase ← siteUrl`, (선택)SpeedInsights. (Task 1, 7)
- `components/events/event-card.tsx` — `<img>` → `<Image fill>`. (Task 2)
- `components/events/event-detail-header.tsx` — `<img>` → `<Image fill priority>`. (Task 2)
- `lib/queries/events.ts` — `getEventById`/`getEventByInviteCode` → `React.cache`. (Task 3)
- `app/invite/[code]/page.tsx` — `generateMetadata`. (Task 3)
- `app/events/[id]/page.tsx` — `generateMetadata`. (Task 4)
- `app/admin/(authed)/analytics/page.tsx` — lazy 래퍼 import 교체. (Task 6)

---

## Task 1: siteUrl 중앙화 + metadataBase

**Files:**
- Create: `lib/site-url.ts`
- Modify: `app/layout.tsx:8-17`

- [ ] **Step 1: `lib/site-url.ts` 생성**

```ts
/**
 * 배포 환경별 canonical origin.
 * OG 절대경로(metadataBase) · robots · sitemap 에서 공용 사용.
 * 우선순위: 명시 SITE_URL > Vercel production 고정 도메인 > Vercel 배포별 URL > localhost.
 * VERCEL_URL 만 쓰면 preview 마다 도메인이 바뀌어 OG 절대경로가 깨질 수 있어 production 우선.
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
```

- [ ] **Step 2: `app/layout.tsx` metadataBase 교체**

상단 import에 추가(기존 import 블록 아래):
```ts
import { siteUrl } from "@/lib/site-url";
```

기존 8-17행:
```ts
const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "1회성 이벤트, 5초 만에",
  description:
    "5~30명 규모 1회성 이벤트(모임·세미나·소규모 행사)를 초대 링크 하나로 만들고 관리할 수 있는 모바일 우선 플랫폼",
};
```
→ 교체:
```ts
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "1회성 이벤트, 5초 만에",
  description:
    "5~30명 규모 1회성 이벤트(모임·세미나·소규모 행사)를 초대 링크 하나로 만들고 관리할 수 있는 모바일 우선 플랫폼",
};
```

- [ ] **Step 3: 정적 게이트**

Run: `npx tsc --noEmit` → 기대: 에러 0
Run: `npm run build` → 기대: 성공. (행동 변화 없음 — 로컬에선 siteUrl=`http://localhost:3000`로 기존과 동일.)

- [ ] **Step 4: Commit**

```bash
git add lib/site-url.ts app/layout.tsx
git commit -m "feat(4-B): canonical siteUrl 중앙화 + metadataBase 연결"
```

---

## Task 2: 이미지 — remotePatterns + next/image 전환

**Files:**
- Modify: `next.config.ts`
- Modify: `components/events/event-card.tsx:1-2,21-28`
- Modify: `components/events/event-detail-header.tsx:1-4,15-26`

- [ ] **Step 1: `next.config.ts`에 remotePatterns 추가**

기존 전체:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```
→ 교체:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    // Supabase Storage(event-covers 버킷) public URL 만 next/image 최적화 허용.
    // hostname 의 프로젝트 ref(bwtzjdoonhnwrroxoxkf)는 NEXT_PUBLIC_SUPABASE_URL 호스트와 동일 —
    // 프로젝트 이전 시 함께 갱신할 것. (next.config 는 정적 평가라 env 파싱 대신 하드코딩.)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bwtzjdoonhnwrroxoxkf.supabase.co",
        pathname: "/storage/v1/object/public/event-covers/**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 2: `event-card.tsx` — `<img>` → `<Image fill>`**

1행에 import 추가:
```ts
import Image from "next/image";
```
기존 21-28행:
```tsx
          {event.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.coverImageUrl}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          ) : null}
```
→ 교체 (`sizes`는 홈 그리드 `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` in `max-w-2xl`(672px) 기준):
```tsx
          {event.coverImageUrl ? (
            <Image
              src={event.coverImageUrl}
              alt={event.title}
              fill
              sizes="(min-width: 768px) 224px, (min-width: 640px) 336px, 100vw"
              className="object-cover"
            />
          ) : null}
```
(부모 `div`는 이미 `relative h-32 w-full` → `fill` 충족. badge overlay div는 DOM상 Image 뒤라 위에 렌더됨 — 변경 불필요.)

- [ ] **Step 3: `event-detail-header.tsx` — `<img>` → `<Image fill priority>`**

1-4행 import 블록 맨 위(또는 적절 위치)에 추가:
```ts
import Image from "next/image";
```
기존 15-26행:
```tsx
      {event.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.coverImageUrl}
          alt={event.title}
          className="h-48 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-48 w-full items-center justify-center rounded-lg bg-muted">
          <CalendarIcon className="h-12 w-12 text-muted-foreground" />
        </div>
      )}
```
→ 교체 (상세 헤더는 above-the-fold LCP 후보 → `priority`. 상세 페이지엔 max-width 컨테이너가 없어 `sizes="100vw"`):
```tsx
      {event.coverImageUrl ? (
        <div className="relative h-48 w-full overflow-hidden rounded-lg">
          <Image
            src={event.coverImageUrl}
            alt={event.title}
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex h-48 w-full items-center justify-center rounded-lg bg-muted">
          <CalendarIcon className="h-12 w-12 text-muted-foreground" />
        </div>
      )}
```

- [ ] **Step 4: 정적 게이트**

Run: `npm run lint` → 기대: 0 problems (eslint-disable 줄 제거로 `@next/next/no-img-element` 잔존 없음)
Run: `npx tsc --noEmit` → 기대: 에러 0
Run: `npm run build` → 기대: 성공.

- [ ] **Step 5: 런타임 이미지 렌더 검증 (회귀 1순위)**

`npm run start`로 로컬 production 서버 기동. 공유 컨텍스트의 magiclink 인증 + `P4B-TEST` 시드(cover 포함) 수행 후:
- 홈(`/`) 카드와 `/events/{시드 id}` 상세 헤더에서 cover 이미지가 **정상 표시**되는지.
- 브라우저 DevTools Network에서 이미지 요청이 `/_next/image?url=...&w=...&q=...` 최적화 엔드포인트를 경유하고 응답 `Content-Type`이 `image/webp`(또는 avif)인지.
- 기대 실패 모드: remotePatterns 누락 시 `/_next/image`가 `400` → 즉시 발견. (이 경우 Step 1 hostname/pathname 재확인.)

검증 후 시드 정리: `delete from v2_events where invite_code like 'P4B-%'`.

- [ ] **Step 6: Commit**

```bash
git add next.config.ts components/events/event-card.tsx components/events/event-detail-header.tsx
git commit -m "feat(4-B): cover 이미지 next/image 전환 + Supabase remotePatterns"
```

---

## Task 3: invite generateMetadata + React.cache dedup

**Files:**
- Modify: `lib/queries/events.ts:1-4,25-45`
- Modify: `app/invite/[code]/page.tsx:1-4` (+ generateMetadata 추가)

- [ ] **Step 1: `lib/queries/events.ts` — getEventById/getEventByInviteCode를 React.cache로 래핑**

1행 근처 import에 추가:
```ts
import { cache } from "react";
```
기존 25-34행:
```ts
/** id로 이벤트 조회. */
export async function getEventById(id: string): Promise<Event | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v2_events_with_status")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? mapEventRow(data) : null;
}
```
→ 교체:
```ts
/** id로 이벤트 조회. generateMetadata + 페이지 본문이 공유 → 요청 내 1회로 dedup. */
export const getEventById = cache(async (id: string): Promise<Event | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v2_events_with_status")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? mapEventRow(data) : null;
});
```
기존 36-45행:
```ts
/** invite_code로 이벤트 조회. anon도 호출 가능 (SECURITY DEFINER 함수). */
export async function getEventByInviteCode(code: string): Promise<Event | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("v2_get_event_by_invite_code", {
    p_code: code,
  });
  // 함수 반환은 단일 row 형태. id 누락 시 미존재로 간주.
  if (!data || !(data as EventWithStatusRow).id) return null;
  return mapEventRow(data as EventWithStatusRow);
}
```
→ 교체:
```ts
/** invite_code로 이벤트 조회. anon도 호출 가능 (SECURITY DEFINER 함수). 요청 내 1회 dedup. */
export const getEventByInviteCode = cache(
  async (code: string): Promise<Event | null> => {
    const supabase = await createClient();
    const { data } = await supabase.rpc("v2_get_event_by_invite_code", {
      p_code: code,
    });
    // 함수 반환은 단일 row 형태. id 누락 시 미존재로 간주.
    if (!data || !(data as EventWithStatusRow).id) return null;
    return mapEventRow(data as EventWithStatusRow);
  },
);
```
(named export 유지 — 호출자 `app/events/[id]/page.tsx`, `app/invite/[code]/page.tsx`, `lib/queries`는 영향 없음.)

- [ ] **Step 2: `app/invite/[code]/page.tsx`에 generateMetadata 추가**

기존 1-4행:
```ts
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { InvitePreview } from "@/components/invite/invite-preview";
import { getEventByInviteCode } from "@/lib/queries/events";
```
→ 교체:
```ts
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvitePreview } from "@/components/invite/invite-preview";
import { getEventByInviteCode } from "@/lib/queries/events";
import { formatKstDateLong } from "@/lib/datetime";
```
`InviteContent` 함수 정의 바로 위(import 블록 다음)에 추가:
```ts
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
```

- [ ] **Step 3: 정적 게이트**

Run: `npx tsc --noEmit` → 기대: 에러 0
Run: `npm run build` → 기대: 성공. **`cacheComponents` 관련 dynamic 경계 경고가 새로 뜨지 않는지 확인** (supabase client는 쿠키 의존이라 이미 dynamic — generateMetadata 추가로 경고가 늘면 안 됨).

- [ ] **Step 4: OG 메타 검증**

`npm run start` 후 anon 상태로 `/invite/P4B-TEST` 접속 → `view-source` 또는 DevTools Elements `<head>`에서:
- `<title>{이벤트명} — 초대장</title>`
- `<meta property="og:title" ...>`, `og:description`, `og:image`(cover URL), `og:type=website`
- `<meta name="twitter:card" content="summary_large_image">`
- `<meta name="robots" content="noindex, nofollow">` (또는 동등)
- cover 없는 이벤트: `og:image`가 정적 `/opengraph-image.png` 상속인지.

- [ ] **Step 5: Commit**

```bash
git add lib/queries/events.ts app/invite/[code]/page.tsx
git commit -m "feat(4-B): invite OG generateMetadata + React.cache 요청 dedup"
```

---

## Task 4: /events/[id] generateMetadata (부차)

**Files:**
- Modify: `app/events/[id]/page.tsx:1-15` (+ generateMetadata 추가)

- [ ] **Step 1: import에 Metadata 타입 추가**

기존 2행 근처:
```ts
import { notFound } from "next/navigation";
```
바로 위 또는 아래에 추가:
```ts
import type { Metadata } from "next";
```
(`getEventById`는 이미 11행에서 import됨 — 추가 불필요.)

- [ ] **Step 2: generateMetadata 추가**

`EventDetailContent` 함수 정의 위(import 블록 다음)에 추가:
```ts
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventById(id);
  // 인증 게이트라 크롤러 무관 — 앱 내 탭 타이틀/북마크용 title 만.
  return { title: event ? event.title : "이벤트", robots: { index: false } };
}
```
(Task 3에서 `getEventById`를 `React.cache`로 감쌌으므로 본문 `EventDetailContent`의 재호출과 dedup된다.)

- [ ] **Step 3: 정적 게이트**

Run: `npx tsc --noEmit` → 기대: 에러 0
Run: `npm run build` → 기대: 성공.

- [ ] **Step 4: Commit**

```bash
git add app/events/[id]/page.tsx
git commit -m "feat(4-B): /events/[id] generateMetadata (탭 타이틀)"
```

---

## Task 5: robots.ts + sitemap.ts

**Files:**
- Create: `app/robots.ts`
- Create: `app/sitemap.ts`

- [ ] **Step 1: `app/robots.ts` 생성**

```ts
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/**
 * 인증 게이트 앱: 비공개 라우트는 검색 색인 차단.
 * /invite 는 disallow 하지 않는다 — robots.txt 로 막으면 일부 unfurler 가 OG 를 못 읽어
 * 공유 미리보기가 깨질 수 있어, 색인 차단은 invite 페이지의 page-level noindex 가 담당.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/my-events", "/profile", "/events", "/auth"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
```

- [ ] **Step 2: `app/sitemap.ts` 생성**

```ts
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/** 공개 색인 대상은 홈뿐(인증 게이트). invite 는 코드 비밀 + noindex 라 제외. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteUrl, changeFrequency: "weekly", priority: 1 }];
}
```

- [ ] **Step 3: 정적 게이트**

Run: `npx tsc --noEmit` → 기대: 에러 0
Run: `npm run build` → 기대: 성공. 출력 route 목록에 `/robots.txt`, `/sitemap.xml` 등장(총 route 25 → 27).

- [ ] **Step 4: 런타임 검증**

`npm run start` 후:
- `/robots.txt` → `User-Agent: *`, `Allow: /`, `Disallow: /admin` … 5개, `Sitemap: {siteUrl}/sitemap.xml` 확인.
- `/sitemap.xml` → 홈 URL 1건 확인.

- [ ] **Step 5: Commit**

```bash
git add app/robots.ts app/sitemap.ts
git commit -m "feat(4-B): robots/sitemap — 비공개 라우트 색인 차단 + 홈 sitemap"
```

---

## Task 6: Recharts 지연 로드 (admin analytics)

**Files:**
- Create: `components/charts/event-trend-chart-lazy.tsx`
- Create: `components/charts/status-pie-chart-lazy.tsx`
- Modify: `app/admin/(authed)/analytics/page.tsx:1-9,81,90`

- [ ] **Step 1: build 전 baseline 측정**

Run: `npm run build` → 출력에서 `/admin/analytics` 행의 **First Load JS** 값을 기록(나중 비교용).

- [ ] **Step 2: `components/charts/event-trend-chart-lazy.tsx` 생성**

```tsx
"use client";

import dynamic from "next/dynamic";

/**
 * Recharts(무거운 client 전용 라이브러리)를 지연 로드해 admin analytics 라우트의
 * First Load JS 에서 분리한다. Server Component 인 analytics 페이지는 ssr:false 를
 * 직접 못 쓰므로 이 client 래퍼를 경유한다. 로딩 스켈레톤 높이는 차트(h-64)와 일치.
 */
export const EventTrendChartLazy = dynamic(
  () => import("./event-trend-chart").then((m) => m.EventTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-md bg-muted" />
    ),
  },
);
```

- [ ] **Step 3: `components/charts/status-pie-chart-lazy.tsx` 생성**

```tsx
"use client";

import dynamic from "next/dynamic";

/** Recharts 지연 로드 — admin analytics 초기 번들에서 분리. EventTrendChartLazy 와 동일 패턴. */
export const StatusPieChartLazy = dynamic(
  () => import("./status-pie-chart").then((m) => m.StatusPieChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-md bg-muted" />
    ),
  },
);
```

- [ ] **Step 4: analytics 페이지 import/usage 교체**

기존 1-9행:
```ts
import { Suspense } from "react";
import {
  EventTrendChart,
  type TrendPoint,
} from "@/components/charts/event-trend-chart";
import {
  StatusPieChart,
  type StatusSlice,
} from "@/components/charts/status-pie-chart";
```
→ 교체 (값은 lazy 래퍼, 타입은 `import type`으로만 — 서버 모듈 그래프에 Recharts 미유입):
```ts
import { Suspense } from "react";
import { EventTrendChartLazy } from "@/components/charts/event-trend-chart-lazy";
import { StatusPieChartLazy } from "@/components/charts/status-pie-chart-lazy";
import type { TrendPoint } from "@/components/charts/event-trend-chart";
import type { StatusSlice } from "@/components/charts/status-pie-chart";
```
JSX 사용처 2곳 교체:
- 81행 `<EventTrendChart data={trend} />` → `<EventTrendChartLazy data={trend} />`
- 90행 `<StatusPieChart data={slices} />` → `<StatusPieChartLazy data={slices} />`

- [ ] **Step 5: 정적 게이트 + 번들 비교**

Run: `npx tsc --noEmit` → 기대: 에러 0
Run: `npm run lint` → 기대: 0 problems
Run: `npm run build` → 기대: 성공. `/admin/analytics`의 First Load JS가 Step 1 baseline 대비 **감소**(Recharts가 별도 lazy 청크로 분리). 감소가 없으면 `import type`이 값 import로 새지 않았는지(서버 페이지가 원본 차트를 값으로 import하지 않는지) 재확인.

- [ ] **Step 6: 런타임 검증**

`npm run start` + admin(host1) 인증 후 `/admin/analytics` → 차트 영역이 **스켈레톤(animate-pulse) 잠깐 표시 후 차트로 교체**되는지, 두 차트 모두 정상 렌더되는지. 빈 데이터 시 StatusPieChart "표시할 데이터가 없습니다" 분기 유지 확인.

- [ ] **Step 7: Commit**

```bash
git add components/charts/event-trend-chart-lazy.tsx components/charts/status-pie-chart-lazy.tsx "app/admin/(authed)/analytics/page.tsx"
git commit -m "perf(4-B): Recharts 지연 로드 — analytics First Load JS 분리"
```

---

## Task 7 (선택): Vercel Speed Insights

> spec §3.11 stretch. production Web Vitals 자동 수집이 필요할 때만. 생략 가능.

**Files:**
- Modify: `package.json` (의존성 추가)
- Modify: `app/layout.tsx`

- [ ] **Step 1: 패키지 설치**

Run: `npm install @vercel/speed-insights` → 기대: package.json dependencies에 추가.

- [ ] **Step 2: layout에 컴포넌트 추가**

import 추가:
```ts
import { SpeedInsights } from "@vercel/speed-insights/next";
```
`<Analytics />` 바로 아래에 추가:
```tsx
        <Analytics />
        <SpeedInsights />
```

- [ ] **Step 3: 게이트 + Commit**

Run: `npx tsc --noEmit` → 에러 0
Run: `npm run build` → 성공
```bash
git add package.json package-lock.json app/layout.tsx
git commit -m "chore(4-B): Vercel Speed Insights 추가"
```

---

## Task 8: 통합 검증 — Lighthouse + 최종 회귀 + 결과 기록

**Files:**
- Create: `docs/v2-phase4/lighthouse-4b.md` (결과 기록)

- [ ] **Step 1: Lighthouse 도구 가용성 확인**

Run: `npx lighthouse --version` → 설치/실행 가능 여부 확인.
- 가능: Step 2 진행.
- 불가: PageSpeed Insights API(production URL 대상) 또는 gstack-benchmark 스킬로 대체. (인증 게이트라 측정 대상은 공개 페이지로 제한.)

- [ ] **Step 2: 측정 (production 또는 로컬 prod 서버)**

대상: `/invite/P4B-TEST`(콘텐츠 有 — 90+ 주 타깃) + `/`(빈 상태).
Run(예시):
```
npx lighthouse http://localhost:3000/invite/P4B-TEST --only-categories=performance,seo,best-practices,accessibility --chrome-flags="--headless" --output=json --output-path=./lh-invite.json
```
기대: performance ≥ 90. 미달 시 원인(이미지·폰트·JS) 분석 후 해당 Task로 회귀.

- [ ] **Step 3: 최종 회귀 게이트**

Run: `npm run lint` → 0 problems
Run: `npx tsc --noEmit` → 에러 0
Run: `npm run build` → 성공, route 27, 0 warning

- [ ] **Step 4: 결과 문서화**

`docs/v2-phase4/lighthouse-4b.md`에 작성:
- 측정 환경(로컬 prod / production URL), 대상 페이지, 4개 카테고리 점수
- next/image 적용 전후 이미지 응답 포맷·크기 비교
- `/admin/analytics` First Load JS baseline→after
- 미달 항목·후속 메모

- [ ] **Step 5: 시드 정리 + Commit**

시드 정리: `delete from v2_events where invite_code like 'P4B-%'` (Supabase MCP).
```bash
git add docs/v2-phase4/lighthouse-4b.md lh-invite.json
git commit -m "docs(4-B): Lighthouse 측정 결과 + 최종 회귀"
```
(`lh-*.json`을 커밋하기 싫으면 `.gitignore` 추가 후 결과만 md에 요약.)

---

## Self-Review

**1. Spec coverage:**
- W1 이미지 → Task 2 ✅ (remotePatterns + 2 컴포넌트 next/image)
- W2 OG → Task 1(siteUrl/metadataBase) + Task 3(invite generateMetadata + React.cache) + Task 4(/events/[id]) ✅
- W3 robots/sitemap → Task 5 ✅
- W4 번들 → Task 6(Recharts) ✅; Lighthouse → Task 8 ✅; SpeedInsights → Task 7(선택) ✅
- 검증 계획(spec §4) → 각 Task의 정적 게이트 + Task 2/3/5/6 런타임 + Task 8 Lighthouse ✅
- 위험(spec §5): remotePatterns 하드코딩(Task 2 주석), cacheComponents 경고(Task 3 Step 3), sizes 정확도(Task 2 — 실제 그리드값 반영 완료), Lighthouse 도구 가용성(Task 8 Step 1) ✅

**2. Placeholder scan:** "TBD/TODO/적절히" 없음. 모든 코드 단계에 전체 코드 제시. 런타임 검증은 구체 관찰 항목으로 명시.

**3. Type consistency:** `getEventById`/`getEventByInviteCode`는 `cache(async ...)`로 감싸도 시그니처 `(string) => Promise<Event|null>` 동일 → 호출자 영향 0. lazy 래퍼 export명 `EventTrendChartLazy`/`StatusPieChartLazy`는 Task 6 Step 2/3 정의와 Step 4 사용처 일치. `siteUrl` export명은 Task 1 정의 ↔ Task 5(robots/sitemap) 사용 일치. `TrendPoint`/`StatusSlice` 타입은 원본 차트 파일에서 `import type`으로 재참조 — 정의 위치 변화 없음.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-02-event-platform-v2-phase4b-perf-seo.md`.**
