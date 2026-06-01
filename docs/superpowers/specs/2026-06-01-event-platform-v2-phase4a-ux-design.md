# 이벤트 플랫폼 v2.0 — Phase 4-A 체감 UX 설계 (Design)

> 작성일: 2026-06-01
> 브랜치: `feat/event-platform-v2`
> 상위 ROADMAP: [`../../ROADMAP-v2.md`](../../ROADMAP-v2.md) Phase 4 (Task 013~015)
> 선행: Phase 3 완료 (2026-05-30) — silent breakages 8건 fix, RLS self-recursion 제거

---

## 0. 배경 — Phase 4 범위 분해

ROADMAP의 "Phase 4: 고급 기능 및 최적화"는 단일 spec으로 다루기엔 넓고 서로 독립적인
서브시스템이다. brainstorming에서 4개 독립 서브프로젝트로 분해했고, 각각 별도
spec→plan→구현 사이클을 돈다.

| 묶음 | 내용 | 본 spec 대상 |
| --- | --- | --- |
| **A. 체감 UX** | 스켈레톤/로딩, 무한 스크롤, Realtime 카운트 복원(#1), Toast/debounce audit(#6) | ✅ 본 문서 |
| B. 성능·SEO | Lighthouse 90+, 이미지·번들 최적화, 메타데이터 | 별도 spec |
| C. 배포·운영 | Vercel 배포, Sentry, 마이그레이션 트래킹(#3), 권한 매트릭스 CI(#4) | 별도 spec |
| D. 데이터·코드 위생 | Minor 5건(M1~M5), cover orphan(#2), 미사용 함수(#5), audit_logs(#7) | 별도 spec |

(#N = ROADMAP-v2.md "Phase 3 후속 추적 항목" 번호)

## 0.1 주안점 결정

**기법 학습 우선** — 데이터가 적어도 무한 스크롤·스켈레톤·Realtime 패턴을 제대로 구현해
학습한다. 예제(gymcoding Task 013)의 취지와 일치. 따라서 무한 스크롤은 YAGNI로 빼지 않고
포함한다.

---

## 1. 범위 (확정)

| 항목 | 작업 | 현재 상태 |
| --- | --- | --- |
| Realtime 카운트 복원 | 서버 측 broadcast (Server Action → HTTP broadcast) | `postgres_changes` 구독은 있으나 비호스트 미수신 |
| 무한 스크롤 | 홈 "다가오는 이벤트" 그리드만 server 페이징 | 미구현 (`getUpcomingEvents(3)` 단발) |
| 스켈레톤/로딩 | async 라우트 `loading.tsx` + Suspense fallback을 skeleton으로 | `skeleton.tsx` 존재하나 실사용 0, `loading.tsx` 0개 |
| Toast / debounce | 기존 구현 audit·확인만 | sonner 설치+7개 컴포넌트 적용 완료, layout Toaster 마운트 |

**비범위(Out of scope)**: my-events·admin 무한 스크롤(홈만), Realtime 명단 실시간(카운트만),
broadcast 채널 인가(`private`), audit_logs.

---

## 2. Realtime 카운트 복원

### 2.1 문제 (Phase 3 부채 #1)

마이그레이션 `20260530000000`이 `v2_event_participants_select` RLS의 self-recursive 조건 4를
제거(PG 42P17 회피)한 부수 효과로, `postgres_changes` 구독도 같은 RLS를 적용받아
**비호스트 참여자는 다른 참여자의 INSERT/DELETE를 수신하지 못한다**. host/admin만 정상.

### 2.2 접근법 비교 (brainstorming 결과)

| 안 | 방식 | 채택 |
| --- | --- | --- |
| A. Broadcast | join/leave 시 broadcast 송신, 전원 수신 (RLS 무관) | ✅ (서버 측 변형) |
| B. 집계 테이블 + DEFINER | count 전용 테이블을 trigger 유지, RLS로 카운트만 공개 | ✗ trigger/publication = Phase 3 지뢰밭 |
| C. RLS SELECT 재추가 | postgres_changes 부활 위해 정책 재작성 | ✗ 42P17 재발 위험 + 명단 재노출 |

A를 채택하되, "클라이언트가 송신"이 아니라 **Server Action이 DB 변경 성공 직후 서버에서
송신**하는 변형으로 신뢰 경계 약점을 제거한다. `joinEvent`가 서버에서 `redirect()`하므로
클라이언트 송신 타이밍이 없다는 코드 제약도 이 변형이 해결한다.

### 2.3 데이터 흐름

```
joinEvent/leaveEvent (Server Action, lib/actions/participants.ts)
  └─ DB insert/delete 성공 확인 (기존 23505 / count:exact 가드 유지)
     └─ supabase.channel(`event:${eventId}:participants`)
          .send({ type:'broadcast', event:'participant_change',
                  payload:{ delta:+1 (join) | -1 (leave) } })
        ※ subscribe() 하지 않은 채널에 send → supabase-js가 HTTP 로 전송
          (공식 문서 확인: broadcast.mdx "Sending a message before subscribing will use HTTP").
          짧게 사는 Server Action 에 적합. private 미설정 = 공개 broadcast.

EventParticipantsCount (client, components/events/event-participants-count.tsx)
  └─ supabase.channel(`event:${eventId}:participants`)
       .on('broadcast', { event:'participant_change' },
           ({ payload }) => setCount(c => Math.max(0, c + payload.delta)))
       .subscribe()
        ※ 기존 postgres_changes INSERT/DELETE 구독을 broadcast 구독으로 교체.
```

### 2.4 설계 근거

- **서버 권위**: DB 변경 성공 시에만 broadcast → 클라이언트 위조 불가.
- **publication/RLS 탈피**: `postgres_changes` 제거로 Phase 3 silent breakage #6(publication
  미등록)·#7(RLS self-recursion) 영역을 구조적으로 회피.
- **개인정보 비노출**: payload는 `delta` 숫자뿐. 참여자 명단은 여전히 미전송.
- **초기값 유지**: `initialCount`는 기존대로 `page.tsx`가 `getEventPublicUsers` RPC length로
  계산해 prop 전달 (commit 237063c 패턴 유지).

### 2.5 엣지 케이스

- **broadcast 송신 실패**: `.send()` HTTP 실패해도 DB 변경은 이미 커밋됨 → best-effort.
  `console.error`만 남기고 `revalidatePath`/`redirect` 흐름은 차단하지 않는다.
- **delta drift(메시지 유실)**: 표시용이라 허용하되, **탭 재가시화/재연결 시 서버 카운트
  1회 재동기화**로 보강. 구현: `EventParticipantsCount`가 마운트 시 + `SUBSCRIBED` 재진입 시
  서버에서 현재 카운트를 1회 재조회(기존 RPC 재사용)해 `setCount`로 덮어쓴다.
- **음수 방지**: `Math.max(0, c + delta)` 유지.

---

## 3. 무한 스크롤 (홈 그리드)

### 3.1 쿼리 계층 (lib/queries/events.ts)

신설:
```ts
/** upcoming 이벤트 페이지 (event_date asc, id asc 안정 정렬). */
export async function getUpcomingEventsPage(
  offset: number,
  limit: number,
): Promise<Event[]>
```
- `v2_events_with_status`에서 `status='upcoming'`,
  `.order('event_date', { ascending: true }).order('id', { ascending: true })`,
  `.range(offset, offset + limit - 1)`.
- **안정 정렬 근거**: `event_date` 동률 시 `id` tie-break이 없으면 페이지 경계에서 중복/누락
  발생. 2차 키로 결정성 확보.
- 기존 `getUpcomingEvents(limit)`는 다른 호출처가 있으면 보존, 없으면 정리(plan에서 확인).

### 3.2 Server Action (lib/actions/events.ts 또는 신규)

```ts
/** 홈 무한 스크롤 다음 페이지. */
export async function loadMoreUpcomingEvents(offset: number): Promise<Event[]>
```
- 내부에서 `getUpcomingEventsPage(offset, PAGE_SIZE)` 호출. 입력 `offset`은 정수 가드.

### 3.3 클라이언트 (components/events/upcoming-events-infinite.tsx 신규)

- props: `initialEvents: Event[]`(서버 SSR 첫 페이지).
- 상태: `events`, `offset`, `hasMore`, `isLoading`.
- **native `IntersectionObserver`** 센티넬 div가 viewport 진입 시 `loadMoreUpcomingEvents` 호출,
  결과 append. 반환 row < `PAGE_SIZE`면 `hasMore=false` + 관찰 중단.
- 라이브러리 미도입 (zero-dep, 번들 절약, 학습 목적).
- `PAGE_SIZE = 9` (3열 × 3행).

### 3.4 홈 페이지 (app/page.tsx)

- `UpcomingEventsSection`(Server Component)이 첫 페이지를 `getUpcomingEventsPage(0, 9)`로 SSR →
  `<UpcomingEventsInfinite initialEvents={...} />`로 hydrate.
- 빈 목록이면 기존 `EventListEmpty` 유지.

---

## 4. 스켈레톤 / 로딩

- 신설 `components/events/event-card-skeleton.tsx`(`EventCardSkeleton`) +
  `EventListSkeleton`(그리드 N개).
- 적용:
  - `app/loading.tsx`(홈) — 히어로는 정적, 그리드 자리는 `EventListSkeleton`.
  - `app/events/[id]/loading.tsx`, `app/my-events/loading.tsx`.
  - admin 페이지 `loading.tsx`(대시보드/테이블) — 테이블은 행 skeleton.
  - `app/page.tsx`의 현재 `<p>로딩...</p>` Suspense fallback을 `EventListSkeleton`으로 교체.

---

## 5. Toast / debounce (audit)

- 기존 7개 컴포넌트(admin-delete-confirm, copy-invite-link-button, event-form,
  event-share-actions, invite-preview, profile-form, sonner) mutation 성공/실패 toast
  일관성 점검 — 누락 시 보충. 신규 패턴 도입 없음.
- admin 검색 200ms debounce(#6, `admin-search-bar.tsx`)는 코드 정상 → Playwright로 동작 확인만.
  코드 변경 없을 가능성이 높다.

---

## 6. 테스트 전략

- **Playwright MCP**:
  1. 2세션(host1 + bandnell)에서 참여자 가입/탈퇴 시 **양쪽 카운트가 실시간 ±1** 반영.
  2. 홈에서 스크롤 → 다음 9개 로드, 끝 도달 시 추가 로드 중단.
  3. 라우트 진입 시 skeleton 노출(로딩 상태 캡처).
- **회귀**: `npm run build`(routes PASS), `npm run lint`(0), `tsc`(0).
- **broadcast 단위 검증**: Server Action 호출 후 다른 탭에서 payload 수신 확인(콘솔 로그).

---

## 7. 구현 단위 (writing-plans 입력)

1. 쿼리/액션: `getUpcomingEventsPage`, `loadMoreUpcomingEvents`.
2. Realtime: `participants.ts`에 서버 broadcast 송신 + `EventParticipantsCount` broadcast 구독 교체 + 재동기화.
3. 무한 스크롤 클라이언트 컴포넌트 + 홈 페이지 통합.
4. 스켈레톤 컴포넌트 + `loading.tsx` 일괄 추가.
5. Toast/debounce audit.
6. Playwright 시나리오 + 회귀.

---

## 8. 미해결 / 위험

- 서버 측 `channel.send` HTTP 송신이 Vercel serverless(Phase 4-C 배포 후)에서도 동일 동작하는지
  배포 환경 재확인 필요 — 로컬 dev는 공식 문서 기준 동작.
- `getUpcomingEvents` 기존 호출처 정리는 plan 단계에서 grep 확인.
