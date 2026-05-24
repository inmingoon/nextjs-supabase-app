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
- **Phase 2: UI/UX 완성 (더미 데이터)** (Task 003~006)
  - 공통 컴포넌트 라이브러리
  - 주최자 모바일 UI (이벤트 생성/관리/공유)
  - 참여자 모바일 UI (초대 가입/이벤트 확인)
  - 관리자 데스크톱 UI (대시보드/이벤트 관리/사용자 관리/통계)
- **Phase 3: 데이터베이스 + 핵심 기능** (Task 007~012, Playwright MCP E2E 필수)
  - 스키마 + RLS + Supabase Storage (event-covers 버킷)
  - Google OAuth + admin 권한 미들웨어
  - 이벤트 CRUD + 초대 시스템
  - 참여자 관리 + Realtime
  - 관리자 백엔드 API
  - 핵심 기능 통합 테스트
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
