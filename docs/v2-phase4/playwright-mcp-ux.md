# Phase 4-A 체감 UX — 검증 기록

> 검증일: 2026-06-01
> 방식: 정적 회귀 + 데이터 계층 SQL 증명 + **라이브 검증**(Playwright MCP + 프로그램적 세션)

## 인증 방법 (OAuth UI 우회)

Google OAuth UI 자동화 대신, service_role 키로 magiclink 를 발급해 앱의 `/auth/confirm`
라우트로 세션 쿠키를 심었다 (로컬, 본인 프로젝트, 검증 목적):
1. `POST {SUPABASE_URL}/auth/v1/admin/generate_link` `{type:'magiclink', email:'inmingoon@gmail.com'}` → `hashed_token` 획득.
2. 브라우저로 `/auth/confirm?token_hash=...&type=magiclink&next=/` 이동 → `verifyOtp` → 세션 쿠키 set → host1 인증.

## 정적 회귀

| 항목 | 결과 |
| --- | --- |
| `npx tsc --noEmit` | 0 errors |
| `npm run lint` | 0 problems |
| `npm run build` | 25/25 routes PASS |
| 최종 코드리뷰 (opus, superpowers:code-reviewer) | Critical 0, Important I2 수정(loadMore 실패 시 관찰 중단), I1/I3/M1 문서화·수긍 |

## 무한 스크롤 — ✅ 라이브 검증

시딩: `v2_events` 에 upcoming 더미 12개(`invite_code` 프리픽스 `P4ATEST-`, created_by host1) → upcoming 총 13개.

- **데이터 계층 SQL 증명**: `(event_date asc, id asc)` 정렬, page1=`LIMIT 9 OFFSET 0`=9개, page2=`LIMIT 9 OFFSET 9`=4개, **overlap=0**. 안정 정렬로 경계 중복/누락 없음.
- **브라우저 라이브**: host1 로 `/` 접속 → 초기 SSR 9개 → 센티넬 진입으로 `loadMoreUpcomingEvents(9)` Server Action **1회 호출**(dev 로그 `POST / 200`, `loadMoreUpcomingEvents(9) in 400ms`) → 총 13개 렌더 후 `hasMore=false`로 **정지(추가 POST 없음 = 무한루프 없음, I2 수정 동작)**.
- **anon 가시성**: 비로그인 시 "아직 이벤트가 없습니다" — `v2_events` SELECT 정책이 `authenticated` USING `true` 하나뿐이라 **의도된 동작**.

## Realtime 카운트 복원 — ✅ 라이브 검증

- **broadcast 수신 격리**: host1 이벤트 상세(`참여자 0명`, broadcast 구독 중)를 **포그라운드 유지**(visibility=visible, resync 미발동)한 채, Node 에서 서버와 동일한 `channel.send({type:'broadcast', event:'participant_change', payload:{delta}})`(REST 폴백) 송신:
  - `delta:+1` → 화면 **"참여자 1명"** (새로고침·포커스 변화 없이 broadcast 만으로 갱신)
  - `delta:-1` → **"참여자 0명"** (감소 + `Math.max(0,…)` 음수 방지)
- **joinEvent end-to-end**: `/invite/P4ATEST-01` → "참여하기" 클릭 → 이벤트 상세 리다이렉트, **"참여자 1명"** + DB `v2_event_participants` row **1건** 확인. 실제 Server Action 의 insert→broadcast→redirect 전체 경로 무에러.
- **초기 resync**: 상세 로드 시 카운트가 서버값(0)으로 정확히 표시 — SUBSCRIBED 재동기화 동작.

## 이벤트 상세 라우트 — dev 500 (Turbopack flakiness, 코드 무관)

- dev(`next dev`, Turbopack)에서 `/events/[id]` 가 `WorkerError: Jest worker encountered ... child process exceptions` 로 500. application-code 는 정상 실행(33~217ms), 크래시는 Next 16.2.6 dev 렌더 워커.
- **production(`next build && next start`)에서는 정상 렌더** — 코드 결함 아님, dev 전용 현상. (Next 16.2.6 Turbopack dev 워커 안정성 이슈)

## 스켈레톤 / 로딩

- `EventCardSkeleton`/`EventListSkeleton` + 상세 Suspense fallback + my-events/admin `loading.tsx` 빌드 PASS + opus 리뷰(형태 일치). 시각 노출은 production 렌더가 빨라 별도 캡처 생략 — 구조·빌드 검증으로 갈음.

## 데이터 정리

검증용 더미 12개 + 검증 중 생성된 host1 참여 row 모두 삭제 완료:
```sql
delete from v2_events where invite_code like 'P4ATEST-%';  -- 12건 삭제, 참여 row cascade
```
삭제 후: upcoming 1개(원상 복구), 더미 0, **orphan 참여 row 0**(FK ON DELETE CASCADE 정상 확인).
