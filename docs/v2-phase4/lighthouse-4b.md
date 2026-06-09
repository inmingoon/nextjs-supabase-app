# Phase 4-B 성능·SEO — 구현 결과 + 검증 기록

> Plan: `docs/superpowers/plans/2026-06-02-event-platform-v2-phase4b-perf-seo.md`
> Spec: `docs/superpowers/specs/2026-06-02-event-platform-v2-phase4b-perf-seo-design.md`
> 작성일: 2026-06-08(구현·정적 게이트) · 런타임 실측: 2026-06-09 · 브랜치: `feat/profiles-table`

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

## 5. 런타임 검증 — 로컬 prod 실측 (2026-06-09)

`npm run build && npm run start`(Next 16.2.6, `:3000`) 기동 후, **anon 상태**로 검증.
`/invite/[code]` 는 `lib/supabase/proxy.ts:72` 화이트리스트(`path.startsWith("/invite/")`)로 비로그인 접근이 허용되므로 magiclink 인증 단계 없이 측정 — 이는 unfurler 봇(쿠키 없음)의 OG fetch 를 보장하는 설계 결정과 동일하다. 대상 이벤트는 cover 있는 기존 이벤트 `8f0fe58a…`(invite_code `qM4-…`)를 사용(별도 시드 불필요).

### 5.1 Lighthouse (4개 카테고리)

| 페이지 | performance | accessibility | best-practices | seo |
|--------|:-----------:|:-------------:|:--------------:|:---:|
| `/`(빈 상태, `lh-home.json`) | **97** | 100 | 96 | 100 |
| `/invite/{code}`(콘텐츠 有, `lh-invite.json` 1차 / 2차) | **86 / 88** | 98 | 96 | 91 |

invite Core metrics(1차/2차): FCP 0.8s/0.8s · **LCP 2.9s/3.0s** · TBT 380ms/310ms · CLS 0/0.

**performance 90 미달 — 원인 규명 (코드 결함 아님, 측정 환경):**
- 감점 기여: TBT(weight 30, score 70) + LCP(weight 25, score 81). unused-JS 28KB/150ms 가 유일한 코드 기회.
- 서버 응답 타이밍: `/invite` TTFB ~10ms(PPR 정적 셸 즉시) 이나 total(스트리밍 완료) **0.9~1.7s**. 이 구간이 `getEventByInviteCode`(원격 Supabase SECURITY DEFINER RPC) 왕복 + Suspense 스트리밍. LCP(제목 텍스트)는 이 스트리밍 종료 후 그려지므로 **LCP ≈ 원격 RPC 왕복 + 폰트/하이드레이션**. 로컬 서버→원격 Supabase 왕복이 LCP 주성분.
- TBT 310~380ms 변동은 측정 머신 동시 CPU 부하(헤드리스 Chrome 과 경쟁) 노이즈.
- invite 페이지는 구조적으로 경량(`InvitePreview` = useTransition/sonner/Button/lucide 2개, 차트·에디터·날짜피커 없음, 본문에 cover 미렌더). 로컬에서 코드로 perf 를 끌어올릴 여지가 사실상 없음.
- **결론:** perf 90 확정은 **Vercel preview/production**(동일 리전 엣지 → RPC 왕복 축소, 전용 CPU)에서 재측정으로 닫는다. 나머지 3개 카테고리(98/96/91)는 로컬에서 이미 통과.

### 5.2 이미지 최적화 경유 — ✅

`/_next/image?url={cover}&w=640&q=75` (Accept: image/webp) → **status 200, Content-Type `image/webp`, 16,146 bytes** (원본 `cover.png` 315,211 bytes → ~95%↓). `next.config.ts` `remotePatterns` Supabase 호스트 허용이 동작(미등록 시 400). Task 2 전환 실동작 확증.

### 5.3 OG / robots / sitemap — ✅

- `/invite/{code}` `<head>`(anon, 200): `og:title`=`"dddd22222 — 초대장"`, `og:description`, `og:image`=cover URL, `og:type=website`, `twitter:card=summary_large_image`(+title/description/image), `robots: noindex, nofollow`. → 검색 색인은 차단하되 unfurl 미리보기는 유지.
- `/robots.txt`: `Allow: /` + `Disallow: /admin /my-events /profile /events /auth`(5개) + `Sitemap:` 절대 URL. `/invite` 는 미차단(unfurl 허용, 일관).
- `/sitemap.xml`: 홈 1건(priority 1, changefreq weekly).

### 5.4 Recharts 지연 로드 런타임 — ✅ (2026-06-09, admin magiclink 로그인)

`inmingoon@gmail.com`(v2_admin) magiclink 인증 → `/admin/analytics` 도달 후 Playwright 관측:
- **"차트 로딩..." fallback 표시 → 차트로 교체**. recharts 가 초기 번들에 인라인됐다면 fallback 없이 즉시 렌더됐을 것 → fallback 관측 자체가 **온디맨드 청크 로드 확정**(Network: 차트 청크가 초기 청크 묶음과 분리되어 후행 200 로드). §3 정적 청크 격리(별도 해시)와 일치.
- EventTrendChart(월별 생성 수, X축 `2026-05`) + StatusPieChart(상태 분포: 예정 1·진행 0·종료 8) 정상 렌더. 데이터 존재로 "표시할 데이터가 없습니다" 빈 분기는 미발동(코드상 존재, 별도 케이스).
- Console error 는 `/_vercel/insights/script.js` 404 (로컬 전용 — Vercel Web Analytics 는 배포 환경에서만 서빙) — 차트와 무관.

## 6. 폰트 self-host (후속 #3, 2026-06-09 · 커밋 `d69e933`)

`app/layout.tsx` 의 Geist 를 `next/font/google` → Vercel `geist` 패키지(`geist/font/sans`, 폰트 파일 npm 동봉)로 전환.
- **이유**: `next/font/google` 은 **빌드 타임에 fonts.googleapis.com 에서 폰트를 fetch** 해 self-host 로 인라인한다. 이 환경의 간헐 Google Fonts egress 차단 시 빌드가 폰트 단계(`app/layout.tsx`)에서 실패 — 이번 세션에서 2회 관측(DNS resolve timeout, status 000).
- **검증**: 폰트 fetch 제거 후 **egress 차단 상태에서도** `npm run build` exit 0, route 27 — 빌드의 외부 폰트 의존이 제거됨을 확정. tsc/lint 통과.
- 동일 Geist 폰트라 시각/타이포 변화 없음. self-host 라 LCP 의 폰트 swap 대기도 소폭 개선(§5.1 perf 후속에 긍정적).
