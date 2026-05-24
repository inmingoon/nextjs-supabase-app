# v2.0 Phase 1 — 애플리케이션 골격 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v2.0 1회성 이벤트 플랫폼의 애플리케이션 골격 — 13개 페이지 빈 껍데기 + 모바일/데스크톱 layout 분기 + TypeScript 타입 정의 — 을 main의 v1.0 자산을 폐기하지 않고 v2.0 branch에 안전하게 박는다.

**Architecture:** v2.0 branch(`feat/event-platform-v2`)에서 v1.0 도메인 라우트(`app/groups/`, `app/me/`, `app/invite/[token]/`, `app/protected/`)를 폐기하고 v2.0 도메인 라우트(`app/events/`, `app/admin/`, `app/invite/[code]/`, `app/my-events/`, `app/profile/`)로 교체한다. `/`와 `/auth/*`는 v1.0 자산을 수정/재사용. 모바일/데스크톱 layout 분기는 `app/(mobile)/layout.tsx`와 `app/admin/layout.tsx`로 처리. 더미 데이터로 동작 확인까지가 Phase 1 범위 (실제 데이터·UI 완성은 Phase 2·3).

**Tech Stack:** Next.js 16.2.6 (App Router, `proxy.ts`) · TypeScript 5.9.3 · React 19 · Tailwind v3.4.19 · shadcn/ui · v1.0 재사용(lib/datetime.ts, lib/tokens.ts, components/ui/*)

**Spec:** [`../specs/2026-05-24-event-platform-v2-design.md`](../specs/2026-05-24-event-platform-v2-design.md)

---

## File Structure

### 폐기 (Task 1)

```
app/groups/                       (v1.0 도메인 — main에 보존)
app/me/                           (v1.0 도메인)
app/invite/[token]/               (v1.0 도메인, 라우트 충돌 회피 위해 폐기)
app/protected/                    (v1.0 starter kit 잔여, v2.0은 /profile)
```

### 수정 (Task 3·4)

```
app/page.tsx                      v2.0 홈/랜딩
app/auth/login/page.tsx           모바일 우선 UI 재구성 (Google OAuth 위주)
app/layout.tsx                    그대로 (lang="ko", Analytics, ThemeProvider — Phase 2 commit으로 이미 OK)
proxy.ts                          그대로 (admin 권한 분기는 Phase 3 Task 008에서 추가)
```

### 신규 (Task 2·3·4·5)

```
components/layout/
├── mobile-bottom-nav.tsx         모바일 하단 nav (홈/내 이벤트/생성/프로필)
└── admin-sidebar.tsx             데스크톱 사이드바 (대시보드/이벤트/사용자/통계)

app/events/                       모바일 이벤트 라우트
├── new/page.tsx                  이벤트 생성 (빈 껍데기)
├── [id]/page.tsx                 이벤트 상세 (빈 껍데기)
└── [id]/edit/page.tsx            이벤트 수정 (빈 껍데기)

app/invite/[code]/page.tsx        초대 링크 참여 (빈 껍데기)
app/my-events/page.tsx            내 이벤트 목록 (빈 껍데기)
app/profile/page.tsx              사용자 프로필 (빈 껍데기)

app/admin/
├── layout.tsx                    데스크톱 사이드바 wrap (admin-sidebar 사용)
├── login/page.tsx                관리자 로그인 (빈 껍데기)
├── page.tsx                      대시보드 (빈 껍데기)
├── events/page.tsx               이벤트 관리 (빈 껍데기)
├── users/page.tsx                사용자 관리 (빈 껍데기)
└── analytics/page.tsx            통계 분석 (빈 껍데기)

types/
├── user.ts                       User 타입 (role 포함)
├── event.ts                      Event 타입 (status enum 포함)
├── event-participant.ts          EventParticipant 타입
└── api.ts                        공통 API 응답 타입 (Result<T, E>)
```

### 책임 분할 근거

- 라우트 파일은 page.tsx 1개 = 1 책임. 빈 껍데기 단계에서 비즈니스 로직 0.
- `components/layout/`는 layout 전용 컴포넌트 격리. nav와 sidebar 분리해 모바일/데스크톱 책임 분명.
- `types/` 디렉터리 신설. Phase 2·3에서 컴포넌트가 import. Phase 3 Task 007 후 supabase generate types와 머지 검토.
- `proxy.ts`는 본 Phase 변경 없음. admin 권한 분기는 Phase 3 Task 008에서 추가 (v1.0 인증 패턴 재사용).

---

## 사전 조건 검증

- [ ] **사전 0: 현재 branch + working tree 상태 확인**

```bash
git rev-parse --abbrev-ref HEAD
git status --short | grep -E "^.M|^M" || echo "tracked clean"
```

Expected:
- `feat/event-platform-v2` (HEAD에서 작업 중)
- `tracked clean` (Phase 5 push 후 main과 모든 차이가 commit·push됨, untracked는 OK)

다른 결과면 Phase 1 진입 보류 + 사용자 보고.

---

## Task 1: v1.0 도메인 디렉터리 폐기 (cleanup)

**Files:**
- Delete: `app/groups/` (모든 하위 파일)
- Delete: `app/me/page.tsx`, `app/me/` 디렉터리
- Delete: `app/invite/[token]/page.tsx`, `app/invite/[token]/` 디렉터리
- Delete: `app/protected/` (starter kit 잔여)

- [ ] **Step 1: v1.0 도메인 디렉터리 목록 확인**

```bash
find app/groups app/me app/invite app/protected -type f 2>/dev/null
```

Expected: 각 디렉터리 하위 파일 목록 출력. 디렉터리가 없으면 출력 0줄 (이미 폐기 상태).

- [ ] **Step 2: v1.0 디렉터리 폐기**

```bash
rm -rf app/groups app/me app/protected app/invite/[token]
```

> **`app/invite/` 자체는 보존** — Task 3 Step에서 `app/invite/[code]/page.tsx`를 신규 추가.

PowerShell 대안:
```powershell
Remove-Item -Recurse -Force app/groups, app/me, app/protected, "app/invite/[token]"
```

- [ ] **Step 3: build로 import 깨짐 검증**

```bash
npm run build 2>&1 | tail -30
```

Expected: 빌드 성공. 만약 다른 파일이 폐기된 디렉터리에서 import한다면 에러 발생 → 다음 Step에서 처리.

만약 깨진 import 발견 (예: `app/layout.tsx`가 `app/groups/`의 컴포넌트 import):
- 해당 파일의 import 라인 grep + 정리
- 다시 build

- [ ] **Step 4: commit**

```bash
git add -A app/groups app/me app/protected app/invite
git commit -m "$(cat <<'EOF'
chore(v2): v1.0 도메인 라우트 폐기 (groups·me·protected·invite/[token])

v2.0 branch는 1회성 이벤트 도메인. v1.0 도메인 코드(정기 모임·그룹·
회차·누적 출석률 라우트)는 main branch에 보존된 상태로 유지.

폐기:
- app/groups/ (v1.0 그룹 도메인)
- app/me/ (v1.0 마이페이지)
- app/protected/ (starter kit 잔여)
- app/invite/[token]/ (v1.0 초대 — v2.0은 /invite/[code]로 신규)

라우팅 충돌 회피 + v2.0 도메인 라우트 신규 추가 사전 작업.

Spec: docs/superpowers/specs/2026-05-24-event-platform-v2-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit 성공. push는 Phase 1 끝에서 일괄.

---

## Task 2: layout 컴포넌트 (모바일 하단 nav + admin 사이드바)

**Files:**
- Create: `components/layout/mobile-bottom-nav.tsx`
- Create: `components/layout/admin-sidebar.tsx`

- [ ] **Step 1: 모바일 하단 nav 컴포넌트 작성**

Create `components/layout/mobile-bottom-nav.tsx`:

```tsx
import Link from "next/link";
import { Home, Calendar, Plus, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/my-events", label: "내 이벤트", icon: Calendar },
  { href: "/events/new", label: "만들기", icon: Plus },
  { href: "/profile", label: "프로필", icon: User },
];

export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background md:hidden">
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

설명:
- `md:hidden`: 모바일 전용. 데스크톱(768px+)에서 숨김.
- `fixed bottom-0`: 화면 하단 고정.
- `grid grid-cols-4`: 4개 nav item.
- Active 상태 표시는 Phase 2 Task 003에서 추가 (현재는 빈 껍데기).

- [ ] **Step 2: admin 사이드바 컴포넌트 작성**

Create `components/layout/admin-sidebar.tsx`:

```tsx
import Link from "next/link";
import { LayoutDashboard, Calendar, Users, BarChart } from "lucide-react";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/events", label: "이벤트 관리", icon: Calendar },
  { href: "/admin/users", label: "사용자 관리", icon: Users },
  { href: "/admin/analytics", label: "통계 분석", icon: BarChart },
];

export function AdminSidebar() {
  return (
    <aside className="hidden w-64 border-r bg-background md:flex md:flex-col">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">관리자</h2>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
```

설명:
- `hidden md:flex md:flex-col`: 데스크톱 전용. 모바일에서 숨김. 모바일 관리자 UI는 v2.x.
- `w-64 border-r`: 고정 폭 264px + 우측 경계.

- [ ] **Step 3: typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 error. `lucide-react`가 v1.0에서 이미 설치되어 있음(`package.json` v1.0 dependencies).

- [ ] **Step 4: commit**

```bash
git add components/layout/
git commit -m "$(cat <<'EOF'
feat(v2): 모바일 하단 nav + admin 데스크톱 사이드바 컴포넌트

- components/layout/mobile-bottom-nav.tsx: 4 item (홈·내 이벤트·
  만들기·프로필), md:hidden, fixed bottom-0
- components/layout/admin-sidebar.tsx: 4 item (대시보드·이벤트·
  사용자·통계), hidden md:flex, w-64

Active 상태 표시는 Phase 2 Task 003에서 추가. 본 task는 골격만.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 모바일 라우트 빈 껍데기 (`/`, `/events/*`, `/invite/[code]`, `/my-events`, `/profile`)

**Files:**
- Modify: `app/page.tsx` (v2.0 홈 카피로 재구성)
- Modify: `app/auth/login/page.tsx` (v2.0 메시지로 정정 — 한국어 + "이벤트")
- Create: `app/events/new/page.tsx`
- Create: `app/events/[id]/page.tsx`
- Create: `app/events/[id]/edit/page.tsx`
- Create: `app/invite/[code]/page.tsx`
- Create: `app/my-events/page.tsx`
- Create: `app/profile/page.tsx`

- [ ] **Step 1: 현재 `app/page.tsx` 확인**

```bash
cat app/page.tsx
```

내용을 확인하고 Step 2에서 v2.0 홈으로 교체할 base로 사용.

- [ ] **Step 2: `app/page.tsx` v2.0 홈으로 재구성**

Replace `app/page.tsx` with:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-8 pb-20 md:pb-8">
        <section className="mx-auto max-w-2xl space-y-6 text-center">
          <h1 className="text-3xl font-bold">1회성 이벤트, 5초 만에 시작</h1>
          <p className="text-muted-foreground">
            모임·세미나·소규모 행사를 초대 링크 하나로 만들고 관리하세요.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild>
              <Link href="/events/new">이벤트 만들기</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/my-events">내 이벤트</Link>
            </Button>
          </div>
        </section>
      </main>
      <MobileBottomNav />
    </div>
  );
}
```

- [ ] **Step 3: `app/auth/login/page.tsx` v2.0 메시지로 정정**

먼저 현재 파일 확인:

```bash
cat app/auth/login/page.tsx
```

`Card` 컴포넌트 안의 헤더/설명/버튼 라벨에서 v1.0 도메인 용어가 있으면 v2.0 도메인 용어로 정정:

| v1.0 표현 (있다면) | v2.0 표현 |
| --- | --- |
| "그룹에 참여하려면 로그인" | "이벤트에 참여하려면 로그인" |
| "Google로 그룹 만들기" | "Google로 시작하기" |
| "모임 관리" 헤더 | "이벤트 관리" 헤더 |

starter kit 기본 영문 표현이면 한국어로 정정 + 도메인 용어 v2.0으로.

Edit 도구로 정확한 텍스트 교체. 본 step의 정확한 old/new는 Step 1 출력에 따라 결정.

> **단순 base 케이스**: 만약 `app/auth/login/page.tsx`가 도메인 용어 없이 일반 "Login" 폼만 있다면 본 step skip.

- [ ] **Step 4: `app/events/new/page.tsx` 빈 껍데기**

Create:

```tsx
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default function NewEventPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold">이벤트 만들기</h1>
        <p className="mt-2 text-muted-foreground">
          (Phase 2 Task 004에서 React Hook Form + Zod로 폼 구현)
        </p>
      </main>
      <MobileBottomNav />
    </div>
  );
}
```

- [ ] **Step 5: `app/events/[id]/page.tsx` 빈 껍데기**

Create:

```tsx
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold">이벤트 상세</h1>
        <p className="mt-2 text-muted-foreground">ID: {id}</p>
        <p className="mt-2 text-muted-foreground">
          (Phase 2 Task 004·005에서 주최자/참여자 분기 UI 구현)
        </p>
      </main>
      <MobileBottomNav />
    </div>
  );
}
```

설명: Next.js 16의 dynamic params는 Promise. `await params`로 추출.

- [ ] **Step 6: `app/events/[id]/edit/page.tsx` 빈 껍데기**

Create:

```tsx
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold">이벤트 수정</h1>
        <p className="mt-2 text-muted-foreground">ID: {id}</p>
        <p className="mt-2 text-muted-foreground">
          (Phase 2 Task 004에서 주최자만 접근, 폼 구현)
        </p>
      </main>
      <MobileBottomNav />
    </div>
  );
}
```

- [ ] **Step 7: `app/invite/[code]/page.tsx` 빈 껍데기**

Create:

```tsx
export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">이벤트 초대</h1>
        <p className="text-muted-foreground">코드: {code}</p>
        <p className="text-sm text-muted-foreground">
          (Phase 2 Task 005에서 이벤트 미리보기 + 참여 확인 UI 구현)
        </p>
      </div>
    </div>
  );
}
```

설명: 초대 페이지는 `MobileBottomNav` 없음 (비로그인 OK + 단일 액션).

- [ ] **Step 8: `app/my-events/page.tsx` 빈 껍데기**

Create:

```tsx
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default function MyEventsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold">내 이벤트</h1>
        <p className="mt-2 text-muted-foreground">
          (Phase 2 Task 004·005에서 주최자/참여자 뷰 분기, 더미 데이터로 리스트 UI)
        </p>
      </main>
      <MobileBottomNav />
    </div>
  );
}
```

- [ ] **Step 9: `app/profile/page.tsx` 빈 껍데기**

Create:

```tsx
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold">프로필</h1>
        <p className="mt-2 text-muted-foreground">
          (Phase 2 Task 004에서 본인 정보 표시 + 수정 UI)
        </p>
      </main>
      <MobileBottomNav />
    </div>
  );
}
```

- [ ] **Step 10: build로 7개 신규 라우트 확인**

```bash
npm run build 2>&1 | tail -40
```

Expected:
- 빌드 성공
- `Route (app)` 표에 7개 신규 라우트 표시: `/`, `/events/new`, `/events/[id]`, `/events/[id]/edit`, `/invite/[code]`, `/my-events`, `/profile`
- `/auth/login` 등 기존 v1.0 인증 라우트 유지
- `/admin/*`는 아직 없음 (Task 4에서 추가)
- 0 새 경고

- [ ] **Step 11: commit**

```bash
git add app/page.tsx app/auth/login/page.tsx app/events app/invite/[code] app/my-events app/profile
git commit -m "$(cat <<'EOF'
feat(v2): 모바일 라우트 7개 빈 껍데기

신규:
- app/events/new, app/events/[id], app/events/[id]/edit
- app/invite/[code]
- app/my-events, app/profile

수정:
- app/page.tsx: v2.0 홈 카피("1회성 이벤트, 5초 만에 시작")
- app/auth/login/page.tsx: v2.0 도메인 용어 정정 (해당 시)

각 페이지는 MobileBottomNav 포함(invite/[code] 제외 — 비로그인 진입).
Phase 2에서 더미 데이터·실제 UI 채울 예정.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: admin 라우트 + layout 빈 껍데기

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/page.tsx`
- Create: `app/admin/events/page.tsx`
- Create: `app/admin/users/page.tsx`
- Create: `app/admin/analytics/page.tsx`

- [ ] **Step 1: `app/admin/layout.tsx` 데스크톱 사이드바 wrap**

Create:

```tsx
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
```

설명:
- 모든 `/admin/*` 라우트가 본 layout으로 wrap됨.
- `AdminSidebar`는 `hidden md:flex`라 모바일에서 숨김 → 모바일에서는 main만 풀폭.
- `/admin/login`도 본 layout으로 wrap되는 게 의도된 동작? **No** — `/admin/login`은 로그인 전이라 사이드바 무의미. **Step 3에서 별도 처리.**

- [ ] **Step 2: `app/admin/login/page.tsx` 빈 껍데기 — layout 우회**

`/admin/login`은 `app/admin/layout.tsx` 영향을 받지 않으려면 두 가지 방법:
- A. Route group: `app/admin/(public)/login/page.tsx` + `app/admin/(public)/layout.tsx`(빈 layout)
- B. `app/admin/login/page.tsx`에서 conditional: 사이드바 없는 단일 화면 디자인

본 Phase 1은 빈 껍데기라 단순화. **B 채택** — `/admin/login`은 layout이 wrap하더라도 단일 화면으로 보이게.

Create `app/admin/login/page.tsx`:

```tsx
export default function AdminLoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">관리자 로그인</h1>
        <p className="text-muted-foreground">
          (Phase 2 Task 006에서 Google OAuth + admin 권한 체크 폼 구현)
        </p>
      </div>
    </div>
  );
}
```

설명: `min-h-[calc(100vh-3rem)]`로 layout padding 보정.

> **참고**: route group 분리(`app/admin/(public)/login/`)는 admin/login만의 layout이 다를 때 유효. Phase 1은 단일 화면이라 미사용. Phase 2에서 디자인 결정 후 refactor 가능.

- [ ] **Step 3: `app/admin/page.tsx` 대시보드 빈 껍데기**

Create:

```tsx
export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">대시보드</h1>
      <p className="mt-2 text-muted-foreground">
        (Phase 2 Task 006에서 지표 카드 4~6개 + Recharts 차트 UI 구현)
      </p>
    </div>
  );
}
```

- [ ] **Step 4: `app/admin/events/page.tsx` 이벤트 관리 빈 껍데기**

Create:

```tsx
export default function AdminEventsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">이벤트 관리</h1>
      <p className="mt-2 text-muted-foreground">
        (Phase 2 Task 006에서 검색·필터·삭제 테이블 UI 구현)
      </p>
    </div>
  );
}
```

- [ ] **Step 5: `app/admin/users/page.tsx` 사용자 관리 빈 껍데기**

Create:

```tsx
export default function AdminUsersPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">사용자 관리</h1>
      <p className="mt-2 text-muted-foreground">
        (Phase 2 Task 006에서 검색·필터·삭제 테이블 UI 구현)
      </p>
    </div>
  );
}
```

- [ ] **Step 6: `app/admin/analytics/page.tsx` 통계 빈 껍데기**

Create:

```tsx
export default function AdminAnalyticsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">통계 분석</h1>
      <p className="mt-2 text-muted-foreground">
        (Phase 2 Task 006에서 Recharts 라이브러리 설치 + 더미 차트 구현)
      </p>
    </div>
  );
}
```

- [ ] **Step 7: build로 admin 라우트 5개 확인**

```bash
npm run build 2>&1 | tail -40
```

Expected:
- 빌드 성공
- `Route (app)` 표에 5개 admin 라우트 추가: `/admin`, `/admin/login`, `/admin/events`, `/admin/users`, `/admin/analytics`
- 총 라우트 수가 Phase 1 목표(13개 사용자 라우트 + 인증 보조 라우트 + `_not-found`)에 도달

- [ ] **Step 8: commit**

```bash
git add app/admin
git commit -m "$(cat <<'EOF'
feat(v2): admin 데스크톱 라우트 5개 + layout 빈 껍데기

- app/admin/layout.tsx: AdminSidebar wrap (데스크톱)
- app/admin/login: 관리자 로그인 (layout 우회 단일 화면)
- app/admin: 대시보드
- app/admin/events: 이벤트 관리
- app/admin/users: 사용자 관리
- app/admin/analytics: 통계 분석

Phase 2 Task 006에서 더미 데이터·차트·테이블 UI 채울 예정.
admin 권한 체크는 Phase 3 Task 008(proxy.ts 확장)에서.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: TypeScript 타입 정의

**Files:**
- Create: `types/user.ts`
- Create: `types/event.ts`
- Create: `types/event-participant.ts`
- Create: `types/api.ts`

- [ ] **Step 1: `types/user.ts` User 타입**

Create:

```ts
export type UserRole = "host" | "participant" | "admin";

export type User = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
};
```

설명:
- `id`는 Supabase auth.users.id (uuid).
- `fullName`, `avatarUrl`은 Google OAuth callback에서 채워지지만 nullable.
- `role` 기본값 `'participant'` (DB CHECK 제약). admin 부여는 Phase 3 Task 008 결정 (spec §4 가설 A/B/C 중).

- [ ] **Step 2: `types/event.ts` Event 타입**

Create:

```ts
export type EventStatus = "upcoming" | "ongoing" | "completed";

export type Event = {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  eventDate: string;
  location: string;
  inviteCode: string;
  createdBy: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
};
```

설명:
- `eventDate`는 ISO 8601 문자열 (DB는 timestamptz, 클라이언트는 string). KST 변환은 `lib/datetime.ts` 재사용.
- `inviteCode`는 32B base64url (`lib/tokens.ts`로 생성).
- `status` 자동 관리는 Phase 3 Task 009 결정 (cron vs view, spec §5).

- [ ] **Step 3: `types/event-participant.ts` EventParticipant 타입**

Create:

```ts
export type EventParticipant = {
  eventId: string;
  userId: string;
  joinedAt: string;
};
```

설명: composite primary key (eventId + userId)라 별도 id 없음. 중복 참여 방지는 DB UNIQUE 제약 (Phase 3 Task 007).

- [ ] **Step 4: `types/api.ts` 공통 API 응답 타입**

Create:

```ts
export type ApiResult<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
```

설명:
- `ApiResult<T>` 패턴: Server Action 또는 fetch 결과를 discriminated union으로 표현. throw 대신 typed error.
- `PaginatedResponse<T>`: admin 테이블 검색/필터/페이지네이션용 (Phase 3 Task 011).

- [ ] **Step 5: typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 error.

- [ ] **Step 6: 모바일 빈 껍데기에서 타입 import 사용 확인 (sanity)**

`app/my-events/page.tsx`를 약간 정정해 타입이 정상 import됨을 검증:

Edit `app/my-events/page.tsx`:

```tsx
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import type { Event } from "@/types/event";

const DUMMY_EVENTS: Event[] = []; // Phase 2 Task 004에서 채움

export default function MyEventsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold">내 이벤트</h1>
        <p className="mt-2 text-muted-foreground">
          (Phase 2 Task 004·005에서 주최자/참여자 뷰 분기, 더미 데이터로 리스트 UI)
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          현재 더미 이벤트: {DUMMY_EVENTS.length}건
        </p>
      </main>
      <MobileBottomNav />
    </div>
  );
}
```

- [ ] **Step 7: typecheck + build**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -20
```

Expected: 0 error, 빌드 성공, 라우트 표 변동 없음.

- [ ] **Step 8: commit**

```bash
git add types app/my-events/page.tsx
git commit -m "$(cat <<'EOF'
feat(v2): TypeScript 타입 정의 (User · Event · EventParticipant · ApiResult)

- types/user.ts: UserRole ('host'|'participant'|'admin') + User
- types/event.ts: EventStatus ('upcoming'|'ongoing'|'completed') + Event
- types/event-participant.ts: composite key (eventId, userId)
- types/api.ts: ApiResult<T, E> discriminated union + PaginatedResponse<T>

app/my-events/page.tsx에서 type Event import sanity 검증 (DUMMY_EVENTS).

Phase 2·3에서 본 타입을 컴포넌트·Server Action·API 응답에 적용.
Phase 3 Task 007에서 supabase generate types 산출물과 머지 검토.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Phase 1 회귀 검증 + push

**Files:** (no new files; 검증 + push only)

- [ ] **Step 1: 전체 build + 라우트 표 확인**

```bash
npm run build 2>&1 | tee /tmp/v2-phase1-build.log | tail -40
```

Windows PowerShell 대안:
```powershell
npm run build 2>&1 | Tee-Object -FilePath "$env:TEMP\v2-phase1-build.log" | Select-Object -Last 40
```

Expected:
- `Compiled successfully`
- `Route (app)` 표에 다음 라우트 모두 등장:
  - `/` (○ static)
  - `/auth/*` (기존 v1.0 유지)
  - `/events/new`, `/events/[id]`, `/events/[id]/edit` (3 dynamic)
  - `/invite/[code]` (1 dynamic)
  - `/my-events`, `/profile` (2 static or dynamic)
  - `/admin`, `/admin/login`, `/admin/events`, `/admin/users`, `/admin/analytics` (5)
  - `/_not-found` (1)
- 0 새 경고

- [ ] **Step 2: lint**

```bash
npm run lint
```

Expected: 0 warnings.

- [ ] **Step 3: dev server에서 신규 라우트 sanity (Playwright MCP)**

Phase 1 sanity는 본 plan 실행자(controller)가 Playwright MCP로 검증:

```
mcp__playwright__browser_navigate http://localhost:3000/
mcp__playwright__browser_navigate http://localhost:3000/events/new
mcp__playwright__browser_navigate http://localhost:3000/my-events
mcp__playwright__browser_navigate http://localhost:3000/admin
mcp__playwright__browser_navigate http://localhost:3000/admin/login
```

각 라우트마다 expected:
- 200 OK
- 페이지 헤딩 텍스트 정확 ("이벤트 만들기", "내 이벤트", "대시보드", "관리자 로그인" 등)
- 모바일 라우트는 `<MobileBottomNav>` 렌더링 확인 (admin은 사이드바)

> dev server 이미 PID 51444로 port 3000에서 실행 중. 추가 띄울 필요 없음.

만약 dev server가 죽었으면:
```bash
npm run dev
```

- [ ] **Step 4: working tree 확인**

```bash
git status --short
git log --oneline -7
```

Expected:
- working tree clean
- 최근 5개 commit: Task 1·2·3·4·5 commit + (이전 spec commit `53ab25f`)
- 더하기 (이전 plan commit)는 별도 turn

- [ ] **Step 5: feat/event-platform-v2 push**

```bash
git push origin feat/event-platform-v2
```

Expected: 5 commits push 성공.

- [ ] **Step 6: ROADMAP-v2.md 갱신 — Phase 1 완료 표기**

Edit `docs/ROADMAP-v2.md`에서 Phase 1 항목을 ✅ 표기.

기존 placeholder:
```
- **Phase 1: 애플리케이션 골격 구축** (Task 001~002)
  - 13개 페이지 라우트 + 빈 껍데기
  - TypeScript 타입 정의
```

새로:
```
- **Phase 1: 애플리케이션 골격 구축** ✅ 완료 (2026-05-24)
  - 13개 페이지 라우트 빈 껍데기 (모바일 8 + 데스크톱 5)
  - 모바일 하단 nav + admin 데스크톱 사이드바 layout 컴포넌트
  - TypeScript 타입 정의 (User · Event · EventParticipant · ApiResult)
  - Plan: `docs/superpowers/plans/2026-05-24-event-platform-v2-phase1.md`
  - 회귀: build 0 warnings, lint 0, Playwright MCP route sanity 5건 PASS
```

- [ ] **Step 7: ROADMAP-v2 commit + push**

```bash
git add docs/ROADMAP-v2.md
git commit -m "$(cat <<'EOF'
docs(v2): Phase 1 ✅ 완료 표기 (13 라우트 + 타입 정의)

Plan 6개 task 모두 PASS:
- Task 1: v1.0 도메인 폐기
- Task 2: layout 컴포넌트 (mobile-bottom-nav, admin-sidebar)
- Task 3: 모바일 라우트 7개 빈 껍데기
- Task 4: admin 라우트 5개 + layout
- Task 5: TypeScript 타입 정의
- Task 6: 회귀 검증 (build/lint/Playwright MCP)

다음 Phase 2 Task 003부터 공통 컴포넌트 라이브러리 + 더미 데이터.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)" && git push
```

Expected: push 성공.

---

## 회귀 검증 게이트 (Phase 1 완료 기준)

- [x] (Task 1) v1.0 도메인 디렉터리 폐기 + build 깨짐 0
- [x] (Task 2) layout 컴포넌트 2개 + typecheck 0
- [x] (Task 3) 모바일 라우트 7개 빈 껍데기 + build 라우트 표 등장
- [x] (Task 4) admin 라우트 5개 + layout + build 라우트 표 등장
- [x] (Task 5) TypeScript 타입 4개 + import sanity
- [x] (Task 6) Phase 1 전체 회귀 (build, lint, Playwright MCP 5 route sanity)
- [x] ROADMAP-v2.md Phase 1 ✅ 표기
- [x] feat/event-platform-v2 branch 6 commits push 완료

---

## Out of Scope (Phase 1 범위 외)

- Active 상태 표시 (모바일 nav, admin 사이드바) — Phase 2 Task 003
- 더미 데이터 생성 유틸 — Phase 2 Task 003
- 실제 UI (헤더·카드·테이블·차트) — Phase 2 Task 003~006
- React Hook Form + Zod 설치 — Phase 2 Task 004
- Recharts 설치 — Phase 2 Task 006
- 다크모드 토글 버튼 — Phase 2 Task 003 (next-themes는 이미 활성)
- DB 마이그레이션 — Phase 3 Task 007
- Google OAuth admin 분기 (proxy.ts) — Phase 3 Task 008
- Realtime — Phase 3 Task 010
- Vercel 배포 — Phase 3.5

---

## 리스크 핸드오프

| 관찰 | 즉시 조치 |
| --- | --- |
| Task 1 폐기 후 build에서 v1.0 도메인 import 발견 | 해당 import 가진 파일도 폐기 또는 정정. v1.0 도메인 import가 깊으면 사용자 보고 (예: layout이나 shared 컴포넌트가 v1.0 라우트 참조) |
| Task 3 Step 2의 홈 페이지가 v1.0의 component(예: `<GroupList>`)를 그대로 import 중 | 본 plan은 starter kit 기본 + v1.0 추가 import를 가정. 정확한 import 발견 시 v2.0에 맞게 정정 또는 제거 |
| Task 4 Step 7 admin layout이 `/admin/login`도 wrap해서 사이드바 보임 | Phase 1 빈 껍데기에서는 허용. Phase 2 Task 006에서 route group(`app/admin/(public)/login/`)으로 refactor |
| Step 3 Playwright dev server 죽음 | `npm run dev` 재실행. PID 51444 이미 띄워져 있으면 그대로 사용 |
| Task 5 Step 6 sanity에서 type Event import 실패 | tsconfig.json의 `paths` alias(`@/types/*`)가 v1.0에서 설정 안 됐을 수 있음. 그 경우 `@/types/event` → 상대경로 `../../types/event`로 수정 또는 tsconfig 정정 |

---

## 참고 링크

- **본 plan**: `docs/superpowers/plans/2026-05-24-event-platform-v2-phase1.md`
- **Spec**: `docs/superpowers/specs/2026-05-24-event-platform-v2-design.md`
- **v2.0 PRD placeholder**: `docs/PRD-v2.md`
- **v2.0 ROADMAP placeholder**: `docs/ROADMAP-v2.md` (본 Task 6 Step 6에서 갱신)
- **학습 출처**: https://github.com/gymcoding/nextjs-supabase-app/blob/main/docs/ROADMAP.md (Task 001~002 — 본 plan은 더 세부 분해)
- **v1.0 학습 자산**: main branch의 `docs/PRD.md`, `docs/ROADMAP.md`, `lib/datetime.ts`, `lib/tokens.ts`
