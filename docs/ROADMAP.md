# 모임 관리 MVP — ROADMAP

> 작성일: 2026-05-24
> 상태: v1.0 완료, v1.1 진행 중 (Vercel 배포 + 운영 안정화)
> 본 문서: PRD `docs/PRD.md`의 §8 v2+ 백로그를 우선순위·시점별로 묶고, v1.x 운영 작업을 별도 페이즈로 분리한 로드맵
> 본 문서는 사실관계 기록물이 아니라 **의사결정·우선순위 도구**다. 사용자 결정이 필요한 지점을 명시한다

---

## 1. 비전·북극성 메트릭

### 1.1 한 문장 비전 (PRD §1)

**"카톡(단톡방)이 못 푸는 누적 데이터 — 누가 답했나·누가 얼마나 출석했나 — 만 잘 해서 단톡방 옆에 붙여 쓰는 보완 도구."**

본 서비스는 단톡방을 대체하지 않는다. 공지·잡담·실시간 커뮤니케이션은 단톡방에 둔다. 사용자 체류 시간은 **회차당 10초 안팎**을 목표로 한다.

### 1.2 북극성 지표 후보 (가설 수준)

MVP 검증 단계라 본 지표들은 모두 **가설**이다. v1.2 사용자 피드백 수집 후 확정한다.

| 지표 | 목표 (1차 가설) | 측정 방법 | 의미 |
| ---- | ---- | ---- | ---- |
| **그룹 D7 잔존율** | 그룹 생성 후 7일 시점에 회차 1개 이상 추가 생성된 그룹 비율 ≥ 40% | `groups.created_at` + `events.created_at` 시계열 비교 | 그룹이 "한 번 만들고 잊혀지는" 게 아니라 실제 운영 도구로 자리잡았는지 |
| **회차당 RSVP 응답률** | 회차 시작 시점에 멤버의 ≥ 70%가 응답 (`going` 또는 `not_going`) | `event_participations` 카운트 / `group_members` 카운트 | 단톡방 "ㅇ/ㄴ" 답글 카운팅을 본 서비스가 실제로 대체하고 있는지 |
| **사용자 회차당 체류 시간** | 회차 상세 페이지 평균 체류 시간 ≤ 30초 | Vercel Analytics 또는 별도 측정 | "10초 안팎" 포지셔닝이 실제 동작하는지 (체류 시간이 길다 = 본 서비스가 단톡방 대체를 시도하고 있다는 신호) |

> **주의**: 위 지표들은 v1.2 사용자 피드백 수집 후 1~2개로 좁힌다. 동시에 3개 다 추적하면 과측정으로 의사결정이 흐려진다.

---

## 2. 페이즈 개요

| 버전 | 테마 | 완료 기준 (한 줄) | 상태 |
| ---- | ---- | ---- | ---- |
| **v1.0** | MVP — 단톡방 보완 (그룹·회차·RSVP·출석률) | spec §1.4 In 범위 모두 동작 + Phase 1·2·3 회귀 PASS | ✅ 완료 (2026-05-24) |
| **v1.1** | 배포 + 운영 안정화 | Vercel production URL 확정 + 운영 관측 최소 셋업 + PRD 사실관계 정정 | 🔄 진행 중 |
| **v1.2** | OAuth 풀체인 수동 검증 + 초기 사용자 피드백 수집 | 실사용자 5~10명이 1주 사용 후 정성 피드백 10건 + 정량 지표 1주치 | 대기 |
| **v2.0** | 첫 큰 가치 확장 (1~2개 핵심 후보, **사용자 결정 필요**) | 후보 확정 후 별도 spec/plan | 결정 대기 |
| **v2.x+** | 후속 백로그 (PRD §8 나머지) | 우선순위별 점진 추진 | 백로그 |

---

## 3. v1.0 — MVP (완료, 회고)

### 3.1 무엇을 만들었나

PRD §2.1 In 범위 전부. 한 줄로 요약하면 "Google 계정으로 로그인한 사용자가 그룹을 만들고, 단톡방에 초대 링크를 붙여넣고, 회차를 만들고, 멤버가 1탭으로 RSVP하면, 그룹 페이지에 누적 출석률 표가 자동으로 갱신되는" 흐름이 한국어·KST·다크모드까지 동작한다. Phase 1(스키마·그룹·초대), Phase 2(회차·RSVP), Phase 3(출석률·마이페이지) 모두 회귀 검증 PASS 후 main에 머지 완료.

### 3.2 가장 가치 있던 결정 3개

1. **응답 잠금을 DB RLS WITH CHECK에 박은 결정** (PRD §10.6) — 앱 코드 우회가 보안 표면이 되지 않는다. `event_participations`의 INSERT/UPDATE 정책이 `EXISTS (select 1 from events where id = event_id and starts_at > now())`를 강제하므로 SQL 콘솔·악성 클라이언트도 잠금을 풀 수 없다.
2. **Google OAuth 의무 + 이메일/매직링크/게스트 전부 제외** — 가입 분기·세션 만료·익명 응답 처리 등 인증 복잡도를 1축으로 압축. 가입 장벽이 가설로 남지만 (v1.2에서 검증), MVP 단계에서 가입 흐름 분기 폭발을 피한 게 결정적.
3. **KST 고정 + `lib/datetime.ts` 유틸 일원화** — 사용자 OS 시계와 무관하게 입력·표시가 일관. 다국어/다지역은 비범위로 못박아 datetime 버그 surface가 좁아졌다.

### 3.3 가장 큰 함정 3개

1. **RLS 무한 재귀 — 헬퍼 함수 3중 안전장치** (PRD §10.1) — `group_members_select_same_group` 정책이 자기 테이블을 subquery 참조하면 PostgreSQL이 `ERROR 42P17`을 던진다. 해결은 `language plpgsql` + `SET LOCAL row_security TO OFF` + `owner postgres` (BYPASSRLS) **3가지 모두**가 필요. `stable` 키워드 사용 시 `SET LOCAL` 자체가 금지(`ERROR 0A000`). Phase 1 OAuth 수동 검증 중 발견 → 보정 마이그레이션 1건 추가.
2. **Supabase view + nested FK select 한계** (PRD §10.2) — `group_attendance_stats` view에 `select("..., profiles(full_name)")` 같은 nested FK select가 `SelectQueryError`로 추론된다. view는 통계만, `group_members`+`profiles`는 별도 query 후 클라이언트 Map join 패턴으로 강제 통일.
3. **OAuth 자동화 한계** (PRD §10.3) — `@supabase/ssr` + PPR + Google OAuth 조합에서 magic link admin API + Playwright로 hash→cookie 변환을 자동 trigger하는 시도가 신뢰성 있게 작동하지 않았다. 코드 review + DB JWT 시뮬레이션으로 약 95% 커버, 나머지 5% (실제 OAuth 풀체인)는 v1.2 사용자 위임.

### 3.4 다음 페이즈로 가져가는 부채

| 부채 | 출처 | v1.x 처리 |
| ---- | ---- | ---- |
| 다가오는 회차 카드 빠른 RSVP 토글 SKIP | PRD §10.8 | v2.0 RICE 평가 대상 (§6) |
| Nav에 `/me` 진입 메뉴 없음 (직접 URL만) | PRD §10.9 | v2.0 RICE 평가 대상 (§6) |
| PRD §5.5·5.6·6.1의 "Next.js 15" 표기 (실제 16.2.6) | 실측 불일치 | v1.1에서 정정 (§4) |
| PRD §5.5의 "PPR Partial Prerendering" 표기 (Next.js 16에서는 Cache Components가 공식 명칭) | 실측 불일치 | v1.1에서 정정 (§4) |
| PRD §5.6의 "Next.js 15 미들웨어" 표기 — Next.js 16 `proxy.ts`는 Node.js runtime 전용(Edge 미지원), 단순 rename 아님 | 실측 불일치 | v1.1에서 정정 (§4) |
| `package.json` `next: "latest"` — 16.2.6 설치 중, 자동 업데이트 위험 | 빌드 안정성 | v1.1에서 핀 정책 결정 (§4) |
| OAuth 풀체인 수동 검증 1회 미수행 | PRD §10.3 | v1.2 첫 작업 |

---

## 4. v1.1 — 배포 + 운영 안정화 (현재 진행)

### 4.1 작업 체크리스트

각 항목 옆 추정 노력은 S(≤30분) / M(30분~2시간) / L(2시간 이상).

#### 배포 (사용자 web UI 작업 포함)

- [ ] **GitHub default branch를 `main`으로 전환** — 현재 default가 `feat/profiles-table`. GitHub Settings → Branches에서 main으로 변경. **노력: S** — 사용자 web UI
- [ ] **원격 브랜치 `feat/profiles-table` 삭제** — main 전환 후 정리. **노력: S** — 사용자 또는 `git push origin --delete feat/profiles-table`
- [ ] **Vercel 프로젝트 import** — Framework: Next.js, Production Branch: main, Build Command 기본값. **노력: S** — 사용자 web UI
- [ ] **Vercel 환경변수 3종 등록**:
  - `NEXT_PUBLIC_SUPABASE_URL` (Production + Preview + Development)
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Production + Preview + Development)
  - `SUPABASE_SERVICE_ROLE_KEY` (**Sensitive 체크 + Production 한정** — 또는 server-only scope. Preview/Development에는 미배포 권장)
  - **노력: S**
- [ ] **Supabase Auth `Site URL` + `Redirect URLs` 갱신** — Vercel production URL을 둘 다 추가. OAuth 콜백이 redirect URL allowlist에 없으면 로그인 실패. **노력: S**
- [ ] **Vercel production smoke test** — 비로그인 홈 200 → Google OAuth 로그인 → 그룹 생성 → 초대 링크 복사 → 시크릿 창에서 초대 가입 → 회차 생성 → RSVP 토글 (잠금 전·후 모두) → 그룹 출석률 표 갱신 확인 → `/me` 1회씩 수동 실행. **노력: M**
- [ ] **빌드 산출물 비밀 키 grep 검증** — Vercel build log 또는 로컬 `npm run build` 후 `.next/` 디렉터리에 `SUPABASE_SERVICE_ROLE_KEY` 값이 포함되지 않았는지 확인 (PRD §5.4·9.3·10.7). **노력: S**

#### PRD 사실관계 정정 (코드 변경 없음, 문서만)

- [ ] **PRD §5.5·5.6·6.1 Next.js 버전 표기 정정** — "Next.js 15" → "Next.js 16" (실측 16.2.6, `node_modules/next/package.json`). **노력: S**
- [ ] **PRD §5.5 PPR 표기 정정** — "PPR Partial Prerendering" → "Cache Components" (Next.js 16에서 공식 명칭 변경). 빌드 산출물 표기도 `◐` 기호의 의미가 달라졌을 수 있으니 `npm run build` 한 번 더 돌려서 실측 후 PRD에 반영. **노력: S**
- [ ] **PRD §5.6 미들웨어 표기 정정** — "Next.js 15 미들웨어" → "Next.js 16 proxy". 추가로 **Next.js 16의 `proxy.ts`는 Node.js runtime 전용 (Edge runtime 미지원)** 임을 명시. 단순 rename이 아닌 런타임 변경이라는 점이 운영상 중요 (Edge에서만 동작하던 외부 의존성이 있다면 깨진다). **노력: S**

#### 버전 핀 정책 결정

- [ ] **`package.json`의 `next: "latest"` 핀 정책 결정** — 옵션:
  - **A. 추천**: `^16.2.6`으로 핀. 16.x 안에서만 자동 업그레이드되어 17.x 같은 메이저 변경에 빌드가 깨지지 않는다. 의도적 메이저 업그레이드 전까지 안정성 확보. 되돌리기 쉬움.
  - **B**: `latest` 유지. 의도가 "항상 최신"이라면 일관되지만, 메이저 업그레이드가 알림 없이 발생해 production 빌드가 어느날 깨질 수 있다.
  - **추천 근거**: production 배포 직전 단계라 "조용한 메이저 업그레이드" 리스크가 명확한 데 비해, `^16.2.6`으로 가도 16.x 패치/마이너는 계속 들어와 유지보수 부담이 거의 없다. 동일 정책을 `react`, `react-dom`, `@supabase/ssr` 등 핵심 의존성에도 검토 권장.
  - **노력: S**

#### 운영 관측 최소 셋업

- [ ] **Vercel Analytics enable** (무료 tier) — `npm i @vercel/analytics` + `app/layout.tsx`에 `<Analytics />` 추가. 페이지뷰·Real Experience Score 기본 측정. v1.2 북극성 지표 측정의 토대. **노력: S**
- [ ] **Supabase `get_advisors` 1회 실행 + 결과 검토** — security + performance advisor가 production URL 추가 후 새로 잡는 issue가 없는지 확인 (RLS 누락, 인덱스 누락 등). **노력: S**
- [ ] **Supabase `get_logs` 정기 점검 루틴 결정** — 매주 1회 auth/postgres/api 로그를 훑어 비정상 패턴(401 폭증, RLS 거부 폭증, slow query)을 체크할지 결정. v1.2 사용자 유입 시작 직전에 빈도 정함. **노력: S** (의사결정만)

### 4.2 v1.1 완료 기준

- Vercel production URL이 확정되고 위 smoke test 7단계가 모두 PASS.
- 빌드 산출물에 `SUPABASE_SERVICE_ROLE_KEY` 값 미포함 확인.
- PRD 사실관계 정정 4건 머지.
- Next.js 버전 핀 정책 결정 + `package.json` 반영.
- Vercel Analytics 동작 확인 (production URL 방문 후 대시보드에 1개 이상 page view 표시).

---

## 5. v1.2 — 초기 사용자 피드백

### 5.1 사용자 모집 흐름

1. **본인 그룹부터** — 작성자 본인이 운영 중인(또는 가입 중인) 정기 모임 1~2개에 본 서비스를 도입. "단톡방 옆에 붙여 쓰는" 포지셔닝을 본인이 먼저 검증.
2. **지인 운영자 5명** — 작성자 네트워크에서 정기 모임(운동·스터디·독서)을 운영 중인 지인에게 직접 권유. 사용 전 5분 demo + 사용 후 1주 시점에 인터뷰.
3. **선택**: 본인이 익숙한 커뮤니티에 시범 사용자 모집 글 (Reddit, 디스코드, 카톡 오픈채팅 등). MVP 검증 단계라 무리하지 않고 5~10명 정도면 충분.

### 5.2 수집할 지표

| 지표 | 측정 방법 | 의사결정 용도 |
| ---- | ---- | ---- |
| **D1·D7 잔존율** | 가입일 + 마지막 활동(로그인/RSVP/그룹 진입) 시계열 | 본 서비스가 "한번 써보고 안 쓰는" 도구인지 vs "주기적으로 들어오는" 도구인지 |
| **회차당 응답률** | `event_participations` 카운트 / `group_members` 카운트 | 단톡방 답글 카운팅 대체 가설 검증 |
| **평균 응답 소요 시간** | 회차 생성 시각 → 첫 응답 시각 분포 | 멤버가 회차 알림(단톡방)을 받고 빠르게 응답하는지 |
| **가장 자주 막힌 분기** | 직접 인터뷰 + Vercel Analytics 페이지별 이탈 | 다음 작업 우선순위 (v2.0 RICE에 반영) |

> **주의**: D1·D7는 사용자 5~10명 규모에서는 통계적 유의성이 없다. 정량은 "방향성 신호"로만 활용하고, 정성 인터뷰가 1차 의사결정 입력.

### 5.3 피드백 채널

- **1차: 1:1 인터뷰** — 사용 1주 후 30분 영상 통화 또는 카톡. 질문 3개로 압축: "단톡방 대신 본 서비스를 열게 되는 순간이 있었나요?", "가장 답답한 순간이 있었나요?", "다음에 가장 필요한 기능 1가지를 꼽으면?".
- **2차: 가벼운 구글 폼** — 인터뷰 후 NPS 1문항 + 자유 응답 1문항. 10건 모이면 v2.0 RICE 평가의 Confidence 보정 자료로 활용.

### 5.4 v1.2 완료 기준

- 실사용자 5~10명이 1주 이상 사용 (그룹 1개 이상 + 회차 2개 이상 + 본인 RSVP 1건 이상).
- 정성 피드백 10건 + 정량 지표 1주치 수집.
- v1.2 결과를 §6 RICE 표의 Confidence 컬럼에 반영.
- **OAuth 풀체인 수동 검증 1회** (PRD §10.3 미커버 5%) — 신규 사용자가 OAuth 로그인 후 첫 그룹 가입까지 완주하는 흐름을 본인 시크릿 창에서 1회 확인.

---

## 6. v2.0 — 첫 큰 가치 확장 (결정 필요)

### 6.1 RICE 평가 표

평가 척도:
- **Reach** (1~5): 영향받는 사용자 비율. 5 = 거의 모든 사용자, 1 = 매우 일부.
- **Impact** (1~5): 영향받았을 때 가치 크기. 5 = 핵심 가치 변화, 1 = 미세 개선.
- **Confidence** (0.5/0.8/1.0): MVP 검증 단계라 v1.2 사용자 피드백 전에는 대부분 0.5~0.8.
- **Effort** (1~5): 구현·검증 노력. 5 = 2주 이상, 1 = 1일 이내.
- **RICE = (Reach × Impact × Confidence) / Effort**.

| 후보 | Reach | Impact | Confidence | Effort | RICE | 메모 |
| ---- | :---: | :----: | :--------: | :----: | :--: | ---- |
| **다가오는 회차 카드 빠른 RSVP 토글** (PRD §10.8) | 5 | 3 | 0.8 | 1 | **12.0** | 그룹 페이지에서 회차 상세 진입 없이 1탭. PRD가 명시한 "회차당 10초" 가치에 직결. 구현 작음(client island 1개 + 기존 action 재사용). 단톡방 → 그룹 페이지 → RSVP 1탭 흐름이 가장 짧아짐 |
| **Nav에 `/me` 진입 메뉴** (PRD §10.9) | 5 | 2 | 0.8 | 1 | **8.0** | 발견성 개선. 사용자가 본인 출석률을 보러 오는 빈도가 늘어남. 위 RSVP 토글과 묶어 처리 가능 |
| **초대 토큰 회전/회수 UI** | 3 | 4 | 0.8 | 2 | **4.8** | 토큰 노출 시 새 그룹 생성 우회로가 있어 Reach 낮음. 하지만 노출되면 그룹 단위 데이터가 영향받아 Impact 큼. owner-only feature |
| **공동 운영자** | 2 | 4 | 0.5 | 4 | **1.0** | 그룹 5~30명 규모에서 단일 owner도 충분한 경우가 많아 Reach 낮음. 역할 테이블 + 정책 4종 + UI 모두 변경되어 Effort 큼. v1.2 피드백에서 강한 신호 없으면 보류 |
| **출석률 차트 (월별 추이)** | 4 | 3 | 0.8 | 2 | **4.8** | 누적 출석률 표의 자연스러운 확장. recharts 등 차트 라이브러리 1개 + view 1개 (`group_attendance_monthly`). 사용자의 "추세 보기" 욕구가 명확해야 가치 큼 — v1.2에서 검증 |
| **사후 출석부 수동 정정** | 3 | 4 | 0.8 | 2 | **4.8** | 응답 잠금 후에도 owner가 결석을 출석으로 정정. PRD §5.4의 "응답 = 출석 확정" 원칙 변경이라 신중. RLS WITH CHECK 풀고 owner-only UPDATE 분기 신설 |
| **반복 일정 (RRULE)** | 4 | 4 | 0.5 | 5 | **3.2** | "매주 화/목 19시" 자동 occurrence 생성. 운동·스터디 모임에 강한 가치. 다만 RRULE 파싱 + 시리즈 편집 (전체/이번부터/이번만) UX가 복잡. Effort 큼 |
| **푸시 알림 (PWA)** | 4 | 4 | 0.5 | 5 | **3.2** | PRD 포지셔닝 ("알림은 단톡방이 담당")과 충돌. PWA + iOS 16.4+ 제약 + service worker. 만들기 전에 "단톡방 알림으로 충분한지" v1.2에서 직접 확인 필요 |
| **iCal/Google Calendar 연동** | 3 | 3 | 0.8 | 3 | **2.4** | 회차 → .ics 다운로드 또는 Google Calendar API. ics 다운로드는 Effort 작음(2 → 2점), API 연동은 OAuth scope 추가 + 토큰 저장 등 Effort 큼 |
| **정원/대기열** | 2 | 4 | 0.5 | 4 | **1.0** | 운동 모임 일부 (수영장 레인 제한 등)에 강한 가치, 일반 모임엔 불필요. Reach 낮음 |
| **공개 그룹 검색·신청·승인** | 2 | 3 | 0.5 | 5 | **0.6** | 본 서비스 정체성(사적 그룹) 변화. PRD §2.2 영구 비범위 후보였음. 강한 신호 없으면 영구 보류 |
| **회비/정산** | 2 | 4 | 0.5 | 5 | **0.8** | 결제 PG 통합 + 정산 UI + 환불 정책. Effort 매우 큼. v2.0보다 v3.0 후보 |
| **카카오 알림톡** | 3 | 4 | 0.5 | 5 | **1.2** | 사업자 등록 필수 + 알림톡 템플릿 승인. 단톡방 옆에 알림톡까지 보내는 게 사용자 가치인지 v1.2에서 검증 필요 |
| **카풀 매칭** | 1 | 3 | 0.5 | 4 | **0.4** | 운동 모임 일부에만 가치. 본 서비스 범위 확장 비용 대비 가치 낮음 |
| **다국어/다중 타임존** | 1 | 3 | 0.5 | 5 | **0.3** | 국내 정기 모임 타깃이라 Reach 매우 낮음. v3.0+ 후보 |
| **모바일 앱 (네이티브)** | 3 | 4 | 0.5 | 5 | **1.2** | PWA로 80% 가치 달성 가능. 네이티브 앱은 푸시 알림이 진짜 필요한 경우에만 |

### 6.2 추천안 (상위 3개)

1. **다가오는 회차 카드 빠른 RSVP 토글 + Nav `/me` 진입 메뉴** (RICE 12.0 + 8.0) — 두 항목 묶음. PRD §10.8·10.9의 단순화 결정 부채를 한 PR로 청산. Effort 작고 Confidence 높음. 사용자 흐름 단축이 명확. **MVP 검증 직후 가장 안전한 첫 확장.**
2. **초대 토큰 회전/회수 UI** (RICE 4.8) — owner의 보안 자기관리 도구. 토큰 노출이 가설 위험이지만, MVP에서 초대 링크를 카톡에 붙여넣는 흐름 자체가 노출 빈도를 높일 수 있어 안전망으로 가치 있음.
3. **출석률 차트 (월별 추이)** (RICE 4.8) — 누적 출석률 표의 자연스러운 확장. v1.2에서 "주최자가 추세를 보고 싶다"는 신호가 명확하면 우선순위 상승.

### 6.3 사용자 결정 필요

다음 중 하나(또는 둘)를 v2.0 핵심으로 확정해야 한다:

- **A. 추천**: "다가오는 회차 카드 빠른 RSVP 토글 + Nav `/me` 진입 메뉴" — 가장 안전, Effort 작음, MVP 가치 직결. v1.2 피드백 수집 직후 1주 안에 출시 가능.
  - **추천 근거**: RICE 최상위 + Confidence 높음(spec 단계에서 SKIP된 항목이라 가치/구현이 모두 명확) + 되돌리기 쉬움(client island 1개 + nav dropdown 1개 추가).
- **B**: "초대 토큰 회전/회수 UI" — 보안 자기관리. 토큰 노출 사고가 v1.2에서 1건이라도 보고되면 최우선으로 격상.
- **C**: "출석률 차트 (월별 추이)" — 도메인이 운동 모임 위주로 자리잡으면 우선순위 상승 (정원·회비 결정에 추세가 필요). 스터디 모임 위주면 우선순위 하락.
- **D**: v1.2 피드백에서 위 3개 어디에도 없는 강한 신호가 나오면 새 후보 추가.

> **조건부 추천**: 도메인이 운동 모임 위주면 (A → C → B) 순. 스터디 모임 위주면 (A → B → C) 순. 일반 모임 혼합이면 A 단독으로 진행 후 v2.1에서 B·C 결정.

---

## 7. v2.x+ — 후속 백로그

§6에서 v2.0에 선택되지 않은 나머지를 우선순위 그룹으로 묶는다. v2.0 출시 후 v1.2 지표 + 사용자 피드백을 재평가해 v2.1·v2.2를 선정한다.

### High (RICE 4 이상, v2.1~v2.2 후보)

- 초대 토큰 회전/회수 UI (v2.0 미선택 시)
- 출석률 차트 (월별 추이) (v2.0 미선택 시)
- 사후 출석부 수동 정정

### Medium (RICE 1~4, v2.x 검토)

- 반복 일정 (RRULE) — 가치 크나 Effort·UX 복잡도 부담
- 푸시 알림 (PWA) — 사용자 검증 필수 (단톡방 알림으로 충분한지)
- iCal/Google Calendar 연동 — ics 다운로드만이면 Medium-High
- 카카오 알림톡 — 사업자 등록 필요
- 모바일 앱 (네이티브) — PWA로 80% 가치 달성 가능

### Low (RICE 1 미만, 신호 강할 때만)

- 공동 운영자
- 정원/대기열
- 회비/정산
- 공개 그룹 검색·신청·승인
- 카풀 매칭
- 다국어/다중 타임존

### 영구 비범위 후보 (PRD §2.2 그대로)

- 단톡방 대체 기능 (채팅·게시판·DM)
- 익명/게스트 응답

---

## 8. 가정·리스크·의존성

### 8.1 가정

1. **MVP 핵심 가치가 검증된다** — 단톡방 보완 도구로서 RSVP 카운팅 + 누적 출석률이 실제 가치를 만든다. v1.2에서 검증.
2. **그룹당 5~30명이 실제 모임 규모** — PRD 타깃. 100명 이상 대규모는 출석률 표·응답 명단 UI가 깨질 수 있어 v2+에서 재검토.
3. **Google OAuth 의무가 가입 장벽이 되지 않는다** — 타깃 사용자가 Google 계정을 보유한다는 가정. v1.2에서 가입 거절 사례를 직접 확인.
4. **카카오톡 단톡방이 1차 전파 채널** — 초대 링크 공유가 단톡방 붙여넣기 흐름에 자연스럽게 녹는다. v1.2에서 실제 단톡방에서 어떻게 보이는지(미리보기, 클릭률) 확인.
5. **사용자 OS 시계가 KST에 가깝다** — 입력 UX는 한국 사용자 가정. 해외 거주 한국인 등 edge case는 v2+ 다중 타임존에서 해결.

### 8.2 리스크

| 리스크 | 영향 | 완화책 |
| ---- | ---- | ---- |
| **Next.js `latest` 자동 메이저 업그레이드** | production 빌드가 알림 없이 깨질 수 있음 | v1.1에서 `^16.2.6`으로 핀 (§4 추천안) |
| **Supabase 무료 한도 (Free tier: 50K MAU, 500MB DB, 1GB Storage)** | v1.2 사용자 유입 시 한도 근접 가능 | v1.1 Vercel Analytics + Supabase usage 페이지 정기 점검. 한도 70% 도달 시 Pro tier 검토 |
| **Supabase 콜드 스타트** | 무료 tier는 7일 비활성 시 프로젝트 일시 중지. 첫 사용자가 5초+ 지연 경험 | v1.2 초기 사용자 모집 시점에 최소 1일 1회 health-check 워크플로 (Vercel cron 또는 GitHub Action) |
| **OAuth 자동화 불가 → 검증 비용 증가** | 매 배포마다 OAuth 풀체인 수동 검증 필요 (PRD §10.3) | v1.2 OAuth 검증 1회 후, v2.0부터는 변경된 분기에 영향이 있을 때만 수동 검증 (smoke test 체크리스트 문서화) |
| **단톡방 vs 본 서비스 가치 충돌** | 사용자가 "그냥 단톡방으로 충분"하다고 느끼면 retention 0 | v1.2 인터뷰 1번 질문이 이 가설을 직접 검증 ("단톡방 대신 본 서비스를 열게 되는 순간이 있었나요?") |
| **MVP 단순화 결정의 부메랑** | PRD §10.8·10.9 단순화가 가입 직후 사용자에게 발견성 0이라는 신호 | v2.0 추천안 A로 청산 |
| **PRD 사실관계 오류 4건** | 신규 합류 개발자 혼란, 라이브러리 업그레이드 의사결정 흐림 | v1.1에서 정정 (§4) |

### 8.3 의존성

| 의존성 | 역할 | 단일 실패점 여부 |
| ---- | ---- | ---- |
| **Vercel** | 호스팅·CI/CD·Analytics | Yes — 다른 PaaS(Netlify, Cloudflare Pages, Fly.io) 이전 가능하지만 마이그레이션 비용 큼 |
| **Supabase** | DB·Auth·RPC·View | Yes — Postgres 자체는 portable하지만 RLS·Auth·`@supabase/ssr` 통합 코드 광범위. 셀프호스트 Supabase로 이전은 가능하나 운영 부담 큼 |
| **Google Cloud (OAuth)** | 사용자 인증 유일 채널 | Yes — Supabase Auth가 카카오·네이버 OAuth도 지원하므로 v2+에서 다중 provider 추가 가능 |
| **GitHub** | 코드 저장소 + Vercel 연동 | No — 다른 git 호스팅으로 이전 가능 |

---

## 9. 의사결정 로그 (향후 갱신)

본 표는 v2.0 후보 확정·v2.x 방향 변경·우선순위 변경 등 의사결정을 1줄로 누적한다. 의사결정의 **이유**(Why)를 함께 적어 미래 자기/타인이 맥락을 복원할 수 있게 한다.

| 일자 | 결정 | 근거 | 후속 작업 |
| ---- | ---- | ---- | ---- |
| 2026-05-24 | ROADMAP 초안 작성, v2.0 핵심 후보는 사용자 결정으로 위임 | MVP 검증 전이라 단일 추천이 명확하지 않음. RICE 표로 후보를 좁히되 도메인 확정 후 사용자가 선택 | v1.2 피드백 수집 → 본 표 갱신 |
| | | | |

---

## 10. 참고 링크

- **PRD 본문**: `C:\Users\inmin\workspace\courses\nextjs-supabase-app\docs\PRD.md`
- **원본 spec**: `C:\Users\inmin\workspace\courses\nextjs-supabase-app\docs\superpowers\specs\2026-05-23-meetup-mvp-design.md`
- **Phase 1 plan + 회귀**: `C:\Users\inmin\workspace\courses\nextjs-supabase-app\docs\superpowers\plans\2026-05-23-meetup-mvp-phase1.md`
- **Phase 2 plan + 회귀**: `C:\Users\inmin\workspace\courses\nextjs-supabase-app\docs\superpowers\plans\2026-05-24-meetup-mvp-phase2.md`
- **Phase 3 plan + 회귀**: `C:\Users\inmin\workspace\courses\nextjs-supabase-app\docs\superpowers\plans\2026-05-24-meetup-mvp-phase3.md`
- **Vercel 배포 spec**: `C:\Users\inmin\workspace\courses\nextjs-supabase-app\docs\superpowers\specs\2026-05-17-vercel-deploy-design.md`
- **Vercel 배포 plan**: `C:\Users\inmin\workspace\courses\nextjs-supabase-app\docs\superpowers\plans\2026-05-17-vercel-deploy.md`
- **핵심 디렉터리**: `app/`, `components/`, `lib/`, `supabase/migrations/`
