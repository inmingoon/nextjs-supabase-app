# v2 Vercel 배포 체크리스트 (Phase 4-C.1)

> 작성일: 2026-06-01
> spec: `docs/superpowers/specs/2026-06-01-event-platform-v2-phase4c1-vercel-deploy-design.md`
> plan: `docs/superpowers/plans/2026-06-01-event-platform-v2-phase4c1-vercel-deploy.md`
> 배포 전 정적 게이트 통과: tsc 0 / lint 0 / build 25 routes (2026-06-01)

코드 변경·`vercel.json` 없이 배포한다(앱이 환경 비종속). 아래 A~D 는 **사용자가 대시보드에서**
수행한다(에이전트가 할 수 없는 단계). 완료 후 production URL 을 에이전트에게 전달하면 검증 진행.

---

## A. Vercel 프로젝트 생성

- [ ] Vercel → **Add New… → Project** → GitHub `inmingoon/nextjs-supabase-app` import
- [ ] Framework Preset: **Next.js** (자동 감지), Root Directory `./`, Build Command `next build`(기본 유지)
- [ ] (생성 후) Settings → **Git → Production Branch = `feat/event-platform-v2`**
  - 현재 작업 브랜치가 production. main 병합 없이 이 브랜치를 배포한다.

## B. 환경변수 (Production scope)

로컬 `.env.local` 의 값을 그대로 넣는다. Vercel → Settings → Environment Variables → **Production** 체크:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` = (`.env.local` 값, `https://bwtz...supabase.co`)
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = (`.env.local` 값, `sb_publishable_...`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (`.env.local` 값, `sb_secret_...`)
  - ⚠️ **`NEXT_PUBLIC_` 접두어를 붙이지 말 것** — 붙이면 클라이언트 번들에 시크릿이 노출된다.
    서버 전용(`lib/supabase/admin.ts` 의 `import "server-only"` 가드 대상).
- [ ] **Deploy** 실행 → production URL 기록: `https://__________________.vercel.app`

## C. Supabase Auth — production 로그인 게이트 (누락 시 OAuth 실패)

OAuth `redirectTo` 가 production 도메인을 쓰므로, Supabase 가 그 도메인을 허용해야 한다.

- [ ] Supabase Dashboard → **Authentication → URL Configuration**
- [ ] **Site URL** = 위 B 의 production URL
- [ ] **Redirect URLs** 에 `https://<production-domain>/**` 추가 후 **Save**
  - 예: production 이 `https://nextjs-supabase-app.vercel.app` 이면 `https://nextjs-supabase-app.vercel.app/**`
  - 이 단계가 빠지면 production 에서 Google 로그인 시 Supabase 가 redirect 를 거부한다.

## D. (확인) Google Cloud OAuth 콘솔

- [ ] **변경 불필요** — Google → Supabase `/auth/v1/callback` 는 기존 Supabase 프로젝트 설정을
      그대로 재사용하고, 앱의 `/auth/callback` 은 Supabase 가 redirectTo 로 호출한다.

---

## 완료 후

- [ ] production URL 을 에이전트에게 전달 → 검증(plan Task 3: 홈/로그인/이벤트/무한스크롤/참여
      broadcast serverless/admin/secret 미노출) 진행.

## 롤백 (필요 시)

- Vercel Dashboard → 직전 deployment → **Promote**(동일 산출물 alias 전환, 재빌드 위험 0).
- 환경변수 회귀: Settings → Environment Variables 이력에서 직전 값 복원.
