---
created: 2026-06-02
project: nextjs-supabase-app (v2)
branch: feat/event-platform-v2
phase: 4-B 성능·SEO
status: design (승인됨 2026-06-02)
shrimp: c012a0c8-35f6-4c97-b863-5218b9e57299
depends_on: 4-C.1 Vercel 실배포 (완료 — production URL 확보)
---

# Phase 4-B 성능·SEO 설계 — 공유 OG 중심 + 성능

## 1. 목표 / 비목표

### 목표
- **이미지 최적화**: raw `<img>` 2곳 → `next/image` 전환 (lazy/AVIF·WebP/responsive)
- **공유 OG 미리보기**: `/invite/[code]` 링크를 카카오톡·슬랙·소셜에 붙였을 때 이벤트 제목·커버가 카드로 표시
- **인증 앱에 맞는 색인 정책**: 비공개 라우트는 검색 색인 차단, 초대 링크는 색인 금지하되 OG unfurl은 유지
- **번들·측정**: admin 전용 Recharts 지연 로드 + production `/invite/[code]` 기준 Lighthouse 90+

### 비목표 (YAGNI)
- **동적 OG 이미지 생성**(`opengraph-image.tsx` + `ImageResponse`): 학습 가치는 크나 edge runtime·폰트·런타임 생성비용이 "성능" 목표와 상충. 4-B 외 후속(별도 spec)으로 분리.
- **Avatar의 `next/image` 전환**: Radix `AvatarImage`(작은 썸네일), 체감·ROI 낮음. 제외.
- **검색 색인 유도(풀 SEO)**: 인증 게이트라 색인 가능한 공개 콘텐츠가 사실상 없음. sitemap은 홈만 등록하는 최소 구현.

## 2. 현재 상태 (탐색 결과, 2026-06-02)

### 공개(미인증·크롤러 도달) 라우트
`lib/supabase/proxy.ts` WHITELIST 기준:
- `/` (anon은 RLS상 빈 상태 — `v2_events`는 `authenticated`만 SELECT)
- `/auth/*`, `/admin/login`
- `/invite/[code]` — **유일하게 콘텐츠가 있는 공개 페이지**. `getEventByInviteCode`만 `SECURITY DEFINER` RPC(`v2_get_event_by_invite_code`)라 anon 조회 가능.

`/events/[id]`는 WHITELIST에 없음 → 비로그인 시 `/auth/login` redirect. **크롤러·unfurler 도달 불가** → OG의 실효 타깃은 `/invite/[code]` 단 하나.

### 이미지
- `components/events/event-card.tsx:23` — `<img src={event.coverImageUrl} className="h-full w-full object-cover">`. 부모 `div.relative.h-32.w-full`. `eslint-disable @next/next/no-img-element`.
- `components/events/event-detail-header.tsx:17` — `<img ... className="h-48 w-full rounded-lg object-cover">`. cover 없으면 아이콘 fallback div.
- cover URL = Supabase storage public URL: `https://bwtzjdoonhnwrroxoxkf.supabase.co/storage/v1/object/public/event-covers/events/{eventId}/cover.{ext}` (jpg/png/webp, ≤2MB). `lib/storage/event-covers.ts:45` `getPublicUrl`.
- `next.config.ts`에 `images` 설정 **전무**.

### 메타데이터
- `app/layout.tsx`: 정적 `title`/`description`, `metadataBase = process.env.VERCEL_URL ? https://${VERCEL_URL} : http://localhost:3000`.
- `app/opengraph-image.png`, `app/twitter-image.png` 정적 파일 존재 → Next가 전 페이지에 OG/Twitter 메타 자동 상속.
- 없음: `app/robots.ts`, `app/sitemap.ts`, per-route `generateMetadata`, `app/icon.*`.

### 번들
- `recharts ^2.15.4` — admin analytics 전용. 무거움.
- `@vercel/analytics` 설치(`app/layout.tsx`의 `<Analytics />`). `@vercel/speed-insights` 미설치.
- `next.config.ts`: `cacheComponents: true`.

## 3. 설계 — 4 워크스트림

### W1 · 이미지 최적화 (`next/image`)

**3.1 `next.config.ts` — remotePatterns 추가 (선행 필수)**
```ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bwtzjdoonhnwrroxoxkf.supabase.co",
        pathname: "/storage/v1/object/public/event-covers/**",
      },
    ],
  },
};
```
- 이 허용이 없으면 `next/image`가 원격 URL을 런타임에 거부(`400`)하여 이미지가 통째로 막힘 → 회귀의 1순위 검증 항목.
- `pathname`을 버킷 경로까지 좁혀 SSRF/오용 표면 최소화.

**3.2 `event-card.tsx` (목록 카드, h-32)**
- `<img>` → `<Image fill sizes={...} className="object-cover">`. 부모가 이미 `relative` → `fill` 가능.
- `sizes`: 홈 그리드 컬럼 수에 맞춤. 구현 시 실제 그리드 클래스(`upcoming-events-infinite.tsx` / 카드 그리드)를 확인해 확정. 기본안: `"(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"`.
- `priority` 미설정(목록은 below-the-fold 다수, lazy 유지).
- `eslint-disable` 줄 제거.

**3.3 `event-detail-header.tsx` (상세, h-48)**
- cover 분기 유지. cover 있는 경우 컨테이너 `div.relative.h-48.w-full.overflow-hidden.rounded-lg` + `<Image fill className="object-cover" sizes="(max-width: 768px) 100vw, 768px" priority>`.
- `priority`: 상세 페이지 above-the-fold LCP 후보 → 설정. (단 cover 없는 fallback은 아이콘이므로 priority 무관.)
- `eslint-disable` 줄 제거.

### W2 · OG 메타데이터 (공유 미리보기)

**3.4 canonical site URL 중앙화 — `lib/site-url.ts` (신규)**
```ts
/** 배포 환경별 canonical origin. OG 절대경로·robots·sitemap 공용. */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
```
- 우선순위: 명시적 `NEXT_PUBLIC_SITE_URL` > `VERCEL_PROJECT_PRODUCTION_URL`(production 고정 도메인) > `VERCEL_URL`(배포별 URL) > localhost.
- `VERCEL_URL`만 쓰면 preview마다 OG 절대경로가 바뀌어 공유 카드가 깨질 수 있음 → production 도메인 우선.
- `app/layout.tsx`의 `metadataBase = new URL(siteUrl)`로 교체.

**3.5 `app/invite/[code]/page.tsx` — `generateMetadata` (핵심)**
- 이벤트 title·description·cover로 OG/Twitter 카드 생성. cover 있으면 `og:image`, 없으면 정적 `opengraph-image.png` 상속(images 미지정 시 자동 상속).
- **색인 금지**: `robots: { index: false, follow: false }` (초대코드는 비밀 — 검색 색인 차단). 단 이는 페이지 레벨 meta라 **unfurler는 페이지를 직접 fetch해 OG를 읽으므로 공유 미리보기는 유지됨** (robots.txt disallow와의 차이는 §3.7 참조).
- 구현 형태:
```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const { code } = await params;
  const event = await getEventByInviteCode(code);
  if (!event) return { title: "초대장을 찾을 수 없습니다", robots: { index: false } };
  const title = `${event.title} — 초대장`;
  const description =
    event.description ?? `${formatKstDateLong(event.eventDate)} · ${event.location}`;
  const images = event.coverImageUrl ? [event.coverImageUrl] : undefined;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, images, type: "website" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
```

**3.6 `generateMetadata` 중복 조회 방지 — `getEventByInviteCode`를 `React.cache`로 래핑**
- `generateMetadata`와 페이지 본문(`InviteContent`)이 같은 요청에서 각각 `getEventByInviteCode`를 호출 → RPC 2회.
- `lib/queries/events.ts`의 `getEventByInviteCode`를 `import { cache } from "react"`로 감싸 요청 내 1회로 dedup. (`getEventById`도 동일 패턴 적용 — `/events/[id]` generateMetadata와 본문 공유.)
- 부수효과 없음(순수 읽기), `cacheComponents`와 무관한 요청 스코프 메모이즈.

**3.7 `app/events/[id]/page.tsx` — `generateMetadata` (부차적)**
- 인증 사용자만 도달 → 크롤러 무관. 앱 내 탭 타이틀·북마크용 `title`만:
```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventById(id);
  return { title: event ? event.title : "이벤트", robots: { index: false } };
}
```

### W3 · robots + sitemap (인증 앱 정책)

**3.8 `app/robots.ts` (신규)**
```ts
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
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
- **`/invite`는 robots.txt에서 disallow하지 않음** — disallow 시 robots를 준수하는 일부 unfurler가 페이지를 fetch하지 않아 OG가 깨질 수 있음. 대신 §3.5 페이지 레벨 `index:false`로 검색 색인만 차단. 순효과("초대는 검색에 안 뜸 + 공유 미리보기는 됨")는 동일하면서 OG 안전.
- 비공개 앱 라우트는 검색 노출 자체를 차단.

**3.9 `app/sitemap.ts` (신규)**
```ts
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteUrl, changeFrequency: "weekly", priority: 1 }];
}
```
- 공개 색인 대상이 홈뿐이라 최소 구현. invite 개별 URL은 코드 비밀 + 색인 금지라 제외.

### W4 · 번들 + Lighthouse

**3.10 Recharts 지연 로드**
- admin analytics 차트 컴포넌트를 `next/dynamic`(`ssr: false`, `loading: () => <Skeleton/>`)로 지연 로드. 구현 시 정확한 차트 컴포넌트 경로 확인(`app/admin/(authed)/analytics/page.tsx` 및 그 하위 차트 컴포넌트).
- 일반 사용자 번들엔 원래 미포함이나, admin 초기 로드·JS 파싱 비용 개선 + 학습 가치.

**3.11 (선택/stretch) `@vercel/speed-insights`**
- production Web Vitals 자동 수집. Hobby에서 동작. `app/layout.tsx`에 `<SpeedInsights />` 추가. 4-B 필수 아님 — 측정 자동화가 필요하면 포함.

## 4. 검증 계획

순서대로, 각 단계 PASS 확인:
1. **정적 게이트**: `npm run lint` 0, `npx tsc --noEmit` 0, `npm run build` (라우트 수 유지, 0 warning). robots/sitemap 라우트가 빌드 산출물에 등장하는지 확인.
2. **이미지 렌더(회귀 1순위)**: production(또는 `next build && next start`)에서 cover 있는 이벤트의 목록 카드·상세 헤더 이미지가 정상 표시되는지 + Network에서 `/_next/image?url=...` 최적화 경유 + `Content-Type: image/webp`(또는 avif) 확인. remotePatterns 누락 시 400 → 즉시 발견.
3. **OG 카드**: production `/invite/{code}` HTML `view-source`에서 `og:title`·`og:description`·`og:image`(cover URL)·`twitter:card=summary_large_image`·`robots: noindex` 확인. cover 없는 이벤트는 정적 png 상속 확인. (가능하면 카카오/슬랙 실 unfurl 또는 메타 디버거.)
4. **robots/sitemap**: `/robots.txt`에 disallow 목록 + sitemap 라인, `/sitemap.xml`에 홈 URL 확인.
5. **번들**: build 출력의 admin analytics 라우트 First Load JS가 Recharts 분리 후 감소했는지 비교. dynamic import로 analytics 차트가 별도 청크인지 확인.
6. **Lighthouse**: production `/invite/{code}`(콘텐츠 有 — 90+ 주 타깃)와 `/`(빈 상태) 측정. 도구: `npx lighthouse <url> --only-categories=performance,seo,best-practices,accessibility --chrome-flags="--headless"` 또는 gstack-benchmark. **도구 가용성(로컬 Chrome/lighthouse 설치)을 구현 단계에서 먼저 확인** — 미설치 시 PageSpeed Insights API 또는 Playwright trace로 대체.

## 5. 위험 / 미해결

- **remotePatterns 호스트 하드코딩**: Supabase 프로젝트 ref(`bwtzjdoonhnwrroxoxkf`)가 URL에 박힘. `NEXT_PUBLIC_SUPABASE_URL`에서 hostname을 파생하는 방식도 가능하나 `next.config.ts`는 정적 평가라 env 파싱이 번거로움 → **하드코딩 채택**(프로젝트 1개 고정). 프로젝트 이전 시 수정 필요 — 주석 명시.
- **`cacheComponents`와 `generateMetadata`**: supabase server client는 쿠키를 읽어 dynamic. `React.cache` 래핑으로 요청 내 dedup은 되나, `cacheComponents` 빌드에서 dynamic 경계 경고가 없는지 build 단계에서 확인.
- **`event-card.tsx` sizes 정확도**: 실제 그리드 breakpoint를 구현 시 확인해 `sizes` 확정(틀리면 과대/과소 다운로드).
- **Lighthouse 측정 환경**: 인증 게이트라 측정 대상이 `/invite/{code}`(유효 코드 필요) + `/`로 제한. 측정용 invite 코드는 §검증 시 시드 이벤트(`P4B-` prefix) 사용 후 정리.

## 6. 영향 파일 요약

신규:
- `lib/site-url.ts`
- `app/robots.ts`
- `app/sitemap.ts`

수정:
- `next.config.ts` (images.remotePatterns)
- `app/layout.tsx` (metadataBase ← siteUrl)
- `components/events/event-card.tsx` (Image)
- `components/events/event-detail-header.tsx` (Image)
- `app/invite/[code]/page.tsx` (generateMetadata)
- `app/events/[id]/page.tsx` (generateMetadata)
- `lib/queries/events.ts` (getEventByInviteCode/getEventById ← React.cache)
- admin analytics 차트 컴포넌트 (dynamic import)
- (선택) `app/layout.tsx` SpeedInsights
