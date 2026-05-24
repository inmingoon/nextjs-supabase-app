# Phase 4 — Vercel 배포 + 운영 안정화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ROADMAP Phase 4(Task 011~018)를 단일 plan으로 구현해 v1.1을 출시 — Vercel production URL 확정, smoke test 7단계 PASS, 빌드 산출물 비밀 키 미노출 검증, PRD 사실관계 정정 4건 머지, Next.js 버전 핀 정책 반영, Vercel Analytics 동작 확인까지.

**Architecture:** main 브랜치를 GitHub-Vercel Integration으로 자동 배포(Production Branch = main) → Supabase Auth Redirect URLs를 Vercel URL로 갱신 → 7단계 smoke test로 RSVP 잠금·출석률·OAuth 풀체인 검증. 코드 변경은 `app/layout.tsx`(Analytics 통합) + `package.json`(의존성 핀) + 문서 정정만. **수동 UI 작업과 코드 작업을 명시적으로 분리해 phase 별로 직렬 진행** — 한 phase 실패 시 다음 phase 차단.

**Tech Stack (실측 기준):** Next.js 16.x (`latest`) · React 19 · TypeScript 5 · Tailwind CSS v3.4 (⚠️ ROADMAP은 v4로 표기 — 본 plan에서 정정) · `@supabase/ssr` + `@supabase/supabase-js` · `next-themes` · Radix UI primitives + `sonner` · `proxy.ts` (Next.js 16 Node.js runtime 전용)

**ROADMAP 출처:** [`docs/ROADMAP.md`](../../ROADMAP.md) Phase 4 (Task 011~018)

---

## 정찰 기반 사전 보고 (Phase 0 — 사용자 확정 필요)

본 plan 실행 직전 ROADMAP / PRD 표기와 실제 코드 상태 사이 **불일치 5건**을 발견했다. plan에 정정 항목을 박았으나, 사용자가 본 plan을 승인하기 전 다음을 확인 권장:

| # | 불일치 | 출처 | 본 plan 처리 |
| --- | ------ | ---- | ------------ |
| F1 | ROADMAP "기술 스택 ✅" — **Tailwind CSS v4** | `package.json` 실측: `tailwindcss: ^3.4.1` + `autoprefixer` + `tailwindcss-animate` (v3 셋업) | Phase 1 Task 1.3에서 ROADMAP "이미 설치됨" 항목 정정 |
| F2 | ROADMAP "이미 설치됨 ✅" — **shadcn/ui (new-york 스타일)** | `package.json`에 shadcn/ui 직접 의존성 없음. Radix UI primitives + `class-variance-authority` + `tailwind-merge` + `sonner`만 명시 (shadcn은 CLI로 컴포넌트를 복사하는 도구라 의존성에 안 잡히는 게 정상) | 정상. ROADMAP 표기는 유지하되 Phase 1 Task 1.3 메모에 "CLI 복사형이므로 dependency에 안 잡힘" 명시 |
| F3 | ROADMAP "이미 설치됨 ✅" — **TypeScript 5.6+** | `package.json`: `typescript: ^5` (정확 버전 명시 없음, 5.0+ 허용) | Phase 1 Task 1.3에서 실측 버전(`npx tsc --version`)으로 정정 |
| F4 | ROADMAP "이미 설치됨 ✅" — **ESLint, Prettier** | `package.json`: ESLint만 있고 **Prettier 없음**. Husky도 없음 | Phase 1 Task 1.3에서 "ESLint만" 으로 정정. Prettier·Husky는 v2.x 후보로 분리 |
| F5 | PRD 사실관계 정정 외에 — **`app/layout.tsx`의 metadata.title이 "Next.js and Supabase Starter Kit"** (starter kit 기본값 그대로) | `app/layout.tsx:13` 실측 | Phase 2 Task 2.1 Analytics 통합 시 함께 정정 ("모임 관리" 또는 PRD 상의 서비스명) |

> **사용자 확인 사항**: F5의 metadata 변경을 Phase 4에 포함할지(권장: Yes, Analytics와 같은 파일 수정이라 비용 0). F1·F3·F4의 ROADMAP 정정은 코드 변경 없는 문서 작업이라 비용 작음 — plan에 포함했다.

---

## File Structure

```
변경 (코드 — 단 2파일)
├ app/layout.tsx           — <Analytics /> 추가 + metadata.title 정정 (F5)
└ package.json             — @vercel/analytics 추가, next/@supabase/* 버전 핀

생성 (문서)
├ docs/deploy/checklist.md                          — 운영자 재현용 배포 체크리스트
└ docs/deploy/2026-05-24-vercel-prod-results.md     — 측정값·smoke test 결과 기록

변경 (문서)
├ docs/PRD.md              — §5.5, §5.6, §6.1 Next.js 15→16 + PPR→Cache Components + proxy.ts runtime 명시
└ docs/ROADMAP.md          — 기술 스택 표기 정정 (F1, F3, F4) + Phase 4 진행 상황 ✅ 표기

수동 작업 (코드 변경 없음, 사용자 web UI)
├ GitHub Settings → Branches: default branch를 main으로 전환 (Task 011)
├ git push origin --delete feat/profiles-table       (Task 011 후속)
├ Vercel Dashboard: 프로젝트 import + 환경변수 3종 등록 (Task 012)
├ Supabase Auth: Site URL + Redirect URLs 갱신 (Task 013)
└ Vercel Dashboard: production smoke test 7단계 (Task 014)
```

**파일 책임 분할 근거**:
- `app/layout.tsx`: 전역 마운트 지점이므로 Analytics + metadata 모두 여기. 분할하지 않음.
- `package.json`: 의존성 핀과 신규 추가가 동시에 일어나는 단일 파일. lock 파일은 `npm install` 결과물이라 자동.
- `docs/deploy/`: 운영자 절차와 측정값을 분리. 체크리스트는 재사용(매 배포마다 복사), 결과 파일은 일자별 누적.
- 코드 vs 문서 vs 수동 작업을 별도 phase로 분리 — phase 실패 시 영향 범위가 격리됨.

---

## Phase 분할 개요

| Phase | 목표 | 코드 변경 | 의존성 |
| --- | --- | --- | --- |
| **Phase 1** | 베이스라인 확보 + 문서 정정 (안전한 워밍업) | docs only | — |
| **Phase 2** | 코드 변경 + Vercel Analytics 통합 | app/layout.tsx + package.json | Phase 1 |
| **Phase 3** | GitHub default branch 전환 + Vercel 프로젝트 셋업 (수동) | none | Phase 2 (main에 push 완료 필요) |
| **Phase 4** | Supabase Auth 갱신 + production smoke test 7단계 | none | Phase 3 |
| **Phase 5** | 측정값 기록 + ROADMAP ✅ 표기 + 마무리 커밋 | docs only | Phase 4 |

**phase 간 일시 중단 권장**: 각 phase 끝에서 사용자 확인 후 다음 phase 시작. 특히 Phase 3은 사용자 web UI 작업이므로 본 세션이 대신 수행 불가.

---

## Phase 1 — 베이스라인 + 문서 정정

### Task 1.1: 현재 빌드 베이스라인 확보

**목적**: Phase 2 코드 변경 전후의 회귀 비교 기준 확보. Vercel 배포 후 "어디서부터 깨졌는지" 추적 가능하게.

**Files:** none (로컬 실행만, 출력 캡처)

- [ ] **Step 1: production 빌드 실행 + 출력 캡처**

```bash
npm run build 2>&1 | tee /tmp/build-baseline-pre.log
```

Expected: 빌드 성공 (exit 0), `Route (app)` 표 출력, `○ (Static)` / `ƒ (Dynamic)` / `◐ (PPR)` 또는 Next.js 16의 `Cache Components` 표기. 경고는 0 또는 신규 추가가 없도록 기록.

- [ ] **Step 2: 빌드 산출물에 `SUPABASE_SERVICE_ROLE_KEY` 값이 baseline에서도 없는지 확인 (control case)**

```bash
SERVICE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2-)
echo "Key length: ${#SERVICE_KEY}"
[ -n "$SERVICE_KEY" ] && grep -rF "$SERVICE_KEY" .next/ && echo "❌ FOUND" || echo "✅ NOT FOUND"
```

Expected: `✅ NOT FOUND`. baseline에서 발견되면 본 phase 중단 + 사용자 보고 (Phase 2 진입 무의미).

> **윈도우 PowerShell 대안**:
> ```powershell
> $key = (Get-Content .env.local | Select-String '^SUPABASE_SERVICE_ROLE_KEY=').Line.Split('=',2)[1]
> if ($key) { Get-ChildItem -Recurse .next | Select-String -SimpleMatch $key; if ($?) { Write-Host "Check above output" } }
> ```

- [ ] **Step 3: Next.js 실제 설치 버전 확인 (PRD 정정용 ground truth)**

```bash
node -e "console.log(require('./node_modules/next/package.json').version)"
node -e "console.log('TypeScript:', require('./node_modules/typescript/package.json').version)"
node -e "console.log('Tailwind:', require('./node_modules/tailwindcss/package.json').version)"
```

Expected 예시:
```
16.2.6
TypeScript: 5.6.3
Tailwind: 3.4.17
```

이 출력을 메모해두고 Task 1.2·1.3에서 PRD/ROADMAP 정정 시 그대로 사용.

- [ ] **Step 4: 베이스라인 메모 작성 (커밋 X, 본 plan 진행 중에만 참조)**

다음 사실을 메모장 또는 task에 기록:
- Next.js 실제 버전: `<Step 3 결과>`
- TypeScript 실제 버전: `<Step 3 결과>`
- Tailwind CSS 실제 버전: `<Step 3 결과>`
- baseline build 경고 수: `<Step 1 로그에서 카운트>`
- baseline .next/ 비밀 키 grep 결과: ✅ NOT FOUND

---

### Task 1.2: PRD 사실관계 정정 (§5.5, §5.6, §6.1)

**Files:**
- Modify: `docs/PRD.md` (§5.5, §5.6, §6.1 — 라인 번호는 정찰 시점 미확정, Grep으로 찾기)

- [ ] **Step 1: 정정 대상 위치 grep**

```bash
grep -n "Next.js 15\|PPR\|Partial Prerendering\|Next.js 15 미들웨어\|미들웨어" docs/PRD.md
```

Expected: §5.5, §5.6, §6.1 영역에서 다음 패턴 발견:
- "Next.js 15" (3건 추정)
- "PPR" 또는 "Partial Prerendering" (1건)
- "Next.js 15 미들웨어" (1건)

각 hit의 라인 번호를 기록.

- [ ] **Step 2: §5.5 "Next.js 15" → "Next.js 16" + "PPR" → "Cache Components"**

`docs/PRD.md` §5.5 영역에서:
- `Next.js 15` → `Next.js 16` (실측 버전 `16.x.y`는 §6.1 의존성 표에 명시, §5.5는 메이저만)
- `PPR (Partial Prerendering)` 또는 `Partial Prerendering` → `Cache Components`
- 본문에 "PPR이란 정적/동적 부분을 한 응답에 섞는 기법" 류의 설명이 있다면 그대로 두고, **명칭만 정정**. (Cache Components는 Next.js 16의 공식 후속 명칭으로 동일 메커니즘.)

Edit 도구 사용. 예:

```
Edit:
old_string: "Next.js 15의 PPR (Partial Prerendering)"
new_string: "Next.js 16의 Cache Components"
```

각 hit를 개별 Edit로 처리 (replace_all 사용 시 §6.1 다른 컨텍스트까지 바뀔 위험).

- [ ] **Step 3: §5.6 "Next.js 15 미들웨어" → "Next.js 16 proxy" + runtime 제약 명시**

`docs/PRD.md` §5.6 영역에서:
- `Next.js 15 미들웨어` 또는 `미들웨어 (middleware.ts)` → `Next.js 16 proxy (proxy.ts)`
- 본문 끝에 다음 한 줄을 **추가**:
  > **runtime 제약**: Next.js 16의 `proxy.ts`는 **Node.js runtime 전용**으로, Next.js 15의 `middleware.ts`가 Edge runtime을 기본으로 했던 것과 다르다. 외부 의존성이 Edge runtime을 가정한 코드(`crypto` 일부, `fetch`의 일부 옵션 등)였다면 Node.js로 재작성이 필요.

이는 단순 rename이 아니라 **런타임 변경**이라는 점이 운영상 중요. (ROADMAP Task 016 명시 사항.)

- [ ] **Step 4: §6.1 의존성 표 — Next.js 버전 + Cache Components 표기 정정**

`docs/PRD.md` §6.1 영역에서:
- 의존성 표 / 코드 블록에 `Next.js 15` 또는 `next: 15.x` → `Next.js 16 (실측 <Task 1.1 Step 3 결과>)`
- 본 plan 시점의 실측 버전을 명시 (예: `Next.js 16.2.6`)
- 빌드 산출물 표기에 `◐` 기호가 있고 해당 의미가 PPR로 적혀 있으면 → **Task 1.1 Step 1의 baseline 빌드 로그를 직접 보고** Cache Components 표기 여부 확인 후 반영. (Next.js 16에서 `◐` 의미가 달라졌을 가능성이 있어 실측 우선.)

- [ ] **Step 5: 정정 후 grep 재확인 (회귀 검증)**

```bash
grep -n "Next.js 15\|Partial Prerendering" docs/PRD.md
```

Expected: **0 hit**. hit가 남으면 Step 2~4 누락 → 보충 후 다시 grep.

- [ ] **Step 6: 단일 커밋**

```bash
git add docs/PRD.md
git commit -m "$(cat <<'EOF'
docs(prd): §5.5·5.6·6.1 Next.js 16 사실관계 정정

- "Next.js 15" → "Next.js 16" (실측 16.x.y 기준, ROADMAP Task 016)
- "PPR (Partial Prerendering)" → "Cache Components" (Next.js 16 공식 명칭)
- §5.6 proxy.ts에 "Node.js runtime 전용" 제약 명시 (단순 rename이 아닌 runtime 변경)
- §6.1 의존성 표 실측 버전 반영

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: `1 file changed`. push는 Phase 1 종료 시 일괄.

---

### Task 1.3: ROADMAP 기술 스택 표기 정정 (F1, F3, F4)

**Files:**
- Modify: `docs/ROADMAP.md` (§기술 스택 체크리스트, 라인 314 부근)

- [ ] **Step 1: 정찰에서 발견한 불일치 3건을 ROADMAP에 반영**

`docs/ROADMAP.md`의 `### 이미 설치됨 ✅` 섹션을 다음과 같이 교체. Edit 도구의 `old_string` / `new_string`은 **현재 ROADMAP 라인 316~328을 통째로 교체**:

```
Edit:
old_string:
### 이미 설치됨 ✅

- [x] Next.js 16.2.6 (App Router + Cache Components + `proxy.ts`)
- [x] TypeScript 5.6+
- [x] React 19
- [x] Tailwind CSS v4
- [x] shadcn/ui (new-york 스타일)
- [x] Lucide React
- [x] next-themes (다크모드)
- [x] Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- [x] PostgreSQL RLS + WITH CHECK 정책
- [x] `lib/datetime.ts` (KST 고정 유틸)
- [x] ESLint, Prettier

new_string:
### 이미 설치됨 ✅ (실측 기준 — Phase 4 Task 1.3에서 정정)

- [x] Next.js <Task 1.1 Step 3 결과> (App Router + Cache Components + `proxy.ts`)
- [x] TypeScript <Task 1.1 Step 3 결과>
- [x] React 19
- [x] Tailwind CSS v3.4.x (⚠️ 이전 ROADMAP 표기 "v4"는 오류. PostCSS + `autoprefixer` + `tailwindcss-animate` 셋업)
- [x] shadcn/ui (CLI 복사형 — `package.json` 의존성에 안 잡히는 게 정상. `components/ui/` 디렉터리에 컴포넌트 코드 직접 포함)
- [x] Lucide React
- [x] next-themes (다크모드)
- [x] Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- [x] PostgreSQL RLS + WITH CHECK 정책
- [x] `lib/datetime.ts` (KST 고정 유틸)
- [x] ESLint만 — Prettier · Husky 미설치 (v2.x에서 검토)
```

> **사용자 확인**: `<Task 1.1 Step 3 결과>`는 실제 값으로 치환. Task 1.1 메모 참조.

- [ ] **Step 2: "추가 필요" 섹션에 Prettier·Husky 후보 명시 (선택)**

같은 ROADMAP 파일의 `### 추가 필요 (v1.1~v2.0)` 섹션에:
- 기존 항목 유지
- 끝에 추가: `- [ ] Prettier · Husky · lint-staged (v2.x, 코드 스타일 통일이 필요할 시 — Phase 4 정찰에서 미설치 확인)`

- [ ] **Step 3: 정정 후 git diff 확인**

```bash
git diff docs/ROADMAP.md
```

Expected: Tailwind CSS v4 → v3.4.x, ESLint+Prettier → ESLint만 등의 정정이 보임.

- [ ] **Step 4: 단일 커밋**

```bash
git add docs/ROADMAP.md
git commit -m "$(cat <<'EOF'
docs(roadmap): 기술 스택 표기 실측 정정 (Phase 4 정찰 결과)

- Tailwind CSS v4 → v3.4.x (실제는 v3 셋업: PostCSS + autoprefixer + tailwindcss-animate)
- TypeScript 5.6+ → 실측 버전 명시
- shadcn/ui 항목에 "CLI 복사형이라 dependency에 안 잡힘" 메모
- ESLint + Prettier → ESLint만 (Prettier·Husky 미설치 사실 반영)
- Next.js 버전을 실측값으로 정정

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: `1 file changed`.

---

### Task 1.4: Phase 1 push + 사용자 확인

- [ ] **Step 1: 현재 브랜치 확인 (Task 011 전이라 default branch가 `feat/profiles-table`인지 확인)**

```bash
git rev-parse --abbrev-ref HEAD
git remote -v
```

Expected: 현재 브랜치명 출력. `main`이 아닐 경우 다음 Step에서 브랜치를 main으로 전환 후 push 권장.

- [ ] **Step 2: main 브랜치로 commit 합치기 (이미 main인 경우 skip)**

만약 현재 브랜치가 main이 아니라면:

```bash
git checkout main
git merge --no-ff <이전 브랜치명>
```

Expected: fast-forward 또는 merge commit 생성. 충돌 발생 시 Phase 1 정지 + 사용자 보고.

- [ ] **Step 3: push**

```bash
git push origin main
```

Expected: 원격 main 갱신 (또는 force push 없이 정상 push).

- [ ] **Step 4: 사용자 확인 게이트**

Phase 1 완료. 다음 phase 진입 전 사용자에게:
- Task 1.1 메모 (실측 버전) 확인
- Task 1.2~1.3 commit이 의도대로 PRD/ROADMAP을 정정했는지 확인
- Phase 2 진입 승인

응답이 없으면 본 phase 정지.

---

## Phase 2 — 코드 변경 + Vercel Analytics 통합

### Task 2.1: `@vercel/analytics` 설치

**Files:**
- Modify: `package.json` (dependencies에 `@vercel/analytics` 추가)
- Generated: `package-lock.json` (npm install 결과)

- [ ] **Step 1: 설치**

```bash
npm install @vercel/analytics
```

Expected:
- `added 1 package` 또는 유사 메시지
- `package.json`의 `dependencies`에 `"@vercel/analytics": "^1.x.x"` (또는 `latest`) 추가됨
- `package-lock.json` 갱신

- [ ] **Step 2: 버전 확인 (실측)**

```bash
node -e "console.log(require('./node_modules/@vercel/analytics/package.json').version)"
```

Expected: `1.x.x` 또는 그 이상의 버전 문자열.

- [ ] **Step 3: package.json 핀 정책 결정 — `latest` → `^1.x.x` 전환 (옵션)**

본 Task에서는 일단 `npm install` 기본값으로 핀(`^1.x.x`)된다. Task 2.3에서 `next`·`@supabase/*`도 동일 정책으로 일괄 처리하므로 여기서는 별도 작업 없음.

> **단, `npm install @vercel/analytics`가 `"@vercel/analytics": "latest"`로 박혔다면 (`npm config get save-prefix`가 ""인 경우 등) Edit으로 `^1.x.x` 형태로 정정.**

---

### Task 2.2: `<Analytics />` 컴포넌트를 `app/layout.tsx`에 통합 + metadata 정정 (F5)

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: 현재 layout 확인 (정찰 결과 재확인)**

이미 정찰 단계에서 확인된 현재 layout:

```tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// ... metadata, font, RootLayout
```

`<Toaster />` 옆에 `<Analytics />`를 추가하고, `metadata.title`을 "Next.js and Supabase Starter Kit"에서 PRD §1의 한 줄 비전 또는 짧은 서비스명으로 정정.

- [ ] **Step 2: import + JSX 추가 + metadata 정정**

Edit `app/layout.tsx` 전체를 다음으로 대체:

```tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "모임 관리",
  description:
    "카톡 단톡방이 못 푸는 누적 데이터 — 누가 답했나·누가 얼마나 출석했나 — 만 잘 해서 단톡방 옆에 붙여 쓰는 보완 도구",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-center" />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

변경 사항 요약:
- `import { Analytics } from "@vercel/analytics/next"` 추가 (Next.js App Router 전용 import 경로)
- `metadata.title` "Next.js and Supabase Starter Kit" → "모임 관리"
- `metadata.description` 추가 (PRD §1 한 줄 비전 인용)
- `<html lang="en">` → `<html lang="ko">` (한국어 서비스 명시, F5 보조 정정)
- `<Analytics />`를 `<Toaster />` 다음 줄에 배치 (ThemeProvider 안쪽 — 다른 client island와 동일 위치)

> **import 경로 주의**: `@vercel/analytics/next`가 App Router용. Pages Router는 `@vercel/analytics/react`. 본 프로젝트는 App Router이므로 `/next`.

- [ ] **Step 3: 타입체크 (typescript 직접 실행 — `npm run typecheck` 스크립트 없음)**

```bash
npx tsc --noEmit
```

Expected: `0 error`. 에러 발생 시:
- `Cannot find module '@vercel/analytics/next'`: Task 2.1 설치 실패 → npm install 재실행
- 그 외: 본 Step에서 박은 코드 오타 → diff 재검토

- [ ] **Step 4: lint**

```bash
npm run lint
```

Expected: `✔ No ESLint warnings or errors` 또는 동등. 기존에 없던 신규 경고가 추가됐다면 본 Task 변경에서 유입된 것 → 정정 후 재실행.

- [ ] **Step 5: production 빌드 검증**

```bash
npm run build 2>&1 | tee /tmp/build-post-analytics.log
```

Expected:
- 빌드 성공 (exit 0)
- `Route (app)` 표에 신규 경고 없음
- baseline(Task 1.1 Step 1) 대비 경고 수 동일 또는 감소
- `Compiled successfully` 메시지

- [ ] **Step 6: 빌드 산출물 비밀 키 grep (Task 015 사전 검증)**

```bash
SERVICE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2-)
[ -n "$SERVICE_KEY" ] && grep -rF "$SERVICE_KEY" .next/ && echo "❌ FOUND" || echo "✅ NOT FOUND"
```

Expected: `✅ NOT FOUND`. baseline에서도 NOT FOUND였으므로 본 Step도 NOT FOUND 유지가 게이트. FOUND 발견 시 본 phase 즉시 정지 + 사용자 보고 (서비스 키가 클라이언트 번들에 누락되어 들어간 새 컴포넌트가 없는지 grep).

> **PowerShell 대안**: Task 1.1 Step 2와 동일 패턴.

---

### Task 2.3: Next.js + 핵심 의존성 버전 핀 정책 적용

**ROADMAP Task 017 — A안 채택 (`^16.x.y` 핀)**

**Files:**
- Modify: `package.json` (dependencies 4건 핀 정책 갱신)

- [ ] **Step 1: 현재 `latest` 핀 상태 확인**

```bash
grep -E '"(next|@supabase/ssr|@supabase/supabase-js)":' package.json
```

Expected (정찰 시점):
```
"@supabase/ssr": "latest",
"@supabase/supabase-js": "latest",
"next": "latest",
```

- [ ] **Step 2: 실제 설치된 버전 확인**

```bash
node -e "
const pkgs = ['next', '@supabase/ssr', '@supabase/supabase-js', 'react', 'react-dom'];
for (const p of pkgs) {
  console.log(p + ':', require('./node_modules/' + p + '/package.json').version);
}
"
```

Expected 예시:
```
next: 16.2.6
@supabase/ssr: 0.5.x
@supabase/supabase-js: 2.45.x
react: 19.0.0
react-dom: 19.0.0
```

각 버전 메모.

- [ ] **Step 3: `package.json`에 `^메이저.마이너.패치` 핀 적용**

Edit `package.json`의 dependencies에서 다음 3건을 정정 (각 값은 Step 2 실측 기준):

```
"@supabase/ssr": "^<Step 2 결과>",
"@supabase/supabase-js": "^<Step 2 결과>",
"next": "^<Step 2 결과>",
```

> **추천 근거 (ROADMAP A안 재확인)**: production 배포 직전 단계에서 "조용한 메이저 업그레이드"가 production 빌드를 깨뜨릴 위험이 명확. `^16.x.y`는 16.x 내 patch/minor 자동 반영되어 보안 패치는 계속 들어오면서 17.x 메이저는 차단.

> **react·react-dom**: `^19.0.0`으로 이미 핀됨 (정찰 확인). 별도 처리 없음.

> **devDependencies의 `eslint-config-next: 15.3.1`**: Next.js 16과의 호환성을 위해 후속 업그레이드 후보. **본 Task에서는 변경하지 않음** — `npm run lint`가 baseline에서 통과한다면 이는 정상 동작 중. v2.x 후보로 분리 (ROADMAP에 메모는 본 plan 끝에서).

- [ ] **Step 4: `npm install`로 lock 파일 동기화**

```bash
npm install
```

Expected:
- `up to date, audited X packages` 또는 lock 파일만 갱신되는 짧은 출력
- 신규 다운로드 없음 (이미 동일 버전 설치된 상태에서 핀 형식만 변경)

> 만약 신규 다운로드가 발생한다면 `latest`가 정찰 시점 이후 업그레이드되어 실측 버전과 핀 사이 갭이 생긴 것. 그 경우:
> 1. `node -e "..."`로 새 버전 재확인
> 2. `package.json` 핀을 새 버전으로 재정정
> 3. `npm install` 재실행 → no-op 확인

- [ ] **Step 5: 회귀 빌드**

```bash
npm run build
```

Expected: Task 1.1과 동일한 출력 (변경된 의존성 없음, 핀 형식만 변경).

- [ ] **Step 6: Phase 2 단일 커밋**

```bash
git add package.json package-lock.json app/layout.tsx
git commit -m "$(cat <<'EOF'
feat(deploy): Vercel Analytics 통합 + 핵심 의존성 ^메이저 핀

- @vercel/analytics: app/layout.tsx에 <Analytics /> 추가 (v1.1 운영 관측 토대)
- app/layout.tsx: metadata.title "모임 관리" + 한국어 lang + 설명 정정 (starter kit 기본값 → PRD §1 비전)
- package.json: next · @supabase/ssr · @supabase/supabase-js 를 "latest" → "^메이저.마이너.패치" 로 핀
  - 근거: production 배포 직전, "조용한 메이저 업그레이드"가 production 빌드를 깰 위험 차단
  - 16.x patch/minor 자동 반영 유지, 17.x 메이저는 차단

ROADMAP Task 012·017·018 일부, F5 metadata 정정 포함.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin main
```

Expected: 3 files changed, push 성공.

- [ ] **Step 7: 사용자 확인 게이트**

Phase 2 완료. Phase 3은 **사용자 web UI 작업**이므로 본 세션이 대신 수행 불가. 사용자에게:
- main 브랜치에 Analytics + 핀이 push 됨 확인 요청
- Phase 3 진입 (GitHub Settings + Vercel Dashboard 작업) 안내

---

## Phase 3 — GitHub default branch 전환 + Vercel 프로젝트 셋업 (수동)

> **이 phase의 모든 step은 사용자가 web UI에서 직접 수행**. plan 본 세션은 명령어/스크린샷 확인만 가능. 각 step의 Expected는 "사용자 확인 후 다음 step 진행"의 게이트.

### Task 3.1: GitHub default branch를 `main`으로 전환 (ROADMAP Task 011)

- [ ] **Step 1: GitHub 저장소 Settings → Branches**

브라우저: `https://github.com/<owner>/<repo>/settings/branches`

UI에서 "Default branch" 섹션의 switch 아이콘(↔️)을 클릭 → drop-down에서 `main` 선택 → "Update" → 확인 모달에서 "I understand, update the default branch".

Expected: "Default branch updated to `main`" 메시지. PRs / Issues가 본 브랜치 기반으로 기본값 변경.

- [ ] **Step 2: 기존 default였던 `feat/profiles-table` 원격 브랜치 삭제**

```bash
git push origin --delete feat/profiles-table
```

Expected: `- [deleted]  feat/profiles-table` 메시지. **단, 사용자가 본 브랜치를 보존할 의도가 있다면 본 step skip**. (PR이 열려있다면 GitHub UI에서 먼저 close 필요.)

> 사용자 확인 권장: `feat/profiles-table`이 정말 unused인지 → `git log feat/profiles-table --not main` 으로 main에 없는 commit 잔존 확인. unique commit 있으면 보존.

- [ ] **Step 3: 로컬 추적 브랜치 정리 (선택)**

```bash
git fetch --prune
git branch -d feat/profiles-table  # 로컬 브랜치도 삭제 (이미 main에 머지됨)
```

Expected: `Deleted branch feat/profiles-table`. 머지되지 않은 변경이 있다면 git이 경고하며 차단 → `-D`로 강제 삭제 전에 다시 확인.

- [ ] **Step 4: 게이트 — 사용자 확인**

GitHub 저장소 홈에서 default branch 표시(저장소 이름 아래 브랜치 칩)가 `main`인지 사용자 확인. **Phase 3 다음 Task로 진입 승인**.

---

### Task 3.2: Vercel 프로젝트 import + 환경변수 등록 (ROADMAP Task 012)

- [ ] **Step 1: Vercel Dashboard에서 새 프로젝트 import**

브라우저: `https://vercel.com/new`

1. "Import Git Repository" → 본 저장소(`<owner>/<repo>`) 선택
2. Framework Preset: **Next.js** (자동 감지 확인)
3. Root Directory: `./` (기본, 변경 안 함)
4. Build Command: `next build` (기본, 변경 안 함)
5. Output Directory: `.next` (기본)
6. Install Command: `npm install` (기본)
7. Production Branch: `main` (Task 3.1에서 default branch 전환했으므로 자동)
8. **Deploy 누르기 전에 Environment Variables 입력 (Step 2~3)**

- [ ] **Step 2: Environment Variables — Production scope 3건 입력**

Vercel UI의 "Environment Variables" 패널에서 다음 3건 추가:

| Key | Value 출처 | Scope | Sensitive |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`의 동명 변수 | Production + Preview + Development | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local`의 동명 변수 | Production + Preview + Development | No |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local`의 동명 변수 | **Production 한정** | **✅ Sensitive 체크** |

> **⚠️ 보안 핵심**: `SUPABASE_SERVICE_ROLE_KEY`는 **반드시 Sensitive 체크 + Production 한정**. Preview/Development에 배포되면 PR Preview URL에서 우회 API가 노출될 수 있어 Phase 4 smoke test 7단계가 PASS 해도 보안 회귀.

> **`.env.local` 값 확인**:
> ```bash
> grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SERVICE_ROLE_KEY)=' .env.local
> ```
> 값을 그대로 복사해 Vercel UI에 붙여넣기. trailing newline 주의.

- [ ] **Step 3: Deploy 클릭 → 첫 배포 진행**

Vercel은 GitHub Integration이 활성화되면 push 트리거 자동 배포로 전환. 첫 deployment는 본 "Deploy" 버튼이 트리거.

Expected:
- 빌드 로그 streaming
- 빌드 성공 시 `Ready` 상태 + production URL (`https://<project-name>.vercel.app`) 발급
- 빌드 실패 시 로그 검토. 가장 흔한 원인:
  - 환경변수 누락 → Step 2 재확인
  - `eslint-config-next: 15.3.1`이 Next.js 16과 호환되지 않아 lint 단계 실패 → 본 plan Phase 1 Task 1.3에서 명시한 v2.x 후보로 분리, 현재 plan 범위 외라면 lint를 build에서 skip(`NEXT_DISABLE_LINTER=1` env 추가)으로 우회. 단, 임시 우회는 v2.x에서 본격 처리.

- [ ] **Step 4: Production URL 메모**

발급된 URL 형식: `https://<project-name>.vercel.app` 또는 사용자 alias.

다음 Task에서 Supabase Auth Redirect URLs에 입력해야 하므로 정확히 메모.

- [ ] **Step 5: Vercel build log에서 비밀 키 grep (ROADMAP Task 015 자동화 부분)**

Vercel Dashboard → Deployments → 최신 deployment 클릭 → "Build Logs" 또는 "Logs" 탭.

브라우저 Ctrl+F (또는 Cmd+F)로 `SUPABASE_SERVICE_ROLE_KEY` 값의 **앞 8자**(예: `eyJhbGci`)를 검색.

Expected: **0 hit**. hit 발견 시:
- 어떤 라인에서 등장하는지 캡처
- Production deployment **즉시 ROLLBACK** (Vercel Dashboard → 이전 deployment → Promote, 또는 본 배포가 첫 배포라면 Project를 일시적으로 비공개로)
- 사용자 보고 + 누락 원인 추적 (`process.env.SUPABASE_SERVICE_ROLE_KEY`를 클라이언트 컴포넌트에서 사용한 건 아닌지 grep)

> **PowerShell 대안 (로컬 .next에서 grep — Vercel build log 확인 보조)**:
> Phase 2 Task 2.2 Step 6에서 이미 NOT FOUND 확인했으므로 신규 코드 추가가 Phase 3 사이에 없다면 본 Step도 NOT FOUND 보장. 단 Vercel은 별도 build environment이므로 web UI 확인은 별건 게이트.

---

### Task 3.3: 게이트 — Phase 3 사용자 확인

- [ ] **Step 1: 사용자 확인 사항**

다음 모두 확인 후 Phase 4 진입:
- GitHub default branch가 `main`
- Vercel production URL 발급됨 (메모 완료)
- Vercel deployment 상태 `Ready` (빌드 성공)
- Vercel build log에 `SUPABASE_SERVICE_ROLE_KEY` 값 미등장
- Production URL을 브라우저로 열어 비로그인 홈 페이지가 200 OK로 렌더링됨 (간단 sanity check)

미확인 항목 있으면 Phase 3 정지.

---

## Phase 4 — Supabase Auth 갱신 + production smoke test (ROADMAP Task 013·014)

### Task 4.1: Supabase Auth `Site URL` + `Redirect URLs` 갱신

- [ ] **Step 1: Supabase Dashboard 접속**

브라우저: `https://supabase.com/dashboard/project/<project-ref>/auth/url-configuration`

또는 Project → Authentication → URL Configuration.

- [ ] **Step 2: Site URL 갱신**

기존 값: 추정 `http://localhost:3000`

새 값: `https://<project-name>.vercel.app` (Task 3.2 Step 4 메모)

"Save" 클릭.

> **참고**: Site URL은 OAuth 콜백의 기본 redirect destination. localhost는 dev 전용으로 유지하고 싶다면 Site URL을 production URL로, Redirect URLs allowlist에 localhost를 추가하는 방식.

- [ ] **Step 3: Redirect URLs allowlist에 production + localhost 등록**

"Redirect URLs" 섹션에 다음 패턴 추가:

```
https://<project-name>.vercel.app/**
http://localhost:3000/**
```

⚠️ `/**` 와일드카드는 Supabase Auth가 지원하는 path glob. 누락 시 callback URL이 정확히 일치해야 해서 OAuth flow가 다양한 redirect path를 갖는 경우 실패.

> **선택 사항**: Preview deployment의 callback도 활성화하려면 `https://*.vercel.app/**` 패턴 추가. 단, 와일드카드 도메인이라 보안 우려가 있어 **본 plan에서는 권장하지 않음** (Preview는 Service Role Key 미배포 상태라 OAuth flow가 의미 있게 동작하지 않음).

- [ ] **Step 4: Google OAuth Provider 설정 확인**

Authentication → Providers → Google 클릭 → "Authorized Client IDs" 확인 (이미 v1.0에서 설정됨).

Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs → 본 프로젝트 client → "Authorized redirect URIs"에 다음이 있는지 확인:

```
https://<project-ref>.supabase.co/auth/v1/callback
```

이미 있으면 무변경. 없으면 추가 (Supabase가 callback을 자기 도메인으로 받고 사용자 앱으로 redirect하는 구조이므로 Google에 등록할 것은 Supabase 도메인).

- [ ] **Step 5: 게이트 — 사용자 확인**

Auth URL Configuration 페이지에서 Site URL과 Redirect URLs가 위 값으로 저장됐는지 확인. 다음 Task로 진입.

---

### Task 4.2: Production smoke test 7단계 (ROADMAP Task 014)

> 본 Task는 사용자가 production URL을 브라우저(일반 창 + 시크릿 창)에서 직접 조작. 각 step의 결과는 Phase 5 Task 5.1의 results 파일에 기록.

- [ ] **Step 1: 비로그인 홈 200 OK**

일반 브라우저(미로그인 상태)에서 production URL 접속.

```
https://<project-name>.vercel.app/
```

Expected: 홈 페이지 정상 렌더링, 200 OK. DevTools Network 탭에서 status 확인.

- [ ] **Step 2: Google OAuth 로그인**

홈에서 "로그인" 또는 "Google로 시작" 버튼 클릭.

Expected:
- Google 계정 선택 화면으로 redirect
- 계정 선택 후 본 앱으로 callback
- 로그인 상태로 홈 또는 dashboard 페이지 렌더링
- DevTools Application → Cookies에 `sb-<project-ref>-auth-token` 쿠키 존재

실패 시:
- Redirect URLs allowlist 누락 → Task 4.1 Step 3 재확인
- Google OAuth client ID redirect URI 누락 → Task 4.1 Step 4 재확인

- [ ] **Step 3: 그룹 생성**

UI 흐름 (정확한 경로는 v1.0 구현 기준):
- 그룹 목록 → "새 그룹" → 이름·설명 입력 → 생성

Expected: 그룹 상세 페이지로 redirect. URL 형태 `https://<project-name>.vercel.app/groups/<group-id>`.

- [ ] **Step 4: 초대 링크 복사 + 시크릿 창에서 초대 가입**

그룹 상세에서 "초대 링크 복사" 클릭 → 클립보드 복사.

시크릿 창(또는 다른 브라우저)에서 복사한 URL 붙여넣기. **다른 Google 계정으로 로그인 필요** (테스트용 부계정 또는 동료 계정).

Expected:
- 초대 페이지 렌더링 → "참여" 또는 "가입" 버튼
- 로그인 후 자동으로 그룹 멤버로 등록
- 그룹 상세 페이지로 redirect

- [ ] **Step 5: 회차 생성**

원래 owner 브라우저(Step 3의 일반 창)로 돌아와 그룹 상세에서 "새 회차" 클릭.
- 제목·일시(미래 시각, 예: 30분 후)·장소 입력 → 생성

Expected: 회차 상세 페이지 렌더링.

- [ ] **Step 6: RSVP 토글 — 잠금 전**

회차 상세에서 owner 본인의 RSVP를 "참석" 토글.

Expected: 즉시 반영, 멤버 목록에 자기 응답 상태 표시.

시크릿 창의 가입한 멤버도 RSVP 토글 가능 — "참석" 또는 "불참" 선택.

Expected: 양쪽 응답이 회차에 누적됨.

- [ ] **Step 7: RSVP 잠금 동작 검증 (DB RLS WITH CHECK)**

회차 시작 시각을 **현재 시각보다 과거로** 조작해야 잠금 검증 가능. 방법 2가지:

**옵션 A (권장, 안전)**: Step 5에서 회차 생성 시 시작 시각을 1분 후로 짧게 잡고, 1분 대기 → 시작 시각 경과 후 RSVP 토글 시도.

**옵션 B (대안)**: Supabase Dashboard → Table Editor → `events` 테이블에서 본 회차의 `starts_at`을 현재보다 과거로 직접 변경. (production 데이터 직접 조작이므로 다른 사용자가 본 데이터를 보고 있다면 영향 주의 — 일회성 테스트라면 OK.)

Expected:
- RSVP 토글 시도 시 에러 메시지 (또는 토글 자체 비활성화)
- DB 레벨: RLS WITH CHECK 정책 (`EXISTS (select 1 from events where id = event_id and starts_at > now())`)이 INSERT/UPDATE를 거부
- DevTools Network에 4xx 응답 (PostgREST의 RLS 거부)

- [ ] **Step 8: 그룹 출석률 표 + `/me` 갱신 확인**

그룹 상세에서 출석률 표 확인:
- `group_attendance_stats` view가 누적 출석률 갱신
- owner 본인과 가입 멤버 모두 표에 등장
- "참석" / "불참" / "응답 없음" 통계 일치

`/me` (마이페이지) 직접 URL로 접속 (Nav에 진입 메뉴 없음 — ROADMAP §10.9 SKIP):

```
https://<project-name>.vercel.app/me
```

Expected:
- 다음 모임 카드에 본 회차 (이미 시작 시각 지났으면 "지난 모임"으로 표시될 수도 있음 — UI 구현에 따라 다름)
- 그룹별 출석률 표 갱신

- [ ] **Step 9: 7단계 결과 메모**

각 step의 PASS/FAIL을 다음 형식으로 메모 (Phase 5에서 사용):

```
S1 비로그인 홈 200: PASS
S2 Google OAuth 로그인: PASS
S3 그룹 생성: PASS
S4 초대 가입 (시크릿 창): PASS
S5 회차 생성: PASS
S6 RSVP 잠금 전: PASS
S7 RSVP 잠금 동작: PASS
S8 출석률 표 + /me 갱신: PASS
```

FAIL 발견 시 즉시 본 phase 정지 + 사용자 보고. Phase 5로 진행 금지.

---

### Task 4.3: Supabase 운영 관측 1회 점검 (ROADMAP Task 018 후반)

- [ ] **Step 1: Supabase `get_advisors` 실행**

Supabase Dashboard → Database → Advisors (또는 MCP `supabase` 서버 사용 시):

```
mcp__supabase__get_advisors with type=security
mcp__supabase__get_advisors with type=performance
```

Expected:
- security advisor: RLS 누락 테이블, public 접근 가능 view 등 issue list
- performance advisor: 인덱스 누락, slow query 후보 등

각 issue를 검토. v1.0에서 이미 통과한 advisor 결과 대비 새로 잡힌 issue가 있는지 확인. Production URL 추가로 인해 새로 잡히는 issue는 보통 없으나, traffic 발생 후에는 다를 수 있음.

- [ ] **Step 2: Supabase `get_logs` 점검 (Auth + Postgres + API)**

각 카테고리에서 최근 1시간 로그 확인:

```
mcp__supabase__get_logs with service=auth
mcp__supabase__get_logs with service=postgres
mcp__supabase__get_logs with service=api
```

Expected:
- auth: Phase 4 smoke test의 OAuth 로그인 1~2건만 있어야 함. 401/403 폭증 없음
- postgres: smoke test 관련 RLS 정책 검증 query. ERROR 라인 없음 (RLS 거부는 PostgREST가 403으로 변환하므로 postgres ERROR로 안 잡힘)
- api: smoke test의 페이지뷰 + RSVP API 호출. 5xx 없음

비정상 패턴 발견 시 메모 후 Phase 5 results 파일에 기록.

- [ ] **Step 3: Vercel Analytics 동작 확인**

Vercel Dashboard → 본 프로젝트 → Analytics 탭.

Expected:
- 최소 1개의 page view가 등록됨 (Phase 4 smoke test의 홈 진입)
- Real Experience Score 차트가 빈 상태가 아님 (데이터 누적 시작)

Analytics 탭이 비활성화 상태로 표시되면 enable 버튼 클릭 (무료 tier에서도 가능).

- [ ] **Step 4: 정기 점검 루틴 결정 (ROADMAP Task 018 일부)**

`get_logs` 정기 점검 빈도 결정:
- **추천**: 매주 1회 (v1.2 사용자 모집 시작 전까지). 본 plan은 결정만 하고 cron/스케줄 자동화는 v2.x로 분리.
- 결정 결과를 메모해 Phase 5 results 파일과 ROADMAP의 의사결정 로그에 기록.

---

## Phase 5 — 측정값 기록 + ROADMAP ✅ 표기 + 마무리

### Task 5.1: 운영자 체크리스트 + 결과 기록 파일 생성

**Files:**
- Create: `docs/deploy/checklist.md`
- Create: `docs/deploy/2026-05-24-vercel-prod-results.md`

> 참고: `docs/deploy/` 디렉터리는 git status에 untracked로 보이고 이미 존재 가능성. `mkdir -p`로 안전하게 생성.

- [ ] **Step 1: 디렉터리 확인 + 생성**

```bash
mkdir -p docs/deploy
ls docs/deploy/
```

Expected: 디렉터리 존재. 기존 파일 있어도 본 plan 신규 2개와 충돌 없음 (이름 다름).

- [ ] **Step 2: `docs/deploy/checklist.md` 작성 (운영자 재사용)**

Write `docs/deploy/checklist.md`:

````markdown
# Vercel 배포 체크리스트 (모임 관리 MVP v1.1+)

> 기준 plan: [`../superpowers/plans/2026-05-24-vercel-deploy-phase4.md`](../superpowers/plans/2026-05-24-vercel-deploy-phase4.md)

매 배포마다 본 체크리스트를 복사해 `docs/deploy/<YYYY-MM-DD>-vercel-prod-results.md`에 첨부한다.

## 사전 조건

- [ ] 본 plan Phase 1·2의 commit이 main에 push 됨 (`git log --oneline -5`)
- [ ] GitHub default branch = `main`
- [ ] Vercel 프로젝트 connected (Production Branch = main)
- [ ] Vercel env 3종 등록:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` (Production + Preview + Development)
  - [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Production + Preview + Development)
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (**Sensitive + Production 한정**)
- [ ] Supabase Auth Site URL + Redirect URLs에 production URL 등록
- [ ] Google OAuth Client의 Authorized redirect URI에 `<project-ref>.supabase.co/auth/v1/callback` 등록

## Build log 검증

- [ ] Vercel Dashboard build log에서 `SUPABASE_SERVICE_ROLE_KEY` 값 앞 8자 검색 → 0 hit
- [ ] Build 경고 수가 baseline 대비 증가 없음
- [ ] `Route (app)` 표에 신규 dynamic 경고 없음

## Smoke test 7단계

- [ ] S1 비로그인 홈 200 OK
- [ ] S2 Google OAuth 로그인 → 쿠키 발급
- [ ] S3 그룹 생성
- [ ] S4 시크릿 창에서 초대 링크 가입
- [ ] S5 회차 생성 (시작 시각 1분 후 권장)
- [ ] S6 RSVP 토글 (잠금 전 양쪽 사용자)
- [ ] S7 시작 시각 경과 후 RSVP 토글 거부 (DB RLS WITH CHECK 동작)
- [ ] S8 그룹 출석률 표 + `/me` 갱신

## 운영 관측

- [ ] Supabase `get_advisors` (security + performance) — 새 issue 없음
- [ ] Supabase `get_logs` (auth + postgres + api) — 비정상 패턴 없음
- [ ] Vercel Analytics 탭에 최소 1 page view 등록

## 사후

- [ ] `docs/deploy/<YYYY-MM-DD>-vercel-prod-results.md` 측정값 기록
- [ ] ROADMAP Phase 4 Task 011~018 항목 ✅ 표기
- [ ] ROADMAP 의사결정 로그에 배포 일자 + 결정 1줄 추가

## 실패 시

- S7 잠금 미동작: RLS 정책 회귀 SQL 즉시 재검증 (`supabase/migrations/` 검색). 보안 회귀 → production rollback
- 비밀 키 grep hit: production 즉시 rollback + 누락 컴포넌트 grep + 재배포 전 검증
- OAuth 콜백 실패: Redirect URLs allowlist 재확인. Site URL + Redirect URLs 둘 다 갱신 필수
````

- [ ] **Step 3: `docs/deploy/2026-05-24-vercel-prod-results.md` 작성 (본 배포 결과)**

Write `docs/deploy/2026-05-24-vercel-prod-results.md`:

```markdown
# Vercel Production 배포 결과 — 2026-05-24

> 기준 plan: [`../superpowers/plans/2026-05-24-vercel-deploy-phase4.md`](../superpowers/plans/2026-05-24-vercel-deploy-phase4.md)
> 체크리스트: [`./checklist.md`](./checklist.md)

## 환경

- Production URL: `<Task 3.2 Step 4 메모>`
- Vercel Plan: Hobby (v1.1) — Pro 전환은 v1.2 사용자 모집 시점에 재검토
- Production Branch: main
- 빌드 시점 Next.js 버전: `<Task 1.1 Step 3 결과>`

## Build log 검증

- [ ] Build 성공 (status: Ready)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 앞 8자 grep: 0 hit
- [ ] baseline 대비 신규 경고: ____건

## Smoke test 7단계 결과

| Step | 결과 | 메모 |
| --- | --- | --- |
| S1 비로그인 홈 200 | PASS / FAIL | |
| S2 Google OAuth 로그인 | PASS / FAIL | |
| S3 그룹 생성 | PASS / FAIL | |
| S4 시크릿 창 초대 가입 | PASS / FAIL | |
| S5 회차 생성 | PASS / FAIL | |
| S6 RSVP 잠금 전 | PASS / FAIL | |
| S7 RSVP 잠금 동작 | PASS / FAIL | |
| S8 출석률 표 + /me 갱신 | PASS / FAIL | |

## 운영 관측

- Supabase `get_advisors` security 결과: ____ (issue 수 / 신규 여부)
- Supabase `get_advisors` performance 결과: ____
- Supabase `get_logs` 1시간 비정상 패턴: ____
- Vercel Analytics 첫 page view 시각: ____

## 의사결정

- `get_logs` 정기 점검 빈도: ____ (예: 매주 월요일)
- 다음 점검 일자: ____

## 결론

- 전체 게이트: PASS / FAIL
- v1.1 완료 선언 여부: Yes / No
- 후속 액션: ____
```

- [ ] **Step 4: 사용자가 직접 results 파일 측정값 채우기**

본 plan은 파일을 생성만 한다. Phase 4 Task 4.2·4.3에서 메모한 PASS/FAIL과 advisor/logs 결과를 사용자가 results 파일의 빈 칸에 채워넣는다.

> 본 plan을 실행 중인 에이전트가 Phase 4 Task들을 함께 수행했다면, 메모한 결과를 results 파일에 직접 Edit으로 채워도 됨.

---

### Task 5.2: ROADMAP Phase 4 ✅ 표기 + 의사결정 로그 갱신

**Files:**
- Modify: `docs/ROADMAP.md` (Phase 4 Task 011~018 상태, 의사결정 로그)

- [ ] **Step 1: Phase 4 Task 상태를 ✅로 표기**

`docs/ROADMAP.md`의 `### Phase 4: Vercel 배포 + 운영 안정화 🔄 진행 중 (v1.1)` 헤더를:

```
### Phase 4: Vercel 배포 + 운영 안정화 ✅ 완료 (2026-05-24, v1.1)
```

로 변경.

각 Task 011~018 라인 앞에 ✅를 추가 (예: `- **Task 011: GitHub default branch를 \`main\`으로 전환** ✅`). 단, 사용자 결정이 의도와 다르게 진행된 Task가 있다면 해당 Task는 그대로 두고 메모로 보강.

- [ ] **Step 2: Phase 4 완료 기준 체크리스트 ✅ 표기**

`docs/ROADMAP.md`의 `#### Phase 4 (v1.1 배포 + 운영 안정화)` 섹션의 5개 항목을 `[ ]` → `[x]`로 변경. 예:

```
#### Phase 4 (v1.1 배포 + 운영 안정화) ✅
- [x] Vercel production URL 확정 + smoke test 7단계 PASS
- [x] 빌드 산출물에 `SUPABASE_SERVICE_ROLE_KEY` 값 미포함 확인
- [x] PRD 사실관계 정정 4건 머지
- [x] Next.js 버전 핀 정책 결정 + `package.json` 반영
- [x] Vercel Analytics 동작 확인 (production URL 방문 후 1개 이상 page view)
```

- [ ] **Step 3: 의사결정 로그에 1줄 추가**

`docs/ROADMAP.md`의 `## 의사결정 로그` 섹션 표에 다음 라인 추가:

```
| 2026-05-24 | Phase 4(v1.1) 완료 — Vercel production 배포 + smoke test 7단계 PASS | `docs/deploy/2026-05-24-vercel-prod-results.md` 참조. 핵심 결정: Next.js `^메이저` 핀, Hobby plan 유지, `get_logs` 매주 점검 | v1.2 OAuth 풀체인 수동 검증 + 본인 그룹 도입 |
```

- [ ] **Step 4: "다음 단계" 섹션 갱신**

`docs/ROADMAP.md`의 `## 다음 단계`에서 Task 011~018 항목 4개를 다음과 같이 교체:

```
1. **즉시 시작**: Task 019 (OAuth 풀체인 수동 검증) — Phase 5 진입
2. **v1.2 사용자 모집**: 작성자 본인 그룹 1~2개 도입 (Task 020)
3. **지인 운영자 5명 인터뷰**: 사용 1주 후 정성 피드백 수집 (Task 022)
4. **북극성 지표 1~2개 확정**: 정량 1주치 + 정성 10건 누적 후 RICE Confidence 보정 (Task 023)
```

- [ ] **Step 5: 단일 커밋**

```bash
git add docs/ROADMAP.md docs/deploy/checklist.md docs/deploy/2026-05-24-vercel-prod-results.md
git commit -m "$(cat <<'EOF'
docs(deploy): Phase 4(v1.1) 완료 기록 + 운영자 체크리스트

- ROADMAP Phase 4 Task 011~018 ✅ 표기, 완료 기준 5건 [x]
- 의사결정 로그: 2026-05-24 v1.1 완료 + Next.js ^메이저 핀, Hobby 유지 결정
- "다음 단계": v1.2 사용자 모집 흐름으로 전환
- docs/deploy/checklist.md: 운영자 재사용 배포 체크리스트
- docs/deploy/2026-05-24-vercel-prod-results.md: 본 배포 측정값·결과

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin main
```

Expected:
- 3 files changed
- main 브랜치에 push 완료
- Vercel이 자동으로 새 deployment 트리거 (docs only 변경이라 빌드는 통과)
- 새 deployment가 자동으로 Production으로 promote (Production Branch = main)

> **참고**: docs only 변경의 자동 재배포가 비용 부담이라면 `vercel.json`에 `git.deploymentEnabled` 설정으로 docs 경로 제외 가능 (v2.x 후보).

---

### Task 5.3: Phase 4 완료 선언

- [ ] **Step 1: 최종 게이트 — 모든 phase 결과 점검**

```bash
git log --oneline -10
```

Expected commit 순서 (가장 최근 위):
1. `docs(deploy): Phase 4(v1.1) 완료 기록 + 운영자 체크리스트` (Task 5.2)
2. `feat(deploy): Vercel Analytics 통합 + 핵심 의존성 ^메이저 핀` (Phase 2 Task 2.3)
3. `docs(roadmap): 기술 스택 표기 실측 정정 (Phase 4 정찰 결과)` (Phase 1 Task 1.3)
4. `docs(prd): §5.5·5.6·6.1 Next.js 16 사실관계 정정` (Phase 1 Task 1.2)
5. (이전 v1.0 마무리 commit들)

- [ ] **Step 2: results 파일 "결론" 섹션 최종 확인**

`docs/deploy/2026-05-24-vercel-prod-results.md`의 "결론" 섹션이 채워져 있고 "전체 게이트: PASS" 또는 "v1.1 완료 선언 여부: Yes"로 결론됐는지 확인. FAIL이면 본 plan은 미완료 상태 — phase rollback 또는 별도 hotfix plan.

- [ ] **Step 3: 사용자에게 v1.2 진입 의사 확인**

ROADMAP "다음 단계"가 Task 019~023(Phase 5, v1.2)로 갱신됐으니 v1.2 plan 작성 여부를 사용자에게 확인. 본 plan 범위는 여기까지.

---

## Out of Scope (본 plan 범위 외)

본 plan 실행 후 다음은 별도 spec/plan으로:

- **`eslint-config-next: 15.3.1` → 16.x 업그레이드** (Vercel build에서 lint 실패가 발생한 경우 본 plan Phase 3에서 임시로 `NEXT_DISABLE_LINTER=1` 우회 가능, 본격 정정은 v2.x)
- **Prettier · Husky · lint-staged 도입** (ROADMAP F4 정정에서 메모만)
- **Vercel 커스텀 도메인 연결** (v2.x 후보)
- **Supabase 콜드 스타트 방지 cron** (v1.2 사용자 모집 시점에 별도 plan)
- **Preview deployment에 별도 Supabase project 분리** (현재는 동일 project 공유. 본격 분리는 v2.x)
- **GitHub Actions / Vercel cron으로 smoke test 자동화** (현재는 수동 7단계, 자동화는 v2.x)
- **Sentry / Logtail 외부 모니터링** (PRD §10 v3.0 후보)

---

## 리스크 핸드오프

본 plan 실행 중 다음 관찰 시 즉시 중단 + 사용자 협의:

| 관찰 | 즉시 조치 |
| --- | --- |
| Phase 1 Task 1.1 baseline에서 `.next/`에 `SUPABASE_SERVICE_ROLE_KEY` 발견 | Phase 1 중단. Phase 2 진입 무의미. 누락 컴포넌트 grep + 코드 수정 hotfix가 선행 |
| Phase 2 Task 2.2 빌드에서 신규 경고 또는 에러 | 본 phase 정지. `@vercel/analytics/next` import 경로 오타 가능성 우선 검토 |
| Phase 3 Vercel deployment 빌드 실패 (lint 단계) | `eslint-config-next: 15.3.1` ↔ Next.js 16 호환 이슈 가능. 임시 우회는 환경변수 `NEXT_DISABLE_LINTER=1` 추가. 본격 처리는 v2.x로 분리 |
| Phase 4 Task 4.2 S7 잠금 미동작 | **즉시 production rollback** (Vercel Dashboard → 이전 deployment promote). RLS 정책 회귀 SQL을 supabase MCP로 재검증. 보안 회귀이므로 plan 진행 전면 정지 |
| Phase 4 Task 4.2 S2 OAuth 로그인 실패 | Task 4.1 Site URL + Redirect URLs allowlist 재확인. Google OAuth client redirect URI 재확인. Supabase auth log에 "Invalid redirect URL" 메시지 확인 |
| Vercel build log에 비밀 키 값 hit | **즉시 production rollback**. `process.env.SUPABASE_SERVICE_ROLE_KEY`를 client component에서 사용한 곳 grep. 수정 후 재배포 |

---

## 참고 링크

- **ROADMAP**: `docs/ROADMAP.md` Phase 4 (Task 011~018)
- **PRD**: `docs/PRD.md` §5.5, §5.6, §6.1, §9.3, §10.7
- **v1.0 phase plans** (회귀 검증 패턴 참고):
  - `docs/superpowers/plans/2026-05-23-meetup-mvp-phase1.md`
  - `docs/superpowers/plans/2026-05-24-meetup-mvp-phase2.md`
  - `docs/superpowers/plans/2026-05-24-meetup-mvp-phase3.md`
- **기존 invoice-web 잔여물 (본 plan과 무관)**: `docs/superpowers/plans/2026-05-17-vercel-deploy.md`, `docs/superpowers/specs/2026-05-17-vercel-deploy-design.md`
