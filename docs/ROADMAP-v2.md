# 1회성 이벤트 플랫폼 v2.0 — ROADMAP (예제 학습용)

> 작성일: 2026-05-24
> 학습 출처: https://github.com/gymcoding/nextjs-supabase-app
> 상태: **brainstorming 진행 중** — 본 ROADMAP은 brainstorming 결과로 채워질 예정
> v1.0 ROADMAP: [`./ROADMAP.md`](./ROADMAP.md) — 학습 자산으로 보존
> v2.0 PRD: [`./PRD-v2.md`](./PRD-v2.md)

---

## 예제와 동일한 흐름 (default)

학습 목적이라 예제의 4 phase 구조를 그대로 따라가는 것이 default:

- **Phase 1: 애플리케이션 골격 구축** ✅ 완료 (2026-05-24)
  - 13개 페이지 라우트 빈 껍데기 (모바일 8 + 데스크톱 5)
  - 모바일 하단 nav + admin 데스크톱 사이드바 layout 컴포넌트
  - TypeScript 타입 정의 (User · Event · EventParticipant · ApiResult)
  - Plan: `docs/superpowers/plans/2026-05-24-event-platform-v2-phase1.md`
  - 회귀: build 24 routes, 0 warnings, lint 0, Playwright sanity 부분 PASS (홈·invite/[code] 컨텐츠 검증 + 보호 라우트 4개 proxy redirect 의도된 동작 — Phase 3 Task 008에서 admin/login whitelist + admin 권한 분기 예정)
  - Plan 일탈: Cache Components 제약으로 dynamic route 3개에 force-dynamic 시도 → Suspense wrap 패턴(v1.0 app/page.tsx와 동일)으로 정공법 적용
- **Phase 2: UI/UX 완성 (더미 데이터)** ✅ 완료 (2026-05-25)
  - shadcn 9개 추가 (avatar·dialog·form·select·table·skeleton·separator·tabs·popover) — calendar는 datetime-local 채택으로 YAGNI 제거
  - lib/dummy/{users,events,participants}.ts + 헬퍼 함수 (Phase 3 supabase fetch로 시그니처 그대로 교체 가능)
  - 주최자: 홈 hero + 다가오는 이벤트 EventCard 그리드, EventForm (RHF + Zod schema factory — mode별 enforceFutureDate 분기), 프로필 + ThemeToggle
  - 참여자: InvitePreview, EventDetailHeader + isHost 분기 Tabs (참여자/관리), my-events 주최한/참여한 Tabs, EventShareActions (클립보드 + 카카오톡 placeholder)
  - 관리자: StatCard 4개 + AdminDataTable (generic + 검색 200ms debounce + client 페이지네이션 + 삭제 Dialog 사유 입력) + Recharts (LineChart 월별·PieChart 상태) + AdminSidebar 하단 ThemeToggle
  - Plan: `docs/superpowers/plans/2026-05-24-event-platform-v2-phase2.md`
  - 회귀: build 25 routes 0 warning, lint 0, typecheck 0
  - 적응 사항: ① LucideIcon function prop → ReactNode (RSC 직렬화 회피) ② Suspense per nav link (Cache Components + usePathname) ③ zod v3→v4·resolvers v3→v5 (shadcn form peer dep) ④ Recharts stroke 리터럴 hex (SVG var() 미평가)
  - reviewer fix 8건 (Task 1: 6 spec 일치 / Task 2: 3 Important / Task 3: 1 Important hydration / Task 4: 1 Critical + 3 Important)
- **Phase 3: 데이터베이스 + 핵심 기능** ✅ 완료 (2026-05-30)
  - Task 1: Supabase 마이그레이션 7개 + v2_admin_users + RLS 5 정책 + storage event-covers 버킷
  - Task 2: types + lib/queries + lib/auth 헬퍼 + dummy 폐기
  - Task 3: Google OAuth + (authed) route group + proxy admin 분기 + safeNextPath open-redirect 차단
  - Task 4: Event CRUD Server Action + Storage cover upload allowlist
  - Task 5: joinEvent/leaveEvent + Realtime EventParticipantsCount + 23505 silent defense
  - Task 6: admin Server Action 3중 가드 (proxy → layout → action) + count:exact 0-row throw + self-deletion guard + 대시보드/통계 server fetch
  - Task 7: Playwright MCP 19 시나리오 검증 — host 4 + participant 4 + admin 8 + error 7 = 21 PASS / 1 UI-only (admin #2 검색 debounce)
  - Task 8: 회귀 검증 + ROADMAP 갱신 + push
  - 회귀: tsc 0, lint 0, build (검증 시점 PASS)

### Phase 3 Task 7 silent breakages 누적 8 건 (모두 fix + commit)

| # | commit | 원인 | fix |
| --- | --- | --- | --- |
| 1 | `0e78d68` | event-covers storage RLS — auth.uid()=NULL evaluation context | `service_role` admin client (`lib/supabase/admin.ts`) 도입 |
| 2 | `880c5fd` | v2_get_event_by_invite_code 의 view security_invoker + stable+SET 충돌 | view 우회 + SET 제거 |
| 3 | `4f11dc7` | v2 trigger 등록 이전 가입자 v2_users row 없음 → joinEvent 23503 | v2_users backfill migration |
| 4 | (사용자 직접) | v2_get_event_public_users RPC SQL Editor 미적용 | 직접 적용 후 검증 |
| 5 | `237063c` | countParticipantsOfEvent (RLS) ↔ getEventPublicUsers (DEFINER) 권한 비대칭 | 단일 RPC + props 패턴 |
| 6 | `1f464a6` | supabase_realtime publication 에 v2_event_participants 미등록 | `apply_migration` 으로 직접 등록 |
| 7 | `1f464a6` | RLS 정책 조건 4 self-recursive → PG 42P17 infinite recursion → 전체 정책 차단 | 조건 4 제거 + 같은 이벤트 다른 참여자 조회는 RPC 전담 |
| 8 | `0bb66db` | v2_is_admin 함수 stable + SET LOCAL row_security 충돌 (PG 0A000) | SET 제거 (DEFINER + 함수 owner BYPASSRLS 자동 우회) |

공통 root cause: 권한 모델 (RLS / SECURITY DEFINER / view security_invoker / publication membership / stable 함수 SET 제약) 의 상호작용. spec 설계 시점에 권한 매트릭스를 "각 component가 무엇을 보여주는가" 가 아닌 "각 query path 가 어떤 권한 평가를 거치는가" 관점으로 검증했어야 함.

### Phase 3 후속 추적 항목 (Phase 4 또는 v2.x)

1. ~~**Realtime UX 복원**~~ → **Phase 4-A 에서 복원 (코드)**: 서버 측 broadcast 채택. joinEvent/leaveEvent Server Action 이 실제 DB 변동 시에만 `event:{id}:participants` 채널로 `{delta:±1}` 송신(`channel.send` HTTP), `EventParticipantsCount` 가 broadcast 구독 + SUBSCRIBED/재가시화 시 서버 재동기화. postgres_changes(RLS·publication 의존) 제거로 호스트/참여자/비참여자 전원 수신. **라이브 검증 완료**(magiclink 로 host1 인증 → broadcast ±1 격리 수신 확인 + joinEvent end-to-end → 카운트 1 + DB row 1). 서버 `channel.send` HTTP 의 serverless 동작은 Phase 4-C 배포 후 재확인.
2. **cover blob orphan 정리**: adminDeleteUser 의 cascade로 v2_events 가 사라질 때 storage cover blob 미정리 (adminDeleteEvent 만 deleteEventCover 호출). cron 또는 storage event hook 으로 orphan 청소 검토.
3. **v2 마이그레이션 트래킹 정착**: Supabase Studio SQL Editor 적용 시 `supabase_migrations.schema_migrations` 미기록 → "어떤 migration 이 적용됐는지" 추적 어려움. Task 7 에서 publication 등 누락 발견. CLI `supabase db push` 또는 매번 MCP `apply_migration` 사용으로 정착.
4. **권한 매트릭스 종합 검증**: 8 silent breakages 공통 root cause. spec 작성 시 권한 평가 path 별 (anon / authenticated / SECURITY DEFINER / service_role) 매트릭스 작성 + JWT 시뮬레이션 회귀 테스트 (CI 단계).
5. **lib/queries/participants.ts:countParticipantsOfEvent 미사용 정리**: commit 237063c 이후 호출자 없음. RLS 정책 fix (1f464a6) 후 다시 작동 가능하므로 보존 결정.
6. ~~**admin-flow #2 검색 debounce UI confirmation**~~ → **Phase 4-A 에서 코드 확인 완료**: `admin-search-bar.tsx` 200ms debounce(`useEffect`+`setTimeout/clearTimeout`, `debounceMs` 기본 200, stale-closure 방지) 정상 확인. 런타임 UI 확인만 수동 대기.
7. **audit_logs 테이블**: 현재 admin Server Actions 의 감사 로그는 `console.warn` (Vercel sink). v2.x 에서 audit_logs 테이블 도입 + admin UI 조회.

- **Phase 4: 고급 기능 및 최적화** — 4개 독립 서브프로젝트로 분해 (brainstorming 2026-06-01)
  - **4-A 체감 UX** ✅ 코드 완료 (2026-06-01): 홈 무한 스크롤(native IntersectionObserver, offset 페이징) + Realtime 카운트 복원(서버 broadcast) + 로딩 스켈레톤. Toast/debounce audit 결과 gap 0.
    - spec: `docs/superpowers/specs/2026-06-01-event-platform-v2-phase4a-ux-design.md`
    - plan: `docs/superpowers/plans/2026-06-01-event-platform-v2-phase4a-ux.md`
    - 검증: tsc 0 / lint 0 / build 25 routes PASS / 최종 opus 코드리뷰(Critical 0, I2 수정) / 데이터 계층 offset 페이징 SQL 증명(page1=9, page2=4, overlap=0)
    - **라이브 검증 완료** (magiclink 로 host1 인증, `docs/v2-phase4/playwright-mcp-ux.md`): 무한 스크롤(SSR 9 + loadMore 1회 + 정지, 무한루프 없음) / Realtime broadcast(±1 격리 수신 + joinEvent end-to-end, DB row 확인) / 이벤트 상세 production 정상(dev 500 은 Turbopack 워커 flakiness, 코드 무관) / 더미 데이터 정리 + orphan 0(cascade 확인)
    - 설계 보정 기록: ① `UPCOMING_PAGE_SIZE` 를 `lib/queries/events-constants.ts`(server-dep 0)로 분리 — 클라 컴포넌트가 `next/headers` 유입 없이 import (RSC 경계). ② 홈 로딩은 `app/loading.tsx`(전역 오적용) 대신 Suspense fallback 교체로 처리. ③ profile-form.tsx 가 Phase 2 더미(console.log + Server Action 미연결) 상태 발견 → 4-D 위생 작업으로 추적.
  - **4-B 성능·SEO**: Lighthouse 90+, 이미지·번들 최적화, 메타데이터 (미착수)
  - **4-C 배포·운영**:
    - **4-C.1 Vercel 실배포** ✅ 완료 (2026-06-02): production `https://nextjs-supabase-app-topaz.vercel.app` (프로젝트 `nextjs-supabase-app`, prod 브랜치 `feat/event-platform-v2`). 코드/vercel.json 변경 0.
      - spec: `docs/superpowers/specs/2026-06-01-event-platform-v2-phase4c1-vercel-deploy-design.md`, plan: `.../plans/2026-06-01-...phase4c1-vercel-deploy.md`, 결과: `docs/deploy/2026-06-02-v2-vercel-deploy-results.md`
      - 검증: v2 빌드/secret 미노출/magiclink 로그인/무한스크롤(Server Action)/**broadcast serverless 송수신(R3·4-A 잔여 해소)**/admin 접근 — production 동작 확인
      - 잔여: 실 Google OAuth Redirect 게이트는 magiclink 로 우회 검증돼 **사용자 수동 1회 로그인 확인 권장**. 이벤트 생성 storage 미검증.
      - 트러블슈팅: 최초 배포가 옛 브랜치(starter 템플릿)로 떠 있었음 → Branch Tracking 전환 + v2 브랜치 push 로 해결(Redeploy 만으론 브랜치 안 바뀜).
    - **4-C.2** (미착수): Sentry, 마이그레이션 트래킹(#3), 권한 매트릭스 CI(#4) — 별도 spec
  - **4-D 데이터·코드 위생**: Minor 5건(M1~M5) + cover orphan(#2) + 미사용 함수(#5) + audit_logs(#7) + profile-form 실연결 (미착수)

---

## 본 ROADMAP 자체의 갱신 방식

brainstorming → spec → plan 단계에서 다음 결정들이 채워진다:

- 예제 Task ↔ 본 프로젝트 Task 매핑 (1:1 vs 통합 vs 분할)
- v1.0에서 재사용할 코드 (KST datetime, OAuth, RLS 헬퍼 등 — PRD-v2 §재사용 자산 참조)
- 새 DB 마이그레이션 ordering
- admin 권한 모델 (Supabase user metadata `app_metadata.role` vs 별도 `admin_users` 테이블)
- 학습 우선순위 (production-grade vs 예제 동작 학습)
- 추가 라이브러리 (React Hook Form, Zod, Recharts — 예제와 동일)

---

## v1.0과의 의사결정 분리

| 결정 | v1.0 main (보존) | v2.0 branch (새로) |
| --- | --- | --- |
| 도메인 정체성 | 단톡방 보완 (정기 모임) | 1회성 이벤트 플랫폼 |
| In/Out 범위 | PRD §2 그대로 | brainstorming에서 재정의 |
| RICE 평가 | v2.0 후보 16건 그대로 (v1.x 후보) | 별도 RICE 표 작성 (v2.x 학습 우선순위) |
| 의사결정 로그 | main의 `docs/ROADMAP.md` | 본 ROADMAP-v2.md의 별도 로그 |
| 배포 | Vercel main → v1.1 production | 학습 완료 후 별도 Vercel 프로젝트 또는 v1.x preview branch |

---

## 다음 단계

1. (현재) `superpowers:brainstorming` 스킬로 v2.0 핵심 결정 5건 수집
2. 본 ROADMAP에 Phase 1~4 task 표 채우기
3. Phase 1 spec/plan 작성 → 구현 시작
