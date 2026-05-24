# 1회성 이벤트 플랫폼 v2.0 — Design

> 작성일: 2026-05-24
> base branch: `feat/event-platform-v2` (분기점: main `6f7e01b`)
> 학습 출처: https://github.com/gymcoding/nextjs-supabase-app
> brainstorming 출처: superpowers:brainstorming 스킬 (5건 결정 + 일괄 design 승인)
> 다음 단계: superpowers:writing-plans 스킬로 implementation plan 작성

---

## 1. 개요

### 한 줄 가치 명제

**5~30명 규모 1회성 이벤트(모임·세미나·소규모 행사)를 초대 링크 하나로 만들고 관리할 수 있는 모바일 우선 플랫폼.**

### 정체성 비교

본 프로젝트는 학습 목적의 두 번째 도메인 실험이다.

| 차원 | v1.0 (main, 보존) | v2.0 (본 spec) |
| --- | --- | --- |
| 도메인 | 정기 모임 + 회차 + 누적 출석률 | 1회성 이벤트 |
| 정체성 | 카톡 단톡방 보완 도구 | 이벤트 주최 풀스택 플랫폼 |
| 사용자 역할 | owner / 멤버 (2개) | 주최자 / 참여자 / **관리자** (3개) |
| 학습 가치 | RLS WITH CHECK 잠금, 누적 view, 그룹 단위 권한 | admin role 패턴, 관리자 데스크톱 UI, Recharts 통계 시각화 |

---

## 2. brainstorming 결정 5건 (확정)

| # | 차원 | 결정 | 근거 |
| --- | --- | --- | --- |
| 1 | 예제 일치도 | B — 골격 그대로 + 한국어/KST/v1.0 재사용 | 학습 효율 + 한국어 환경 + v1.0 자산 활용 |
| 2 | 학습 범위 | C — Phase 1~3 + Vercel 배포 | production URL까지가 한 사이클 완주 학습, Phase 4 고급 최적화는 v2.x로 분리 |
| 3 | Supabase 환경 | 별도 project | v1.0 보존 + v2.0 스키마 충돌 없음, Free tier 2 project 가능 |
| 4 | 진행 순서 | A — 예제 순서 그대로 (골격 → UI 더미 → DB+기능) | 예제 동영상 따라가기 최적 |
| 5 | admin 권한 | A — full superuser (이벤트/사용자 삭제 포함) | 예제 Task 011 F013·F014 그대로, RLS 정책 채울 가치 |

---

## 3. Architecture

```
v2.0 frontend (Next.js 16 App Router)
├─ TypeScript 5.9.3 / React 19 (v1.0와 동일 핀)
├─ Tailwind v3.4.19 + shadcn/ui (v1.0와 동일 셋업)
├─ next-themes 다크모드 + <html lang="ko">
├─ proxy.ts 인증 가드 (v1.0 패턴 + admin role 분기 추가)
├─ @vercel/analytics v2.0.1 (v1.0와 동일)
└─ 신규: React Hook Form 7.x + Zod + Recharts 2.x

v2.0 backend (별도 Supabase project — 신규 생성)
├─ PostgreSQL + Row Level Security
├─ auth.users (Google OAuth Provider)
├─ public.users (프로필, role 컬럼)
├─ public.events (이벤트, invite_code)
├─ public.event_participants (참여, 중복 방지)
├─ Storage 버킷: event-covers
├─ Realtime: 참여자 수 라이브 갱신
└─ RLS 헬퍼 함수 패턴 (v1.0 학습 자산: language plpgsql + SET LOCAL row_security OFF + owner postgres)
```

### v1.0에서 직접 재사용

| 자산 | 위치 | v2.0에서 활용 |
| --- | --- | --- |
| KST 유틸 | `lib/datetime.ts` | 이벤트 datetime 입력/표시 |
| 토큰 생성 | `lib/tokens.ts` | `invite_code` 32B base64url |
| Google OAuth 셋업 | `lib/supabase/*` 패턴 | 새 Supabase project에 동일 적용 |
| RLS 헬퍼 패턴 | `supabase/migrations/` v1.0 마이그레이션 학습 | admin role bypass 정책 작성 |
| shadcn 컴포넌트 | `components/ui/*` | 그대로 재사용 (button, card, label, dropdown 등) |
| next-themes 다크모드 | `app/layout.tsx` 패턴 | v2.0 layout에 동일 적용 |
| proxy.ts 인증 가드 | `proxy.ts` 패턴 | admin role 분기 추가 |
| Vercel Analytics | `app/layout.tsx` `<Analytics />` | 그대로 |

### v2.0 신규

- 1회성 이벤트 도메인 DB 스키마 (users.role, events, event_participants)
- admin role 모델 + RLS 정책 (full superuser)
- 13개 페이지 라우트 (모바일 8 + 데스크톱 5)
- Recharts 통계 시각화 (Phase 4 v2.x 후보지만 admin 대시보드 일부 사용)
- React Hook Form + Zod 폼 검증 (이벤트 생성·수정)

---

## 4. 사용자 역할 모델

### 역할 정의

| 역할 | 권한 | UI |
| --- | --- | --- |
| **주최자 (host)** | 본인 이벤트 CRUD + 참여자 목록 관리 + 초대 링크 공유 | 모바일 (이벤트 생성/관리 화면) |
| **참여자 (participant)** | 초대 링크로 참여 + 본인 참여 이벤트 조회 + 다른 참여자 목록 보기(읽기 전용) | 모바일 (읽기 전용 화면) |
| **관리자 (admin)** | 모든 이벤트/사용자 조회·검색·필터·**삭제** + 통계 대시보드 | 데스크톱 (사이드바 + 테이블) |

### admin 부여 방식 (가설 3개 — spec 단계 detail 결정 예정)

**A. Supabase `app_metadata.role = 'admin'` (보안 권장)**:
- RLS에서 `(auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'` 식 참조
- service_role API 또는 Dashboard에서만 설정 가능 (사용자 self-update 불가)
- 보안상 production-grade

**B. 별도 `admin_users` 테이블**:
- `EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())` 참조
- 명시적 + 감사 가능 (`granted_by`, `granted_at` 컬럼 추가 가능)
- 관리 SQL 명확

**C. `user_metadata.role` (가장 단순)**:
- 사용자가 self-update 가능 → admin self-promote 보안 약점
- 학습용으로는 가능하나 production-grade 아님

**Plan 단계 결정 권장**: A (production-grade) 또는 B (감사 가능). C는 학습 단계에서도 권장하지 않음. plan 단계에서 마이그레이션과 함께 확정.

### 첫 admin 부여 흐름 (Plan에서 확정 예정)

- 가설 1: 본인 계정 hard-coded (이메일 매칭) 마이그레이션
- 가설 2: 첫 로그인 사용자를 admin으로 자동 부여 (트리거)
- 가설 3: Supabase Dashboard에서 수동 부여

---

## 5. DB 모델 high-level

### 테이블 스키마 (예제 동일)

```sql
-- public.users (auth.users 확장 프로필)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text not null default 'participant' check (role in ('host', 'participant', 'admin')),
  created_at timestamptz default now() not null
);

-- public.events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  description text check (char_length(description) <= 1000),
  cover_image_url text,
  event_date timestamptz not null,  -- KST 입력, UTC 저장, KST 표시 (lib/datetime.ts)
  location text not null,
  invite_code text unique not null,  -- crypto.randomBytes(32).toString('base64url')
  created_by uuid not null references public.users(id) on delete cascade,
  status text not null default 'upcoming' check (status in ('upcoming', 'ongoing', 'completed')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- public.event_participants
create table public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz default now() not null,
  primary key (event_id, user_id)
);

-- 인덱스
create index events_invite_code_idx on public.events(invite_code);
create index events_created_by_idx on public.events(created_by);
create index event_participants_user_id_idx on public.event_participants(user_id);
```

### 자동 상태 관리 (F008)

- `events.status`: `event_date < now()` 이면 `'completed'`, `now()` 범위 내면 `'ongoing'`, 미래면 `'upcoming'`
- 옵션 1: 매분 cron이 갱신 (가장 단순)
- 옵션 2: `status_view` (계산된 view, 항상 정확) ← 권장
- Plan에서 확정

### RLS 정책 (high-level)

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `users` | 본인 + admin | 트리거 자동 | 본인 + admin | admin만 |
| `events` | 누구나 (publicly listed) + invite_code로 참여 시 검증 | 인증된 사용자 | created_by + admin | created_by + admin |
| `event_participants` | event 참여자 본인 + event 생성자 + admin | 인증 + event 존재 + 중복 방지 | 본인 | 본인 + event 생성자 + admin |

**v1.0 학습 자산**: RLS 헬퍼 함수의 3중 안전장치 (`language plpgsql` + `SET LOCAL row_security TO OFF` + `owner postgres`)를 admin role 체크 함수에 동일 적용.

---

## 6. 화면 범위 (13개 페이지)

### 모바일 (주최자/참여자)

| 라우트 | 화면 | 역할 |
| --- | --- | --- |
| `/` | 홈 / 랜딩 | 비로그인 OK |
| `/auth/login` | Google OAuth 로그인 | 비로그인 |
| `/events/new` | 이벤트 생성 폼 (React Hook Form + Zod) | 주최자 |
| `/events/[id]` | 이벤트 상세 (주최자/참여자 분기 UI) | 둘 다 |
| `/events/[id]/edit` | 이벤트 수정 | 주최자만 |
| `/invite/[code]` | 초대 링크 참여 페이지 | 비로그인 OK (로그인 유도) |
| `/my-events` | 내 이벤트 목록 (주최자: 내가 만든, 참여자: 내가 참여한) | 인증된 사용자 |
| `/profile` | 사용자 프로필 (이름·아바타 수정) | 본인 |

### 데스크톱 (관리자)

| 라우트 | 화면 | 권한 |
| --- | --- | --- |
| `/admin/login` | 관리자 로그인 | 비로그인 OK |
| `/admin` | 대시보드 (지표 카드 4~6개) | admin only |
| `/admin/events` | 이벤트 관리 테이블 (검색·필터·삭제) | admin only |
| `/admin/users` | 사용자 관리 테이블 (검색·필터·삭제) | admin only |
| `/admin/analytics` | 통계 분석 (Recharts 차트) | admin only |

**UI 언어**: 한국어 (`<html lang="ko">`, 모든 라벨/메시지 한국어). datetime 입력은 KST datetime-local input, 표시는 `Asia/Seoul` 고정.

**모바일 vs 데스크톱 분기**: layout 별도. 모바일은 하단 nav, 데스크톱은 좌측 사이드바.

---

## 7. 진행 흐름 (예제 task 순서 그대로)

### Phase 1: 애플리케이션 골격 (예제 Task 001~002)

| Task | 산출물 |
| --- | --- |
| 001 | 13개 라우트 빈 껍데기 파일 + 모바일/데스크톱 레이아웃 분기 |
| 002 | TypeScript 타입 정의 (User, Event, EventParticipant, 컴포넌트 Props, API 응답 타입) |

### Phase 2: UI/UX (예제 Task 003~006, 더미 데이터)

| Task | 산출물 |
| --- | --- |
| 003 | 공통 컴포넌트 라이브러리 + 더미 데이터 유틸 (shadcn Card/Avatar/Dialog/Toast/Form/Select 추가 설치) |
| 004 | 주최자 모바일 UI (홈, 이벤트 생성/관리/수정, 프로필) + React Hook Form + Zod 설치 |
| 005 | 참여자 모바일 UI (초대 가입, 내 이벤트, 이벤트 상세 읽기 전용) — Task 004 컴포넌트 재사용 |
| 006 | 관리자 데스크톱 UI (로그인, 대시보드, 이벤트/사용자/통계 관리) + Recharts 설치 |

### Phase 3: DB + 핵심 기능 (예제 Task 007~012)

| Task | 산출물 |
| --- | --- |
| 007 | DB 스키마 + RLS + Storage 버킷 + 임시 타입을 실제 DB 타입으로 교체 |
| 008 | Google OAuth + admin 권한 미들웨어 + 보호된 라우트 (proxy.ts 확장) |
| 009 | 이벤트 CRUD + 초대 코드 생성 + 커버 이미지 업로드 + 카카오톡/클립보드 공유 |
| 010 | 참여자 관리 + 중복 방지 + Realtime 참여자 수 + 내 이벤트 목록 |
| 011 | 관리자 백엔드 (대시보드 지표 + 이벤트/사용자 검색/필터/삭제 API + 통계 API + 페이지네이션) |
| 012 | Playwright MCP 통합 테스트 (주최자/참여자/관리자 플로우 + 에러 케이스) |

### Phase 3.5: Vercel 배포 (예제 Task 015 일부)

| 작업 | 산출물 |
| --- | --- |
| Vercel 프로젝트 import + env 3종 + Supabase Auth Redirect URLs | production URL |
| Production smoke test (주최자/참여자/관리자 흐름 각 1회) | 결과 docs/deploy/`<YYYY-MM-DD>`-v2-prod-results.md |
| Vercel Analytics 동작 확인 | 첫 page view |

**각 phase 끝마다**: 회귀 검증 + 사용자 게이트.

---

## 8. v1.0 재사용 자산 매핑

| v1.0 파일/패턴 | v2.0 활용 | 그대로? 수정? |
| --- | --- | --- |
| `lib/datetime.ts` | 이벤트 datetime KST 처리 | 그대로 |
| `lib/tokens.ts` | `invite_code` 생성 | 그대로 |
| `lib/supabase/server.ts`, `client.ts`, `proxy.ts` | Supabase 클라이언트 (새 project URL) | 그대로 (env 분기) |
| `proxy.ts` (루트) | 인증 가드 | admin role 분기 추가 (Plan에서 detail) |
| `app/layout.tsx` | RootLayout + Analytics | v2.0용 신규 작성 (v1.0 패턴 참고) |
| `components/ui/*` | shadcn 컴포넌트 | 그대로 + 추가 설치 (Card, Avatar, Dialog 등) |
| `app/auth/**` | OAuth 흐름 | v2.0용 신규 작성 (admin/login 추가) |
| `next.config.ts`, `tailwind.config.ts`, `tsconfig.json` | 설정 | 그대로 |
| `package.json` deps | 기존 의존성 | React Hook Form, Zod, Recharts 추가 |
| RLS 헬퍼 함수 패턴 | 마이그레이션 | v2.0 새 마이그레이션에 동일 패턴 |
| v1.0 도메인 코드 (`app/groups/**`, `app/me`, `app/invite/**`, `supabase/migrations/`) | — | **재사용 안 함** (도메인 다름, v2.0은 신규 마이그레이션) |

---

## 9. Out of Scope

### v2.x 백로그 (학습 진도 후 추가)

- Lighthouse 90+ 최적화 (이미지 lazy load, 코드 스플리팅)
- Sentry 에러 모니터링
- Google Analytics
- 무한 스크롤 / 가상화 리스트
- robots.txt / sitemap.xml
- Open Graph 동적 이미지 (`next/og` 활용)
- 카카오톡 알림톡 (사업자 등록 필요)
- 이벤트 정원 / 대기열
- 결제 / 회비

### 영구 비범위 (1회성 도메인 정체성)

- 정기 모임 / 회차 / 누적 출석률 (v1.0 도메인 — main에 보존)
- 단톡방 보완 도구 정체성
- RSVP 3-상태 잠금 (시간 잠금 — v1.0 학습 자산이지만 1회성에서는 의미 약함)
- 공동 운영자 / 역할 분리 (admin은 시스템 관리자, 이벤트 공동 운영자 아님)

---

## 10. Testing 전략

### 단위 검증

| 영역 | 도구 | 트리거 |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | 각 phase 끝 |
| Lint | `npm run lint` | 각 phase 끝 |
| Production build | `npm run build` | 각 phase 끝 + Vercel 배포 전 |

### 통합 검증

| 영역 | 도구 | 트리거 |
| --- | --- | --- |
| Playwright MCP E2E | `mcp__playwright__browser_navigate` 등 | 각 phase 끝 (Task 012 통합 테스트는 별도 task) |
| RLS 정책 회귀 SQL | Supabase SQL Editor 또는 `mcp__supabase__execute_sql` | DB 마이그레이션 변경 시 |
| OAuth 풀체인 수동 | 시크릿 창 + 다른 Google 계정 | 첫 admin 부여 + Vercel 배포 후 |
| Realtime 참여자 수 | 두 브라우저 동시 접속 | Task 010 검증 시 |

### Playwright MCP 시나리오 (예제 정책 그대로)

각 phase별로:

**Phase 1**: 13 라우트 200 OK 확인 (껍데기라도 렌더링되어야 함)
**Phase 2**: 더미 데이터 UI 렌더링 + 모바일/데스크톱 분기 + 다크모드 토글 + 폼 검증
**Phase 3**: 실제 데이터 CRUD + Realtime + admin 권한 + RLS 거부 (관리자 아닌 사용자가 /admin 접근 → redirect 또는 403)

### v1.0의 OAuth 한계 (재현)

OAuth 풀체인 자동화는 95% 코드 review + DB JWT 시뮬레이션으로 커버, 나머지 5% (실제 Google OAuth 풀체인)는 사용자 수동 검증. v1.0과 동일 정책.

---

## 11. 리스크 + 가정

### 가정

1. **Supabase Free tier 2 project 가능** — v1.0 + v2.0 동시 운영. 한도(50K MAU 합산) 초과 시 Pro 검토.
2. **Google OAuth Provider 신규 설정 가능** — 새 Supabase project에 OAuth 신규 등록. Google Cloud Console에서 redirect URI 추가.
3. **예제 13페이지 + admin role 모델을 한국어로 적응 가능** — 도메인 용어 번역(host/participant/admin → 주최자/참여자/관리자), datetime 한국어 표시.
4. **React Hook Form + Zod + Recharts 학습 곡선 부담 작음** — Phase 2·6에서 학습.
5. **v1.0 RLS 헬��� 패턴이 admin role bypass에도 적용 가능** — 가능. `auth.jwt()` 기반 체크 함수.

### 리스크

| 리스크 | 영향 | 완화책 |
| --- | --- | --- |
| 새 Supabase project 환경변수 누락 | dev/production 깨짐 | Phase 3 Task 007 직전 .env.local + Vercel env 둘 다 셋업 게이트 |
| admin role 부여 방식 결정 지연 | Phase 3 Task 008 진입 막힘 | Plan 단계에서 A/B/C 중 확정 (권장: A or B) |
| Realtime 구독이 무료 한도 초과 (200 동시) | Phase 3 Task 010 실패 | 학습 단계에서는 부담 적음. production 사용자 모집 시 Pro 검토 |
| 예제 동영상과 실제 코드 차이 (예제 GitHub repo가 동영상과 미일치) | 학습 진행 시 confusion | 본 spec은 예제 ROADMAP.md 기반. 코드 detail은 예제 repo 직접 참조 |
| Phase 3 Task 011 admin 통계가 데이터 부족으로 빈 차트 | 학습 시 UX 빈약 | 더미 이벤트/사용자 시드 데이터 마이그레이션 추가 (Plan 단계 결정) |
| v1.0 코드와 v2.0 코드의 디렉터리 혼선 | branch 전환 시 confusion | v2.0 branch에서 v1.0 도메인 디렉터리(app/groups, app/me, app/invite)는 그대로 보존 — `app/events`, `app/admin` 등 v2.0 디렉터리만 신규 |

### 의존성 단일 실패점 (v1.0과 동일)

- Vercel (호스팅)
- Supabase (DB·Auth·Storage·Realtime — 새 project)
- Google Cloud (OAuth)
- GitHub (저장소 + Vercel 연동)

---

## 12. 다음 단계

1. **본 spec 사용자 리뷰** — 변경사항 있으면 수정 후 재커밋
2. **superpowers:writing-plans 스킬 진입** — 본 spec을 input으로 implementation plan 작성
   - 저장 위치: `docs/superpowers/plans/2026-05-24-event-platform-v2-phase1.md` (Phase별 plan 분리 권장)
3. **Plan 단계에서 결정할 detail**:
   - admin role 부여 방식 (A/B/C 중 확정)
   - `events.status` 자동 관리 방식 (cron vs view)
   - 첫 admin 부여 흐름 (hard-coded vs 트리거 vs Dashboard 수동)
   - 더미 시드 데이터 (Phase 3 admin 통계용)
   - Phase 1 task 분해 (예제 Task 001~002 그대로 vs 본 프로젝트 단위)
4. **구현 시작** — Plan 따라 Phase 1부터 진행

---

## 참고 링크

- **본 spec**: `docs/superpowers/specs/2026-05-24-event-platform-v2-design.md`
- **v2.0 PRD placeholder**: `docs/PRD-v2.md` (brainstorming 후 본 spec으로 자리 정리, PRD는 spec과 별도 갱신 또는 통합 결정)
- **v2.0 ROADMAP placeholder**: `docs/ROADMAP-v2.md` (Plan 단계 후 Phase별 task 표 채워짐)
- **v1.0 PRD**: `docs/PRD.md` (학습 자산, 보존)
- **v1.0 ROADMAP**: `docs/ROADMAP.md` (학습 자산, 보존)
- **학습 출처**: https://github.com/gymcoding/nextjs-supabase-app/blob/main/docs/ROADMAP.md
- **Phase 4 (v1.0) plan**: `docs/superpowers/plans/2026-05-24-vercel-deploy-phase4.md` (main branch에서 진행 중)
