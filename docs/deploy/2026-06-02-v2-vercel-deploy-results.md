# v2 Vercel 배포 — production 검증 결과 (Phase 4-C.1)

> 검증일: 2026-06-02
> production URL: **https://nextjs-supabase-app-topaz.vercel.app**
> 프로젝트: Vercel `nextjs-supabase-app` (Hobby), production 브랜치 `feat/event-platform-v2`
> plan: `docs/superpowers/plans/2026-06-01-event-platform-v2-phase4c1-vercel-deploy.md`

## 배포 트러블슈팅 (기록)

- 최초 배포가 **기본 "Next.js + Supabase Starter Kit" 템플릿**으로 떠 있었음(H1 "Supabase and
  Next.js Starter Template"). 원인: production 배포가 옛 브랜치 커밋으로 빌드됨 — Branch Tracking
  을 `feat/event-platform-v2`로 바꿔도 **기존 배포 Redeploy 는 같은 커밋(옛 브랜치)을 재빌드**한다.
- 해결: v2 브랜치에 미push 커밋 3개 push → Vercel 이 v2 브랜치로 새 production 배포 생성 → ~56초
  후 production 이 v2(`1회성 이벤트, 5초 만에 시작`)로 전환됨.
- 교훈: 브랜치 전환 후에는 **그 브랜치로의 새 커밋 push**(또는 그 브랜치 deployment promote)가
  필요. Redeploy 만으로는 브랜치가 안 바뀜.

## 검증 결과

| # | 항목 | 결과 |
| --- | --- | --- |
| 1 | production 서빙 + v2 빌드 | ✅ 200, `x-vercel-id` present, title/H1 = v2 |
| 2 | secret 미노출 | ✅ 홈 HTML 에 `SUPABASE_SERVICE_ROLE_KEY` 값 미등장 |
| 3 | 로그인(세션) | ✅ magiclink(`/auth/confirm`)로 host1 인증 → 이벤트 1개 가시(authed) |
| 4 | 무한 스크롤 | ✅ 더미 13개 → SSR 9 + `loadMoreUpcomingEvents` Server Action(`POST / 200`) → 13, 정지 |
| 5 | broadcast 수신(클라) | ✅ 이벤트 상세 구독 중 node broadcast `{delta:1}` → 카운트 0→1(포커스 변화 없이) |
| 6 | **broadcast serverless 송신** | ✅ `/invite/P4C-01` "참여하기" → Vercel serverless `joinEvent` 실행(insert + redirect) → 카운트 "1명" + DB participant=1. serverless 함수에서 broadcast 송신이 흐름 차단 없이 완료 |
| 7 | 이벤트 상세 렌더 | ✅ production 정상(로컬 dev 의 Turbopack 워커 500 과 무관) |
| 8 | admin 접근 | ✅ host1 으로 `/admin` 렌더(h1 "관리자", StatCard) |
| 9 | 데이터 정리 | ✅ P4C 더미 12개 삭제 → upcoming 1(원상), orphan 0(cascade) |

→ **spec R3(broadcast serverless) 해소**, 4-A 잔여 검증 완료.

## 미검증 / 주의 (정직 기록)

- **실 Google OAuth Redirect 게이트 미검증**: magiclink(`verifyOtp`)는 OAuth Redirect URL 허용목록
  과 무관하게 동작하므로, 체크리스트 C(Supabase Redirect URLs)의 실제 효력은 **실 Google 로그인**
  으로만 확인된다. → **권장: production 에서 Google 로그인 1회 수동 확인.** 실패 시 Supabase
  Dashboard → Authentication → URL Configuration 에 `https://nextjs-supabase-app-topaz.vercel.app/**`
  추가 여부 점검.
- **이벤트 생성(Server Action + storage)**: 별도 단독 테스트 안 함. joinEvent 가 serverless 의
  Server Action insert/redirect 경로를 증명하므로 위험 낮음. cover storage 업로드는 미검증.
- 검증 중 node→supabase egress 가 일시 차단됐다가 회복(환경 네트워크, 코드 무관).
- ⚠️ 검증 중 `service_role` 키가 세션 로그에 노출됨 — 외부 공유 가능성 있으면 **rotate 권장**.

## 비범위 (4-C.2)

Sentry, 마이그레이션 트래킹(#3), 권한 매트릭스 CI(#4), 커스텀 도메인.
