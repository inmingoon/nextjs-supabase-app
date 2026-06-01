# Phase 4-A 체감 UX — 검증 기록

> 검증일: 2026-06-01
> 방식: option A (자동화 가능분 + 데이터 계층 SQL 증명 + 코드 리뷰 신뢰; OAuth 2세션 자동화 보류)

## 정적 회귀

| 항목 | 결과 |
| --- | --- |
| `npx tsc --noEmit` | 0 errors |
| `npm run lint` | 0 problems |
| `npm run build` | 25/25 routes PASS |
| 최종 코드리뷰 (opus, superpowers:code-reviewer) | Critical 0, Important I2 수정(loadMore 실패 시 관찰 중단), I1/I3/M1 문서화·수긍 |

## 무한 스크롤

### 데이터 계층 (SQL 증명 — getUpcomingEventsPage 와 동일 쿼리)
시딩: `v2_events` 에 upcoming 더미 12개 추가(`invite_code` 프리픽스 `P4ATEST-`, created_by host1) → upcoming 총 13개.

```sql
-- page1 = LIMIT 9 OFFSET 0, page2 = LIMIT 9 OFFSET 9, order by (event_date asc, id asc)
page1_count=9, page2_count=4, overlap_count=0
```
→ 1페이지 9개 + 2페이지 4개, **경계 중복/누락 0**. 안정 정렬 `(event_date, id)` 정상.

### anon 가시성
- 홈 `/` 비로그인 접속 → "아직 이벤트가 없습니다" 빈 상태 렌더 (Playwright MCP 확인).
- 원인: `v2_events` SELECT 정책이 `v2_events_select_all_authenticated` (USING `true`, role `authenticated`) 하나뿐 → **anon 미가시 = 의도된 동작**. 이벤트는 로그인 사용자에게만 노출(초대 기반 platform).

### 브라우저 스크롤 UI — 수동 검증 대기
- authed 세션 필요(이벤트가 authed-only). OAuth 자동화 보류(option A).
- 클라이언트 무한 스크롤 lifecycle(IntersectionObserver observe/disconnect, `hasMore` 정지, offset=append-only length, 실패 시 관찰 중단)은 opus 코드리뷰로 검증.
- **수동 확인 절차**: host1(inmingoon) 로그인 → `/` → 아래로 스크롤 → 9개 후 추가 4개 로드, 끝 도달 시 센티넬 제거 확인.

## Realtime 카운트 복원

- 서버 broadcast 송신(`lib/actions/participants.ts`) + 클라 구독(`event-participants-count.tsx`) 계약 일치(채널 `event:{id}:participants` / event `participant_change` / `{delta}`), delta 게이팅(신규 insert만 +1, count>0 delete만 -1) 코드 검증 완료.
- **런타임 2세션 UI 검증 대기**: authed OAuth 2세션 필요(host + 참여자). Phase 4-C 배포 후 + 사용자 수동.
- **수동 확인 절차**: host 세션에서 이벤트 상세 열어둔 채, 다른 브라우저(시크릿, bandnell)로 invite 링크 통해 참여 → host 화면 "참여자 N명" 이 새로고침 없이 +1, 탈퇴 시 -1, 탭 재포커스 시 서버값 재동기화 확인.

## 스켈레톤 / 로딩
- 컴포넌트 `EventCardSkeleton`/`EventListSkeleton` + 상세 Suspense fallback + my-events/admin `loading.tsx` 추가, build PASS.
- 시각적 노출은 authed 라우트 진입 순간이라 수동 확인 대기.

## 시딩 더미 정리 (수동 검증 후 실행)

무한 스크롤 수동 검증이 끝나면 더미 12개를 제거:
```sql
delete from v2_events where invite_code like 'P4ATEST-%';
```
(보존하면 홈/통계에 테스트 이벤트가 계속 노출됨.)
