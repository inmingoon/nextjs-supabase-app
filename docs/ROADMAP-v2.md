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

1. **Realtime UX 복원**: RLS 정책 fix 부수 효과로 같은 이벤트 다른 참여자의 INSERT/DELETE Realtime 알림 차단됨. 본인 + host 알림은 정상. broadcast 채널 또는 SECURITY DEFINER 보조 함수로 "다른 참여자 가입 시 카운트 +1" UX 복원 검토.
2. **cover blob orphan 정리**: adminDeleteUser 의 cascade로 v2_events 가 사라질 때 storage cover blob 미정리 (adminDeleteEvent 만 deleteEventCover 호출). cron 또는 storage event hook 으로 orphan 청소 검토.
3. **v2 마이그레이션 트래킹 정착**: Supabase Studio SQL Editor 적용 시 `supabase_migrations.schema_migrations` 미기록 → "어떤 migration 이 적용됐는지" 추적 어려움. Task 7 에서 publication 등 누락 발견. CLI `supabase db push` 또는 매번 MCP `apply_migration` 사용으로 정착.
4. **권한 매트릭스 종합 검증**: 8 silent breakages 공통 root cause. spec 작성 시 권한 평가 path 별 (anon / authenticated / SECURITY DEFINER / service_role) 매트릭스 작성 + JWT 시뮬레이션 회귀 테스트 (CI 단계).
5. **lib/queries/participants.ts:countParticipantsOfEvent 미사용 정리**: commit 237063c 이후 호출자 없음. RLS 정책 fix (1f464a6) 후 다시 작동 가능하므로 보존 결정.
6. **admin-flow #2 검색 debounce UI confirmation**: 200ms debounce + 클라이언트 filter UX 는 코드 정상이나 사용자 환경 confirmation 미수집.
7. **audit_logs 테이블**: 현재 admin Server Actions 의 감사 로그는 `console.warn` (Vercel sink). v2.x 에서 audit_logs 테이블 도입 + admin UI 조회.

- **Phase 4: 고급 기능 및 최적화** (Task 013~015)
  - UX 향상 (Toast, 스켈레톤, 무한 스크롤)
  - 성능 + SEO (Lighthouse 90+)
  - Vercel 배포 + Sentry 모니터링

상세는 brainstorming 후 채워질 예정.

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
