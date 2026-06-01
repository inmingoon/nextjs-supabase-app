# 이벤트 플랫폼 v2.0 — Phase 4-C.1 Vercel 실배포 설계 (Design)

> 작성일: 2026-06-01
> 브랜치: `feat/event-platform-v2`
> 상위: Phase 4-C 배포·운영 (Shrimp task `5567d1a8`) 의 첫 컷
> 참고(재사용 아님): `docs/superpowers/specs/2026-05-17-vercel-deploy-design.md` — v1.0 견적서 뷰어 배포(Notion/PDF). v2 와 앱·리스크가 다름.

---

## 0. 배경 — 4-C 의 첫 컷 분리

Phase 4-C(배포·운영)는 배포 + Sentry + 마이그레이션 트래킹(#3) + 권한 매트릭스 CI(#4) +
broadcast serverless 재확인을 묶는다. 이 spec 은 그중 **Vercel 실배포 + production 검증**에
한정한다(4-C.1). 나머지는 배포가 선 뒤 별도 spec(4-C.2)로 다룬다 — 배포가 4-B(성능·SEO)의
임계 선행이고, 가장 작은 외부 노출 단위이기 때문.

## 0.1 확정 결정 (brainstorming 2026-06-01)

| # | 항목 | 결정 |
| --- | --- | --- |
| D1 | 범위 | Vercel 실배포 + production 동작 검증만. Sentry/#3/#4/커스텀 도메인/region 핀 = 비범위 |
| D2 | 프로젝트 | 새 Vercel 프로젝트(기존 `.vercel` 링크 없음), GitHub repo `nextjs-supabase-app` import |
| D3 | production 브랜치 | `feat/event-platform-v2` (4-B/C/D 미완이라 main 병합 시기상조; 학습용 연속 배포) |
| D4 | 실행 방식 | Vercel Dashboard import (시크릿이 브라우저↔Vercel만 경유). CLI 미사용 |
| D5 | `vercel.json` | 생성 안 함(YAGNI) — 장기 함수 없음, headers 충돌 없음 |
| D6 | 코드 변경 | 없음 — `redirectTo`=`window.location.origin`, `layout.tsx`=`VERCEL_URL` 로 환경 비종속 |
| D7 | 검증 방식 | 배포 후 Playwright MCP. OAuth 는 magiclink 우회 가능(4-A 방식) |

---

## 1. 코드·설정 변경

- **`vercel.json`: 없음.** v2 에는 v1.0 의 PDF 같은 장기 실행 Route Handler 가 없어 Hobby 기본
  함수 timeout 으로 충분. `next.config.ts` 에 `headers()` 도 없어 단일 권위 소스 충돌 없음.
  Next 16 + `cacheComponents: true`(PPR)는 Vercel 기본 지원.
- **애플리케이션 코드 변경: 없음.** 배포만으로 동작해야 하며, 다음이 이미 환경 비종속:
  - OAuth `redirectTo` = `` `${window.location.origin}/auth/callback...` `` (login-card, google-auth-button, admin-login-card) → production 도메인 자동.
  - `app/layout.tsx` metadataBase = `process.env.VERCEL_URL` 기반.
  - `lib/auth/safe-next.ts` same-origin 가드 → open-redirect 방지(Phase 3).

## 2. 환경변수 (Vercel Production scope)

| 키 | 노출 | 출처 | 비고 |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 클라 OK | `.env.local` | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 클라 OK | `.env.local` | publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용** | `.env.local` | ⚠️ `NEXT_PUBLIC_` 접두어 절대 금지(시크릿 유출). `lib/supabase/admin.ts` 가 server-only 가드로 사용 |

(로컬 `.env.local` 의 값을 그대로 Vercel Production 에 주입. preview/development scope 는 이번 범위 밖.)

## 3. 사용자 대시보드 단계 (체크리스트 문서로 제공)

배포 산출물 `docs/deploy/2026-06-01-v2-vercel-deploy-checklist.md` 에 박제한다:

1. Vercel → Add New Project → GitHub `inmingoon/nextjs-supabase-app` import. Framework Next.js 자동 감지, Root `./`, Build `next build`(기본).
2. Settings → Git → **Production Branch = `feat/event-platform-v2`**.
3. Settings → Environment Variables(Production)에 §2 의 3개 주입. `SUPABASE_SERVICE_ROLE_KEY` 가 `NEXT_PUBLIC_` 이 아님을 재확인.
4. Deploy 실행 → production URL(`https://<project>.vercel.app`) 확보.
5. **Supabase Dashboard → Authentication → URL Configuration**:
   - Site URL = production URL
   - Redirect URLs 에 `https://<vercel-domain>/**` 추가
   - ← 이 단계 누락 시 production OAuth 로그인 실패(Supabase 가 redirectTo 거부). **배포 게이트**.
6. Google Cloud OAuth 콘솔: 변경 불필요 — Google→Supabase `/auth/v1/callback` 는 기존 Supabase
   프로젝트 설정 그대로 재사용되고, 앱의 `/auth/callback` 은 Supabase 가 redirectTo 로 호출.

## 4. 검증 (배포 후, Playwright MCP — 제가 수행)

production URL 에서:
- 홈 `/` anon 빈 상태(authed-only RLS 의도 동작).
- 로그인: magiclink 우회(admin generate_link → `/auth/confirm`) 또는 실 Google OAuth.
- 이벤트 목록 + 무한 스크롤(더미 9+ 시딩, 검증 후 정리).
- 이벤트 생성(Server Action + storage cover).
- **참여 broadcast 카운트 갱신** — 4-A 의 serverless 잔여 검증(서버 `channel.send` HTTP 가
  Vercel serverless 에서 동작하는지). 격리 검증(Node broadcast) + joinEvent end-to-end.
- admin 접근(host1 admin 분기 / 비admin 차단).

결과는 `docs/deploy/2026-06-01-v2-vercel-deploy-results.md` 에 기록.

## 5. 위험 / 엣지

| ID | 항목 | 대응 |
| --- | --- | --- |
| R1 | OAuth Redirect URL 미설정 → production 로그인 실패 | 체크리스트 5번 게이트. 검증에서 로그인 실패 시 최우선 점검 |
| R2 | `SUPABASE_SERVICE_ROLE_KEY` 오노출(`NEXT_PUBLIC_`) | 체크리스트 경고 + 검증 시 클라 번들에 secret 미등장 확인 |
| R3 | broadcast 가 Vercel serverless 에서 미동작 | production 재검증. 실패 시 4-C.2 에서 broadcast 전략 재검토(REST endpoint 명시 등) |
| R4 | prod 브랜치 = dev 브랜치 → push 마다 미완 커밋 배포 | 학습용 수용. 큰 변경은 검증 후 push 관행 |
| R5 | 실 Supabase DB 직결 → production 검증이 실데이터 침범 | 더미 태깅(`P4C-`) + 검증 후 정리(4-A 방식) |

## 6. 롤백

Vercel Dashboard → 직전 deployment → Promote(동일 산출물 alias 전환, 재빌드 위험 0). 환경변수
회귀는 Settings 이력에서 직전 값 복원.

## 7. 완료 기준

- [ ] production URL 확보 + 빌드 성공
- [ ] OAuth 로그인 production 동작(또는 magiclink 검증)
- [ ] 이벤트 CRUD / 무한 스크롤 / 참여 broadcast / admin 접근 production 동작
- [ ] broadcast serverless 재확인(4-A 잔여 해소)
- [ ] 클라 번들에 service_role secret 미노출 확인
- [ ] 체크리스트 + 결과 문서 작성, ROADMAP 4-C.1 갱신

## 8. 본 설계 범위 밖 (4-C.2 또는 후속)

- Sentry 에러 모니터링
- 마이그레이션 트래킹 정착(#3), 권한 매트릭스 CI 회귀(#4)
- 커스텀 도메인, region 핀(Supabase 근접), preview/development env scope
