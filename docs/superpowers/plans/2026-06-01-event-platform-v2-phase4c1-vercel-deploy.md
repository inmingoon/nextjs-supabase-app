# Phase 4-C.1 Vercel 실배포 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development 또는 superpowers:executing-plans 로 task-by-task 실행. 단 **Task 2 는 사람(사용자) 게이트**라 에이전트가 대기한다. Steps 는 checkbox(`- [ ]`).

**Goal:** v2 이벤트 플랫폼을 Vercel 에 배포하고 OAuth/이벤트/참여 broadcast/admin 이 production 에서 동작함을 검증한다.

**Architecture:** 코드 변경 없이(환경 비종속) Vercel Dashboard import 로 배포. 에이전트는 환경변수 레퍼런스 + 사용자 대시보드 체크리스트 + production 검증 절차를 산출하고, 배포 자체(대시보드 + Supabase Redirect URL)는 사용자가 수행한다. 배포 후 에이전트가 Playwright MCP 로 검증.

**Tech Stack:** Vercel(Hobby, Next.js preset), Next.js 16(App Router, PPR), Supabase(Auth/RLS/Realtime), Playwright MCP(검증), supabase MCP(데이터 시딩/정리).

---

## 검증 모델 (읽고 시작)

- 단위 테스트 러너 없음. 배포 전 정적 게이트는 `npx tsc --noEmit; npm run lint; npm run build`.
- production 동작 검증은 **Playwright MCP**(에이전트 수행). OAuth 는 magiclink 우회(4-A 검증된 방식: admin `generate_link` → `/auth/confirm`).
- **Task 2 는 사용자만 가능**(Vercel 계정 인증·시크릿 주입·Supabase 대시보드). 에이전트는 이 단계에서 멈추고 사용자 완료 + production URL 을 받는다.

---

## File Structure

| 파일 | 책임 | 신규/수정 |
| --- | --- | --- |
| `docs/deploy/2026-06-01-v2-vercel-deploy-checklist.md` | 사용자 대시보드 배포 절차(런북) | 신규 |
| `docs/deploy/2026-06-01-v2-vercel-deploy-results.md` | production 검증 결과 기록 | 신규 |
| `docs/ROADMAP-v2.md` | 4-C.1 완료 표기 | 수정 |

(앱 코드·`vercel.json` 변경 없음 — spec D5/D6.)

---

## Task 1: 배포 전 정적 게이트 + 환경변수 레퍼런스 + 체크리스트 문서

**Files:**
- Create: `docs/deploy/2026-06-01-v2-vercel-deploy-checklist.md`

- [ ] **Step 1: 배포 전 정적 회귀 확인**

Run: `npx tsc --noEmit; npm run lint; npm run build`
Expected: 0 errors / 0 problems / 25 routes PASS. (실패 시 배포 중단 — 배포는 green 빌드에서만.)

- [ ] **Step 2: 로컬 환경변수 키 확인(값 마스킹)**

Run: `node -e "const fs=require('fs');const e=fs.readFileSync('.env.local','utf8');['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY'].forEach(k=>{const m=e.match(new RegExp('^'+k+'=(.*)$','m'));console.log(k, m?('set '+m[1].slice(0,8)+'...'):'MISSING')})"`
Expected: 3개 모두 `set ...` (MISSING 이면 배포 불가 — 사용자에게 값 확인 요청).

- [ ] **Step 3: 배포 체크리스트 문서 작성**

`docs/deploy/2026-06-01-v2-vercel-deploy-checklist.md` 생성. 내용:

```markdown
# v2 Vercel 배포 체크리스트 (Phase 4-C.1)

## 사용자 대시보드 단계

### A. Vercel 프로젝트 생성
- [ ] Vercel → Add New → Project → GitHub `inmingoon/nextjs-supabase-app` import
- [ ] Framework Preset: Next.js (자동), Root `./`, Build `next build` (기본 유지)
- [ ] Settings → Git → Production Branch = `feat/event-platform-v2`

### B. 환경변수 (Production scope)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = (.env.local 값)
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = (.env.local 값)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (.env.local 값) — ⚠️ NEXT_PUBLIC_ 접두어 금지(시크릿)
- [ ] Deploy 실행 → production URL 기록: `https://__________.vercel.app`

### C. Supabase Auth (production 로그인 게이트 — 누락 시 OAuth 실패)
- [ ] Supabase Dashboard → Authentication → URL Configuration
- [ ] Site URL = 위 production URL
- [ ] Redirect URLs 에 `https://<production-domain>/**` 추가 후 저장

### D. (확인) Google OAuth 콘솔
- [ ] 변경 불필요 — Google→Supabase `/auth/v1/callback` 는 기존 설정 재사용

## 완료 후
- [ ] production URL 을 에이전트에게 전달 → 검증(Task 3) 진행
```

- [ ] **Step 4: Commit**

```bash
git add docs/deploy/2026-06-01-v2-vercel-deploy-checklist.md
git commit -m "docs(v2): 4-C.1 Vercel 배포 체크리스트(사용자 대시보드 런북)"
```

---

## Task 2: 사용자 대시보드 배포 (사람 게이트 — 에이전트 대기)

**Files:** 없음 (Vercel/Supabase 대시보드 작업)

- [ ] **Step 1: 사용자에게 체크리스트 전달 + 대기**

에이전트는 `docs/deploy/2026-06-01-v2-vercel-deploy-checklist.md` 의 A~D 를 사용자에게 안내하고
**production URL 을 받을 때까지 멈춘다.** 임의로 진행하지 않는다.

- [ ] **Step 2: production URL 수령 확인**

사용자로부터 `https://<project>.vercel.app` 형태 URL 을 받으면 Task 3 진행. URL 미수령 시 대기 유지.

NOTE: 이 task 는 commit 없음. 사용자 완료가 곧 task 완료.

---

## Task 3: production 검증 (Playwright MCP)

**Files:**
- Create: `docs/deploy/2026-06-01-v2-vercel-deploy-results.md`

전제: Task 2 에서 받은 `PROD_URL` 사용. dev/prod 로컬 서버 불필요(원격 production 검증).

- [ ] **Step 1: 익명 접근 — 홈 + secret 미노출**

Playwright MCP: `PROD_URL/` 접속 → 홈 셸 렌더 + "아직 이벤트가 없습니다"(anon, authed-only RLS).
secret 미노출 확인:
Run: `node -e "fetch(process.argv[1]).then(r=>r.text()).then(t=>{const env=require('fs').readFileSync('.env.local','utf8');const sec=(env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m)||[])[1]; console.log('service_role in HTML:', sec? t.includes(sec.trim()):'NO_KEY')})" "<PROD_URL>"`
Expected: `service_role in HTML: false` (클라 응답에 secret 미등장).

- [ ] **Step 2: 로그인 (magiclink 우회)**

4-A 방식: `node` 로 admin `generate_link`(type magiclink, email `inmingoon@gmail.com`) → `hashed_token`.
Playwright: `PROD_URL/auth/confirm?token_hash=<hashed_token>&type=magiclink&next=/` 이동 → 홈 리다이렉트 후 host1 인증 확인(이벤트가 보이거나 프로필 접근).
NOTE: production 도메인이 Supabase Redirect URLs 에 있어야 함(체크리스트 C). 실패 시 R1 점검.

- [ ] **Step 3: 이벤트 목록 + 무한 스크롤**

supabase MCP 로 upcoming 더미 12개 시딩(invite_code 프리픽스 `P4C-`, created_by host1 `c51ee9e2-2350-4f6d-a302-f4d47088f48b`).
Playwright: `PROD_URL/` → 카드 렌더 + 스크롤 시 추가 로드(Server Action POST 200).

- [ ] **Step 4: 이벤트 생성 (Server Action + storage)**

Playwright: `PROD_URL/events/new` → 폼 입력 + 제출 → 생성된 이벤트 상세 리다이렉트. (cover 업로드는 선택.)

- [ ] **Step 5: 참여 broadcast serverless 재확인 (4-A 잔여)**

`PROD_URL` 의 한 이벤트 상세를 탭에 열어 카운트 구독. Node 에서 서버와 동일 broadcast 송신
(`channel.send` REST) `{delta:1}` → 화면 카운트 +1(포커스 변화 없이) 확인 → `{delta:-1}` → 복귀.
추가: `/invite/P4C-01` → "참여하기" → joinEvent end-to-end(production serverless 에서 broadcast 발화) → 카운트 반영.
Expected: production serverless 에서 broadcast 송수신 동작(spec R3 해소).

- [ ] **Step 6: admin 접근 분기**

Playwright: host1(admin) 세션으로 `PROD_URL/admin` → 대시보드 렌더. (비admin 차단은 코드 검증된 3중 가드 — production 재현은 선택.)

- [ ] **Step 7: 데이터 정리**

supabase MCP: `delete from v2_events where invite_code like 'P4C-%';` (참여 row cascade). 정리 후 upcoming 원상 확인.

- [ ] **Step 8: 결과 문서 작성 + Commit**

`docs/deploy/2026-06-01-v2-vercel-deploy-results.md` 에 각 Step 결과(PASS/측정값/스크린샷 참조) + production URL + broadcast serverless 결과 기록.

```bash
git add docs/deploy/2026-06-01-v2-vercel-deploy-results.md
git commit -m "docs(v2): 4-C.1 production 검증 결과 — OAuth/이벤트/broadcast serverless 동작"
```

---

## Task 4: ROADMAP 갱신 + Shrimp + push

**Files:**
- Modify: `docs/ROADMAP-v2.md`

- [ ] **Step 1: ROADMAP 4-C 갱신**

`docs/ROADMAP-v2.md` 의 `4-C 배포·운영` 항목에 `4-C.1 Vercel 실배포 ✅ 완료(2026-06-01)` +
production URL + broadcast serverless 재확인 해소 표기. 4-C.2(Sentry/#3/#4)는 미착수 명시.

- [ ] **Step 2: 회귀 재확인 + push**

Run: `npx tsc --noEmit; npm run lint`
Expected: 0/0. (코드 변경 없었으면 자명하나 확인.)

```bash
git add docs/ROADMAP-v2.md
git commit -m "docs(v2): ROADMAP 4-C.1 Vercel 배포 완료 기록"
git push
```

- [ ] **Step 3: Shrimp 상태 갱신(선택)**

4-C task(`5567d1a8`)는 4-C.1 만 완료 — 전체 완료는 4-C.2(Sentry/#3/#4) 후. Shrimp 에서는
in_progress 유지하거나, 4-C.1/4-C.2 분리가 필요하면 split_tasks 로 조정.

---

## 미해결 / 후속 (이 plan 밖)

- 4-C.2: Sentry, 마이그레이션 트래킹(#3), 권한 매트릭스 CI(#4) — 별도 spec.
- 커스텀 도메인, region 핀(Supabase 근접), preview/development env scope.
- broadcast 가 production serverless 에서 실패 시(R3): REST broadcast endpoint 명시 호출로 전환 — 4-C.2 또는 hotfix.
