# 1회성 이벤트 플랫폼 v2.0 — PRD (예제 학습용)

> 작성일: 2026-05-24
> base branch: `feat/event-platform-v2` (분기점: main `6f7e01b`)
> 학습 출처: https://github.com/gymcoding/nextjs-supabase-app
> 도메인: 1회성 이벤트 (Gather 예제와 동일)
> 상태: **brainstorming 진행 중** — 본 PRD는 brainstorming 결과로 채워질 예정
> v1.0 PRD: [`./PRD.md`](./PRD.md) — 단톡방 보완 도구 (정기 모임 + 누적 출석률), 학습 자산으로 보존

---

## 진행 흐름

1. **brainstorming** (현재 단계): `superpowers:brainstorming` 스킬로 핵심 결정 수집
   - 예제 일치도: 100% 그대로 vs 본 프로젝트 적응
   - 사용자 역할: 3개(주최자/참여자/관리자) 모델 확정
   - 화면 범위: 예제 13개 페이지 모두 vs 일부 선택
   - 인증: Google OAuth (v1.0 인프라 재사용 가능)
   - DB 모델: 예제(users, events, event_participants) 신규 vs v1.0 일부 재사용
2. **PRD 작성**: 본 파일 갱신
3. **ROADMAP 작성**: `docs/ROADMAP-v2.md`
4. **spec → plan → 구현**: `docs/superpowers/specs/`, `docs/superpowers/plans/`

---

## 의도된 변경 (v1.0 → v2.0)

brainstorming에서 확정될 항목들의 1차 가정:

| 차원 | v1.0 (보존) | v2.0 (예상) |
| --- | --- | --- |
| 핵심 도메인 | 정기 모임 + 회차 + 누적 출석률 | 1회성 이벤트 |
| 사용자 역할 | owner / 멤버 (2개) | 주최자 / 참여자 / 관리자 (3개) |
| RSVP 모델 | 3-상태(going/not_going/pending) + 시간 잠금 | 참여/취소 (예제 기준 확인) |
| admin 페이지 | 없음 (영구 비범위) | **있음** (대시보드 + 이벤트/사용자/통계 관리) |
| 인증 | Google OAuth 단일 | Google OAuth (v1.0 인프라 재사용) |
| 데스크톱 UI | 모바일 우선 | 모바일(사용자) + 데스크톱(admin) |
| 누적 출석률 | `group_attendance_stats` view 핵심 | 1회성이라 의미 없음 → 폐기 |
| 그룹(`groups`) | 1 그룹 = 1 정기 모임 | **개념 폐기** (이벤트가 단위) |
| 초대 토큰 | 그룹 단위 | 이벤트 단위 (`invite_code`) |

---

## v1.0에서 재사용 가능 자산 (가설)

- `lib/datetime.ts` — KST 고정 유틸 (도메인 무관)
- `lib/tokens.ts` — `crypto.randomBytes` 토큰 생성 (이벤트 invite_code로 재사용)
- Google OAuth 셋업 + RLS 헬퍼 함수 3중 안전장치 패턴 (`language plpgsql` + `SET LOCAL row_security TO OFF` + `owner postgres`)
- `next-themes` 다크모드, shadcn/ui 컴포넌트, Tailwind v3 셋업
- `proxy.ts` (Next.js 16 미들웨어 — 인증 가드 패턴)
- Vercel Analytics 통합 패턴

---

## 본 파일 갱신 트리거

- brainstorming 완료 시 핵심 섹션 (개요, In/Out 범위, 기능 명세, 시나리오) 본 파일에 덮어쓰기
- spec/plan 단계에서 결정사항은 본 파일에 반영하지 말고 `docs/superpowers/specs/`, `docs/superpowers/plans/`에 기록
