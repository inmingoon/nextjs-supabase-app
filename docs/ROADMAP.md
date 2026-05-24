# 모임 관리 MVP 개발 로드맵

카톡 단톡방이 못 푸는 누적 데이터(누가 답했나·누가 얼마나 출석했나)만 잘 다뤄, 단톡방 옆에 붙여 쓰는 보완 도구

## 개요

본 서비스는 5~30명 규모의 정기 모임 운영자와 멤버를 위한 단톡방 보완 도구로, 다음 기능을 제공합니다:

- **그룹·초대 시스템**: owner가 그룹을 만들고 카카오톡 단톡방에 초대 링크 하나로 멤버 합류
- **회차 + RSVP**: 회차 1탭 응답(`going` / `not_going`), 시작 시각 이후 응답 잠금(RLS WITH CHECK)
- **누적 출석률 자동 집계**: `group_attendance_stats` view로 그룹·멤버 단위 출석률 실시간 갱신
- **마이페이지 통합 뷰**: 다음 모임 + 그룹별 출석률을 한 화면에서 확인
- **KST 고정 + 다크모드**: `lib/datetime.ts` 유틸 일원화, OS 시계 무관

> 작성일: 2026-05-24 · 상태: v1.0 완료, v1.1(배포 + 운영 안정화) 진행 중
> 본 문서는 사실관계 기록물이 아니라 **의사결정·우선순위 도구**입니다.

## 비전과 북극성 지표

### 한 문장 비전 (PRD §1)

**"카톡(단톡방)이 못 푸는 누적 데이터 — 누가 답했나·누가 얼마나 출석했나 — 만 잘 해서 단톡방 옆에 붙여 쓰는 보완 도구."**

본 서비스는 단톡방을 대체하지 않습니다. 공지·잡담·실시간 커뮤니케이션은 단톡방에 둡니다. 사용자 체류 시간은 **회차당 10초 안팎**을 목표로 합니다.

### 북극성 지표 후보 (가설 수준)

MVP 검증 단계라 본 지표들은 모두 **가설**입니다. v1.2 사용자 피드백 수집 후 1~2개로 좁힙니다.

| 지표 | 목표 (1차 가설) | 측정 방법 | 의미 |
| ---- | ---- | ---- | ---- |
| **그룹 D7 잔존율** | 그룹 생성 후 7일 시점에 회차 1개 이상 추가 생성된 그룹 비율 ≥ 40% | `groups.created_at` + `events.created_at` 시계열 비교 | 그룹이 "한 번 만들고 잊혀지는" 게 아니라 실제 운영 도구로 자리잡았는지 |
| **회차당 RSVP 응답률** | 회차 시작 시점에 멤버의 ≥ 70%가 응답 (`going` 또는 `not_going`) | `event_participations` 카운트 / `group_members` 카운트 | 단톡방 "ㅇ/ㄴ" 답글 카운팅을 본 서비스가 실제로 대체하고 있는지 |
| **사용자 회차당 체류 시간** | 회차 상세 페이지 평균 체류 시간 ≤ 30초 | Vercel Analytics 또는 별도 측정 | "10초 안팎" 포지셔닝이 실제 동작하는지 |

## 개발 워크플로우

1. **작업 계획**
   - 현재 코드베이스 상태 (`git status`, `git log`)와 PRD를 확인
   - 새 작업을 포함하도록 `ROADMAP.md` 업데이트
   - v2.0 후보는 §RICE 표에서 점수 산출 후 사용자 결정 위임

2. **작업 생성**
   - `docs/superpowers/specs/`에 spec, `docs/superpowers/plans/`에 plan 파일 생성
   - 수락 기준(Acceptance Criteria), 영향 파일, 단계별 회귀 검증 포함
   - **DB 마이그레이션 작업 시 RLS 정책 + 정책 회귀 SQL 필수 포함**

3. **작업 구현**
   - Plan 파일의 phase 순서대로 진행
   - 각 phase 종료 시 회귀 검증(빌드·타입·정책·UI 시나리오) 실행
   - **OAuth가 얽힌 흐름은 코드 review + DB JWT 시뮬레이션으로 95% 커버, 나머지 5%는 사용자 수동 검증 위임 (PRD §10.3)**
   - Phase 완료 시 일시 중단하고 사용자 승인 후 다음 phase

4. **로드맵 업데이트**
   - 완료 작업은 ✅로 표시
   - 의사결정은 §의사결정 로그에 1줄 추가 (이유 포함)

## 개발 단계

### Phase 1: 스키마·그룹·초대 ✅ 완료 (2026-05-23)

- **Task 001: 데이터베이스 스키마 + RLS 기반 정책** ✅
  - `profiles`, `groups`, `group_members` 테이블 생성
  - RLS 헬퍼 함수 3중 안전장치 (`language plpgsql` + `SET LOCAL row_security TO OFF` + `owner postgres`)
  - PostgreSQL `ERROR 42P17` (RLS 무한 재귀) 해소 (PRD §10.1)
  - 보정 마이그레이션 1건 추가

- **Task 002: Google OAuth 인증 단일화** ✅
  - 이메일/매직링크/게스트 전부 제외 → 가입 분기 1축 압축
  - `@supabase/ssr` + Next.js 16 `proxy.ts` (Node.js runtime 전용)
  - 세션 만료·익명 응답 비범위로 못박음

- **Task 003: 그룹 CRUD + 초대 토큰** ✅
  - owner 그룹 생성/편집/삭제
  - 토큰 기반 초대 링크 (단톡방 붙여넣기 흐름)
  - 멤버 가입 흐름 (로그인 → 초대 페이지 → 자동 가입)

- **Task 004: Phase 1 회귀 검증** ✅
  - RLS 정책 회귀 SQL + UI smoke test 통과

### Phase 2: 회차 + RSVP ✅ 완료 (2026-05-24)

- **Task 005: 회차(`events`) 스키마 + CRUD** ✅
  - `events` 테이블 + owner-only INSERT/UPDATE/DELETE 정책
  - KST 고정 입력 UI (`lib/datetime.ts` 유틸 일원화)

- **Task 006: RSVP 토글 + 응답 잠금** ✅
  - `event_participations` 테이블 + 1탭 토글 UI
  - **응답 잠금을 DB RLS WITH CHECK에 박은 결정** — `EXISTS (select 1 from events where id = event_id and starts_at > now())` 강제
  - 앱 코드 우회·SQL 콘솔·악성 클라이언트도 잠금 풀 수 없음 (PRD §10.6)

- **Task 007: Phase 2 회귀 검증** ✅
  - 잠금 전/후 INSERT·UPDATE 정책 회귀 SQL + UI 시나리오 통과

### Phase 3: 출석률·마이페이지 ✅ 완료 (2026-05-24)

- **Task 008: `group_attendance_stats` view + 멤버 출석률 표** ✅
  - 그룹·멤버 단위 누적 출석률 자동 갱신
  - **Supabase view + nested FK select 한계 회피** — `select("..., profiles(full_name)")` 형태가 `SelectQueryError`로 추론되는 문제 해결 (PRD §10.2)
  - view는 통계만, `group_members`+`profiles`는 별도 query 후 클라이언트 Map join

- **Task 009: 마이페이지(`/me`) 통합 뷰** ✅
  - 다음 모임 + 그룹별 출석률 한 화면
  - **SKIP된 항목** (PRD §10.8·10.9): 다가오는 회차 카드 빠른 RSVP 토글, Nav `/me` 진입 메뉴 → v2.0 RICE 평가 대상

- **Task 010: Phase 3 회귀 검증** ✅
  - 출석률 정합성 + UI smoke test 통과, main 머지 완료

### Phase 4: Vercel 배포 + 운영 안정화 🔄 진행 중 (v1.1)

- **Task 011: GitHub default branch를 `main`으로 전환** - 우선순위
  - 현재 default `feat/profiles-table` → main
  - GitHub Settings → Branches에서 변경 (사용자 web UI)
  - 원격 브랜치 `feat/profiles-table` 삭제 (`git push origin --delete feat/profiles-table`)
  - **예상 소요**: 30분 이내

- **Task 012: Vercel 프로젝트 import + 환경변수 등록**
  - Framework: Next.js, Production Branch: main
  - 환경변수 3종:
    - `NEXT_PUBLIC_SUPABASE_URL` (Production + Preview + Development)
    - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Production + Preview + Development)
    - `SUPABASE_SERVICE_ROLE_KEY` (**Sensitive 체크 + Production 한정**, Preview/Development 미배포 권장)
  - **의존성**: Task 011 완료 후
  - **예상 소요**: 30분 이내

- **Task 013: Supabase Auth Redirect URLs 갱신**
  - Vercel production URL을 `Site URL` + `Redirect URLs` 둘 다 추가
  - OAuth 콜백 allowlist 누락 시 로그인 실패
  - **의존성**: Task 012 완료 후
  - **예상 소요**: 30분 이내

- **Task 014: Vercel production smoke test (7단계)**
  - 비로그인 홈 200 → Google OAuth 로그인 → 그룹 생성 → 초대 링크 복사 → 시크릿 창에서 초대 가입 → 회차 생성 → RSVP 토글 (잠금 전·후) → 그룹 출석률 표 갱신 → `/me` 확인
  - **테스트 체크리스트 (수동, OAuth 풀체인 위임)**:
    - [ ] 비로그인 홈 200 OK
    - [ ] Google OAuth 콜백 정상
    - [ ] 그룹 생성 + 초대 링크 복사
    - [ ] 시크릿 창 초대 가입
    - [ ] 회차 생성 + RSVP 잠금 전 응답
    - [ ] 회차 시작 시각 이후 응답 거부 (잠금 동작)
    - [ ] 출석률 표 + `/me` 갱신
  - **의존성**: Task 013 완료 후
  - **예상 소요**: 30분~2시간

- **Task 015: 빌드 산출물 비밀 키 grep 검증**
  - Vercel build log 또는 로컬 `npm run build` 후 `.next/`에 `SUPABASE_SERVICE_ROLE_KEY` 값 미포함 확인
  - PRD §5.4·9.3·10.7 보안 요구
  - **예상 소요**: 30분 이내

- **Task 016: PRD 사실관계 정정 (코드 변경 없음)**
  - PRD §5.5·5.6·6.1 "Next.js 15" → "Next.js 16" (실측 16.2.6, `node_modules/next/package.json`)
  - PRD §5.5 "PPR Partial Prerendering" → "Cache Components" (Next.js 16 공식 명칭 변경)
  - PRD §5.6 "Next.js 15 미들웨어" → "Next.js 16 proxy" + **Node.js runtime 전용 (Edge runtime 미지원)** 명시
  - 빌드 산출물 `◐` 기호 의미가 달라졌을 수 있어 `npm run build` 1회 더 돌려 실측
  - **예상 소요**: 30분 이내

- **Task 017: Next.js 버전 핀 정책 결정**
  - 옵션:
    - **A. 추천**: `^16.2.6`으로 핀 → 16.x 내 자동 업그레이드만 허용, 17.x 메이저 변경 차단
    - **B**: `latest` 유지 → 메이저 업그레이드가 알림 없이 production 빌드를 깨뜨릴 수 있음
  - **추천 근거**: production 배포 직전 단계에서 "조용한 메이저 업그레이드" 리스크가 명확. `^16.2.6`도 16.x 패치/마이너는 자동 반영되어 유지보수 부담 거의 없음
  - 동일 정책을 `react`, `react-dom`, `@supabase/ssr` 등 핵심 의존성에도 검토 권장
  - **예상 소요**: 30분 이내

- **Task 018: Vercel Analytics enable + Supabase 운영 관측 셋업**
  - `npm i @vercel/analytics` + `app/layout.tsx`에 `<Analytics />` 추가
  - 페이지뷰 + Real Experience Score 기본 측정 → v1.2 북극성 지표 측정 토대
  - Supabase `get_advisors` 1회 실행 + 결과 검토 (RLS 누락, 인덱스 누락 등)
  - Supabase `get_logs` 정기 점검 루틴 결정 (매주 1회 auth/postgres/api 로그 훑기)
  - **예상 소요**: 30분 이내

### Phase 5: 초기 사용자 피드백 (v1.2)

- **Task 019: OAuth 풀체인 수동 검증 (1회)**
  - 신규 사용자가 OAuth 로그인 후 첫 그룹 가입까지 완주하는 흐름을 시크릿 창에서 1회 확인
  - PRD §10.3 미커버 5% 청산
  - **의존성**: Phase 4 완료 후

- **Task 020: 본인 그룹 1~2개 도입 + 지인 운영자 5명 모집**
  - 작성자 본인이 운영 중인 정기 모임에 본 서비스 도입 (포지셔닝 본인 검증)
  - 지인 5명에 사용 전 5분 demo + 사용 후 1주 시점 인터뷰
  - (선택) Reddit·디스코드·카톡 오픈채팅에 시범 모집 글 (5~10명이면 충분)

- **Task 021: 정량 지표 1주치 수집**
  - D1·D7 잔존율 (5~10명 규모는 통계적 유의성 없음, "방향성 신호"로만 활용)
  - 회차당 응답률
  - 평균 응답 소요 시간 (회차 생성 시각 → 첫 응답 시각)
  - 가장 자주 막힌 분기 (Vercel Analytics 페이지별 이탈 + 인터뷰)

- **Task 022: 정성 인터뷰 10건**
  - 1:1 30분 영상 통화 또는 카톡, 질문 3개 압축
    - "단톡방 대신 본 서비스를 열게 되는 순간이 있었나요?"
    - "가장 답답한 순간이 있었나요?"
    - "다음에 가장 필요한 기능 1가지를 꼽으면?"
  - 인터뷰 후 NPS 1문항 + 자유 응답 1문항 (구글 폼)

- **Task 023: 북극성 지표 1~2개 확정 + v2.0 RICE 표 Confidence 보정**
  - 3개 가설 지표 중 1~2개 확정 (과측정 방지)
  - v2.0 후보의 Confidence 컬럼 0.5 → 0.8/1.0 갱신

### Phase 6: 첫 큰 가치 확장 (v2.0, 사용자 결정 대기)

- **Task 024: 다가오는 회차 카드 빠른 RSVP 토글 + Nav `/me` 진입 메뉴** - 우선순위 (추천)
  - RICE: 12.0 + 8.0 (최상위 묶음)
  - 그룹 페이지에서 회차 상세 진입 없이 1탭 RSVP
  - Nav dropdown에 `/me` 진입 메뉴 추가 (발견성 개선)
  - **주요 차이점**: PRD §10.8·10.9 단순화 결정 부채를 한 PR로 청산. Effort 작고 되돌리기 쉬움(client island 1개 + nav dropdown 1개)
  - **의존성**: Phase 5 완료 (사용자 피드백 반영)

- **Task 025: 초대 토큰 회전/회수 UI** - 대안 B
  - RICE: 4.8
  - owner-only feature, 토큰 노출 사고 대응
  - **트리거 조건**: v1.2에서 토큰 노출 사례 1건이라도 보고되면 최우선 격상

- **Task 026: 출석률 차트 (월별 추이)** - 대안 C
  - RICE: 4.8
  - 누적 출석률 표의 자연스러운 확장
  - recharts 등 차트 라이브러리 1개 + view 1개 (`group_attendance_monthly`)
  - **트리거 조건**: v1.2에서 "주최자가 추세를 보고 싶다" 신호 명확 시 우선순위 상승

> **조건부 추천 (도메인 기반)**: 운동 모임 위주면 (A → C → B) 순. 스터디 모임 위주면 (A → B → C) 순. 혼합이면 A 단독 진행 후 v2.1에서 B·C 결정.

### Phase 7+: 후속 백로그 (v2.x+)

#### High (RICE 4 이상, v2.1~v2.2 후보)

- 초대 토큰 회전/회수 UI (Task 025, v2.0 미선택 시)
- 출석률 차트 월별 추이 (Task 026, v2.0 미선택 시)
- 사후 출석부 수동 정정 (RICE 4.8, RLS WITH CHECK 풀고 owner-only UPDATE 분기 신설)

#### Medium (RICE 1~4, v2.x 검토)

- 반복 일정 (RRULE) — 가치 크나 Effort·UX 복잡도 부담 (RICE 3.2)
- 푸시 알림 (PWA) — 단톡방 알림으로 충분한지 v1.2에서 검증 필요 (RICE 3.2)
- iCal/Google Calendar 연동 — ics 다운로드만이면 Medium-High (RICE 2.4)
- 카카오 알림톡 — 사업자 등록 필요 (RICE 1.2)
- 모바일 앱 (네이티브) — PWA로 80% 가치 달성 가능 (RICE 1.2)

#### Low (RICE 1 미만, 신호 강할 때만)

- 공동 운영자 (RICE 1.0)
- 정원/대기열 (RICE 1.0)
- 회비/정산 (RICE 0.8)
- 공개 그룹 검색·신청·승인 (RICE 0.6)
- 카풀 매칭 (RICE 0.4)
- 다국어/다중 타임존 (RICE 0.3)

#### 영구 비범위 (PRD §2.2)

- 단톡방 대체 기능 (채팅·게시판·DM)
- 익명/게스트 응답

## v2.0 RICE 평가 표

| 후보 | Reach | Impact | Confidence | Effort | RICE |
| ---- | :---: | :----: | :--------: | :----: | :--: |
| **다가오는 회차 카드 빠른 RSVP 토글** | 5 | 3 | 0.8 | 1 | **12.0** |
| **Nav `/me` 진입 메뉴** | 5 | 2 | 0.8 | 1 | **8.0** |
| 초대 토큰 회전/회수 UI | 3 | 4 | 0.8 | 2 | 4.8 |
| 출석률 차트 (월별 추이) | 4 | 3 | 0.8 | 2 | 4.8 |
| 사후 출석부 수동 정정 | 3 | 4 | 0.8 | 2 | 4.8 |
| 반복 일정 (RRULE) | 4 | 4 | 0.5 | 5 | 3.2 |
| 푸시 알림 (PWA) | 4 | 4 | 0.5 | 5 | 3.2 |
| iCal/Google Calendar 연동 | 3 | 3 | 0.8 | 3 | 2.4 |
| 카카오 알림톡 | 3 | 4 | 0.5 | 5 | 1.2 |
| 모바일 앱 (네이티브) | 3 | 4 | 0.5 | 5 | 1.2 |
| 공동 운영자 | 2 | 4 | 0.5 | 4 | 1.0 |
| 정원/대기열 | 2 | 4 | 0.5 | 4 | 1.0 |
| 회비/정산 | 2 | 4 | 0.5 | 5 | 0.8 |
| 공개 그룹 검색·신청·승인 | 2 | 3 | 0.5 | 5 | 0.6 |
| 카풀 매칭 | 1 | 3 | 0.5 | 4 | 0.4 |
| 다국어/다중 타임존 | 1 | 3 | 0.5 | 5 | 0.3 |

평가 척도:
- **Reach** (1~5): 영향받는 사용자 비율
- **Impact** (1~5): 영향받았을 때 가치 크기
- **Confidence** (0.5/0.8/1.0): v1.2 검증 전에는 대부분 0.5~0.8
- **Effort** (1~5): 구현·검증 노력 (5 = 2주 이상)
- **RICE = (Reach × Impact × Confidence) / Effort**

## 작업별 세부 사항

### 각 Task 파일 구조

```markdown
# Task XXX: [작업명]

## 개요
- **목표**: [작업의 핵심 목표]
- **예상 소요 시간**: S(≤30분) / M(30분~2시간) / L(2시간 이상)
- **관련 기능**: [PRD §X.Y]
- **의존성**: [이전에 완료되어야 할 Task]

## 구현 사항
- [ ] 세부 구현 항목 1
- [ ] 세부 구현 항목 2

## 수락 기준
- 기준 1: [측정 가능한 완료 조건]
- 기준 2: [측정 가능한 완료 조건]

## 회귀 검증 체크리스트 (DB/RLS 작업 시 필수)
- [ ] RLS 정책 회귀 SQL 통과
- [ ] UI smoke test 통과
- [ ] OAuth 풀체인 영향 분기 수동 검증 (해당 시)

## 관련 파일
- /app/[경로]/page.tsx
- /components/[컴포넌트].tsx
- /supabase/migrations/[YYYYMMDD_name].sql
- /lib/[유틸].ts
```

## 기술 스택 체크리스트

### 이미 설치됨 ✅ (실측 기준 — Phase 4 Task 1.3에서 정정)

- [x] Next.js 16.2.6 (App Router + Cache Components + `proxy.ts`)
- [x] TypeScript 5.9.3
- [x] React 19
- [x] Tailwind CSS v3.4.19 (⚠️ 이전 ROADMAP 표기 "v4"는 오류. PostCSS + `autoprefixer` + `tailwindcss-animate` 셋업)
- [x] shadcn/ui (CLI 복사형 — `package.json` 의존성에 안 잡히는 게 정상. `components/ui/` 디렉터리에 컴포넌트 코드 직접 포함)
- [x] Lucide React
- [x] next-themes (다크모드)
- [x] Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- [x] PostgreSQL RLS + WITH CHECK 정책
- [x] `lib/datetime.ts` (KST 고정 유틸)
- [x] ESLint만 — Prettier · Husky 미설치 (v2.x에서 검토)

### 추가 필요 (v1.1~v2.0)

- [ ] `@vercel/analytics` (Task 018, v1.1 운영 관측)
- [ ] `recharts` (Task 026, v2.0 출석률 차트 채택 시)
- [ ] Vercel cron 또는 GitHub Action (Supabase 콜드 스타트 방지 health-check)
- [ ] Prettier · Husky · lint-staged (v2.x, 코드 스타일 통일이 필요할 시 — Phase 4 정찰에서 미설치 확인)

## 품질 체크리스트

### Phase 완료 기준

#### Phase 1~3 (v1.0 MVP) ✅
- [x] PRD §2.1 In 범위 전부 구현
- [x] RLS 정책 회귀 SQL 통과 (`group_members_select_same_group` 무한 재귀 해소)
- [x] Phase 1·2·3 회귀 검증 PASS
- [x] main 머지 완료

#### Phase 4 (v1.1 배포 + 운영 안정화)
- [ ] Vercel production URL 확정 + smoke test 7단계 PASS
- [ ] 빌드 산출물에 `SUPABASE_SERVICE_ROLE_KEY` 값 미포함 확인
- [ ] PRD 사실관계 정정 4건 머지
- [ ] Next.js 버전 핀 정책 결정 + `package.json` 반영
- [ ] Vercel Analytics 동작 확인 (production URL 방문 후 1개 이상 page view)

#### Phase 5 (v1.2 사용자 피드백)
- [ ] 실사용자 5~10명이 1주 이상 사용 (그룹 1개 + 회차 2개 + 본인 RSVP 1건 이상)
- [ ] 정성 피드백 10건 + 정량 지표 1주치 수집
- [ ] v2.0 RICE 표 Confidence 컬럼 보정
- [ ] OAuth 풀체인 수동 검증 1회 완료

#### Phase 6 (v2.0)
- [ ] v2.0 핵심 후보 1~2개 사용자 결정 + 별도 spec/plan 생성
- [ ] 선택된 Task RICE 점수 사후 검증 (Reach·Impact 실측 vs 예측)
- [ ] §의사결정 로그에 결정 이유 1줄 추가

## 가정·리스크·의존성

### 가정

1. **MVP 핵심 가치가 검증된다** — 단톡방 보완 도구로서 RSVP 카운팅 + 누적 출석률이 실제 가치를 만든다. v1.2에서 검증.
2. **그룹당 5~30명이 실제 모임 규모** — PRD 타깃. 100명 이상은 UI가 깨질 수 있어 v2+에서 재검토.
3. **Google OAuth 의무가 가입 장벽이 되지 않는다** — 타깃 사용자가 Google 계정을 보유한다는 가정.
4. **카카오톡 단톡방이 1차 전파 채널** — 초대 링크 공유가 단톡방 붙여넣기 흐름에 자연스럽게 녹는다.
5. **사용자 OS 시계가 KST에 가깝다** — 해외 거주 한국인 등 edge case는 v2+ 다중 타임존에서 해결.

### 리스크

| 리스크 | 영향 | 완화책 |
| ---- | ---- | ---- |
| **Next.js `latest` 자동 메이저 업그레이드** | production 빌드 무알림 파손 | v1.1 Task 017에서 `^16.2.6`으로 핀 |
| **Supabase 무료 한도 (50K MAU, 500MB DB, 1GB Storage)** | v1.2 유입 시 한도 근접 | v1.1 Task 018 + usage 페이지 정기 점검 |
| **Supabase 콜드 스타트** | 7일 비활성 시 일시 중지 → 첫 사용자 5초+ 지연 | v1.2 시점에 최소 1일 1회 health-check (Vercel cron) |
| **OAuth 자동화 불가** | 매 배포마다 풀체인 수동 검증 필요 | v1.2 검증 후 변경 분기 영향 시에만 수동 (PRD §10.3) |
| **단톡방 vs 본 서비스 가치 충돌** | retention 0 위험 | v1.2 인터뷰 질문 1번이 직접 검증 |
| **MVP 단순화 결정의 부메랑** | 가입 직후 발견성 0 | v2.0 Task 024로 청산 |
| **PRD 사실관계 오류 4건** | 신규 합류 개발자 혼란 | v1.1 Task 016에서 정정 |

### 의존성 단일 실패점

| 의존성 | 역할 | 이전 가능성 |
| ---- | ---- | ---- |
| **Vercel** | 호스팅·CI/CD·Analytics | Netlify/Cloudflare Pages/Fly.io 이전 가능, 비용 큼 |
| **Supabase** | DB·Auth·RPC·View | Postgres는 portable, RLS·Auth·`@supabase/ssr` 통합 코드 재작성 부담 큼 |
| **Google Cloud OAuth** | 인증 유일 채널 | 카카오·네이버 OAuth 추가 가능 (v2+) |
| **GitHub** | 코드 저장소 + Vercel 연동 | 다른 git 호스팅 이전 가능 |

## 주의사항

### 의사결정 우선 접근법 준수

1. **PRD가 사실관계의 1차 출처**: ROADMAP은 의사결정·우선순위 도구일 뿐, 모순 발견 시 PRD 정정 (v1.1 Task 016)
2. **RICE는 의사결정 보조 도구**: 점수가 곧 결정이 아님. v1.2 사용자 피드백이 Confidence를 실측해 점수 자체가 바뀜
3. **v2.0 핵심은 사용자 결정 위임**: 단일 추천이 명확하지 않으면 강요하지 않는다. 도메인(운동/스터디/혼합) 확정 후 조건부 추천 따름
4. **단순화 결정의 부메랑 인지**: PRD §10.8·10.9처럼 MVP에서 SKIP한 항목은 v2.0 RICE 최상위로 돌아오는 패턴

### 검증 필수 사항

1. **DB RLS 정책은 항상 회귀 SQL로 검증**: `WITH CHECK` 우회 시도, 다른 사용자 JWT 시뮬레이션 포함
2. **OAuth 풀체인은 코드 review + JWT 시뮬레이션으로 95% 커버**: 나머지 5%는 시크릿 창 수동 검증
3. **빌드 산출물에 비밀 키 노출 grep 검증**: Vercel 배포 직전 필수 (Task 015)
4. **`group_attendance_stats` view + nested FK select 금지**: view는 통계만, profiles는 별도 query + 클라이언트 Map join

### 성능·체류 시간 목표

1. **회차당 사용자 체류 시간**: 30초 이하 (PRD "10초 안팎" 포지셔닝 검증)
2. **회차 응답률**: 시작 시점 ≥ 70%
3. **그룹 D7 잔존**: ≥ 40%

## 의사결정 로그

본 표는 v2.0 후보 확정·우선순위 변경 등 의사결정을 1줄로 누적합니다. **이유(Why)**를 함께 적어 미래 자기/타인이 맥락을 복원할 수 있게 합니다.

| 일자 | 결정 | 근거 | 후속 작업 |
| ---- | ---- | ---- | ---- |
| 2026-05-24 | ROADMAP 초안 작성, v2.0 핵심 후보는 사용자 결정으로 위임 | MVP 검증 전이라 단일 추천이 명확하지 않음 | v1.2 피드백 수집 → 본 표 갱신 |
| 2026-05-24 | ROADMAP 형식을 Task 단위 분해 + Phase 체크리스트로 재구성 | 가시성·실행 트래킹 강화. RICE/리스크/의사결정 로그는 의사결정 도구로 보존 | v1.1 진행 시 Phase 4 체크리스트 갱신 |

## 다음 단계

1. **즉시 시작**: Task 011 (GitHub default branch를 `main`으로 전환) — 사용자 web UI 작업
2. **Task 012~014 순차 진행**: Vercel import → 환경변수 → Redirect URLs → smoke test
3. **Task 016 병행 가능**: PRD 사실관계 정정 4건 (코드 변경 없음)
4. **Phase 4 완료 후 일시 중단**: v1.2 사용자 모집 흐름 설계 (Task 020) 전 작성자 본인 그룹 도입부터

## 참고 링크

- **PRD 본문**: `docs/PRD.md`
- **원본 spec**: `docs/superpowers/specs/2026-05-23-meetup-mvp-design.md`
- **Phase 1 plan + 회귀**: `docs/superpowers/plans/2026-05-23-meetup-mvp-phase1.md`
- **Phase 2 plan + 회귀**: `docs/superpowers/plans/2026-05-24-meetup-mvp-phase2.md`
- **Phase 3 plan + 회귀**: `docs/superpowers/plans/2026-05-24-meetup-mvp-phase3.md`
- **Vercel 배포 spec**: `docs/superpowers/specs/2026-05-17-vercel-deploy-design.md`
- **Vercel 배포 plan**: `docs/superpowers/plans/2026-05-17-vercel-deploy.md`
- **핵심 디렉터리**: `app/`, `components/`, `lib/`, `supabase/migrations/`

---

**📌 본 로드맵은 v1.0 MVP 완료 직후 작성되었으며, v1.1(배포 + 운영 안정화) → v1.2(사용자 피드백) → v2.0(첫 큰 가치 확장) 순으로 진행합니다.**
**v2.0 핵심 후보는 사용자 결정 대기 상태이며, v1.2 피드백 수집 후 RICE Confidence를 보정해 최종 확정합니다.**
