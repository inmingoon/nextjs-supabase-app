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

## 사전 회귀 (localhost — 선택, Playwright MCP 활용)

production 배포 전 코드 변경의 sanity check. Phase 4 plan 실행 중 controller가 자동화 가능:

- [ ] dev server (`npm run dev`) ready 확인 (Next.js 16.x Turbopack)
- [ ] `mcp__playwright__browser_navigate` `http://localhost:3000` — 200 OK
- [ ] `mcp__playwright__browser_evaluate` `() => ({ htmlLang: document.documentElement.lang, title: document.title })` — `lang="ko"`, title 정확
- [ ] `/auth/login` 200 OK
- [ ] 보호 라우트(`/me`, `/protected`) → `/auth/login` redirect (proxy.ts 동작)
- [ ] `mcp__playwright__browser_take_screenshot` 모바일 뷰포트 (360×800) 회귀 (선택)

**한계**: localhost는 production 환경(Vercel edge + node serverless)과 다르고, dev mode Analytics는 no-op이므로 실제 page view 송신은 production smoke test로만 검증.

## Vercel build log 검증

- [ ] Vercel Dashboard build log에서 `SUPABASE_SERVICE_ROLE_KEY` 값 앞 8자 검색 → 0 hit
- [ ] Build 경고 수가 baseline 대비 증가 없음 (Phase 4 Task 1.1: 0 warnings)
- [ ] `Route (app)` 표에 21 routes (10 ○ static, 9 ◐ Cache Components, 2 ƒ dynamic, 1 proxy)

## Production smoke test 7~8단계

- [ ] S1 비로그인 홈 200 OK
- [ ] S2 Google OAuth 로그인 → 쿠키 발급 (sb-`<project-ref>`-auth-token)
- [ ] S3 그룹 생성
- [ ] S4 시크릿 창에서 초대 링크 가입 (다른 Google 계정)
- [ ] S5 회차 생성 (시작 시각 1분 후 권장 — S7 잠금 검증용)
- [ ] S6 RSVP 토글 (잠금 전 양쪽 사용자)
- [ ] S7 시작 시각 경과 후 RSVP 토글 거부 (DB RLS WITH CHECK 동작) — **보안 게이트**
- [ ] S8 그룹 출석률 표 + `/me` 갱신

## 운영 관측

- [ ] Supabase `get_advisors` (security + performance) — 새 issue 없음
- [ ] Supabase `get_logs` (auth + postgres + api) — 비정상 패턴 없음 (401/403 폭증, RLS 거부 폭증, slow query)
- [ ] Vercel Analytics 탭에 최소 1 page view 등록

## 사후

- [ ] `docs/deploy/<YYYY-MM-DD>-vercel-prod-results.md` 측정값 기록
- [ ] ROADMAP Phase 4 Task 011~018 항목 ✅ 표기
- [ ] ROADMAP 의사결정 로그에 배포 일자 + 결정 1줄 추가

## 실패 시 대응

| 단계 | 실패 신호 | 즉시 조치 |
| --- | --- | --- |
| Build log secret grep | `SUPABASE_SERVICE_ROLE_KEY` 값 hit | **즉시 rollback** (Vercel Dashboard → 이전 deployment promote) + 누락 컴포넌트 grep + 재배포 전 검증 |
| S2 OAuth | "Invalid redirect URL" 또는 callback 실패 | Supabase Auth Redirect URLs allowlist 재확인. Google OAuth client redirect URI 재확인 |
| S7 잠금 미동작 | 시작 시각 경과 후 RSVP 토글 성공 | **즉시 rollback**. RLS WITH CHECK 정책 회귀 SQL 재검증 (`supabase/migrations/`). 보안 회귀이므로 plan 진행 전면 정지 |
| Build lint 실패 | `eslint-config-next: 15.3.1` ↔ Next.js 16 호환 이슈 | 임시 우회: 환경변수 `NEXT_DISABLE_LINTER=1` 추가. 본격 정정은 v2.x로 분리 |
