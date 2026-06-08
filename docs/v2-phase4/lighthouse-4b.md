# Phase 4-B 성능·SEO — 구현 결과 + 검증 기록

> Plan: `docs/superpowers/plans/2026-06-02-event-platform-v2-phase4b-perf-seo.md`
> Spec: `docs/superpowers/specs/2026-06-02-event-platform-v2-phase4b-perf-seo-design.md`
> 작성일: 2026-06-08 · 브랜치: `feat/event-platform-v2`

## 1. 구현 요약 (Task 1~6 완료, Task 7 생략)

| Task | 내용 | 커밋 |
|------|------|------|
| 1 | canonical `siteUrl` 중앙화(`lib/site-url.ts`) + `metadataBase` 연결 | `459bac8` (+ 슬래시 정규화 `4243ea3`) |
| 2 | cover `<img>` → `next/image` (`event-card`, `event-detail-header`) + Supabase `remotePatterns` | `6c2c4c4` |
| 3 | `/invite/[code]` `generateMetadata`(OG/Twitter/noindex) + `getEventById`·`getEventByInviteCode` `React.cache` dedup | `9f5bacf` |
| 4 | `/events/[id]` `generateMetadata`(탭 타이틀, noindex) | `f8b05fb` |
| 5 | `app/robots.ts` + `app/sitemap.ts` — 비공개 라우트 색인 차단 + 홈 sitemap | `9431532` |
| 6 | Recharts `next/dynamic ssr:false` 지연 로드 래퍼 2개 → analytics 초기 번들 분리 | `256ed0e` |
| 7 | (선택) Vercel Speed Insights | **생략** — 사용자 결정. Web Vitals 는 기존 `<Analytics/>` 로 일부 커버, 필요 시 독립 커밋으로 후속. |

## 2. 정적 게이트 결과 (최종 회귀)

| 명령 | 기대 | 결과 |
|------|------|------|
| `npm run lint` | 0 problems | ✅ 0 problems (eslint-disable `no-img-element` 잔존 없음) |
| `npx tsc --noEmit` | 에러 0 | ✅ 0 |
| `npm run build` | 성공, 0 warning, route 27 | ✅ Compiled successfully, 경고 0, **route 27** (robots.txt·sitemap.xml 포함) |

빌드 라우트 확인:
- `○ /robots.txt`, `○ /sitemap.xml` — 정적 생성으로 신규 추가.
- `◐ /invite/[code]` — `generateMetadata` 추가 후에도 부분 프리렌더 유지(새 dynamic 경계 경고 없음).

## 3. plan 가정 갭 — First Load JS 비교 불가

**Next.js 16.2.6 (Turbopack) 빌드 출력은 라우트별 `Size`/`First Load JS` 컬럼을 출력하지 않는다** (라우트명 + 프리렌더 타입만 표기). plan Task 6 Step 1/5 가 의존한 "baseline→after First Load JS 비교"는 빌드 출력으로는 측정 불가.

대체 검증:
- `.next/static/chunks` 에서 `recharts` 문자열을 포함한 청크가 **별도 해시 청크 3개**(코어 약 361 KB + 서브모듈 약 36 KB / 28 KB)로 격리됨 확인 — 페이지 청크 인라인 아님.
- `dynamic(ssr:false)` 특성상 해당 청크는 클라이언트에서 차트 마운트 시 온디맨드 로드. 최종 "지연 로드 + 스켈레톤 교체" 동작 확증은 §5 런타임 후속.

## 4. next/image 전환 — 검증 메모

- `next.config.ts` `images.remotePatterns` 에 Supabase Storage `event-covers` public URL 호스트(`bwtzjdoonhnwrroxoxkf.supabase.co`) 만 허용. 프로젝트 ref 하드코딩 — 프로젝트 이전 시 함께 갱신 필요(코드 주석에 명시).
- `event-card`: `<Image fill>` + `sizes`(홈 그리드 실측값). `event-detail-header`: `<Image fill priority>`(above-the-fold LCP 후보) + `sizes="100vw"`.
- 응답 포맷(webp/avif) · `/_next/image` 최적화 경유 확인은 §5 런타임 후속.

## 5. 런타임 검증 — 후속(배포 URL 대상)

사용자 결정에 따라 로컬 prod 서버 + 시드 + magiclink 런타임 검증은 보류하고, **배포된 preview/production URL** 대상으로 후속 수행한다. 이 브랜치가 Vercel 에 반영된 뒤 다음을 측정·기록:

1. **Lighthouse** — `/invite/{유효코드}`(콘텐츠 有, performance ≥ 90 주 타깃) + `/`(빈 상태). 4개 카테고리(performance/seo/best-practices/accessibility).
2. **이미지** — 카드·상세 헤더 cover 정상 표시, Network 에서 `/_next/image?url=...` 경유 + `Content-Type: image/webp`(또는 avif).
3. **OG 메타** — `/invite/{코드}` `<head>` 에 `og:title`/`og:description`/`og:image`(cover)/`og:type=website`, `twitter:card=summary_large_image`, `robots: noindex,nofollow`. cover 없는 이벤트는 정적 `/opengraph-image.png` 상속.
4. **robots/sitemap** — `/robots.txt` (`Disallow: /admin …` 5개 + `Sitemap:` 절대 URL), `/sitemap.xml` (홈 1건).
5. **Recharts** — `/admin/analytics` 차트 영역 스켈레톤(animate-pulse) → 차트 교체, Network 에서 recharts 청크 온디맨드 로드. 빈 데이터 시 StatusPieChart "표시할 데이터가 없습니다" 분기 유지.

미달 시 원인(이미지·폰트·JS) 분석 후 해당 Task 로 회귀.
