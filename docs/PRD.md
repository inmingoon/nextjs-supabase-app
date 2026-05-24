# 모임 관리 MVP — PRD

> 작성일: 2026-05-24
> 상태: MVP In 범위 구현 완료 (Phase 1·2·3 회귀 PASS), Vercel 배포 준비 단계
> 도메인: 정기 운동 모임(수영·헬스 등) 1순위, 일반 정기 모임 확장 가능
> 코드 베이스: `feat/profiles-table` → 본 도메인용 `feat/meetup-events-phase*` 시리즈
> 원본 설계 spec: `docs/superpowers/specs/2026-05-23-meetup-mvp-design.md`
> Phase 구현 plan:
> - `docs/superpowers/plans/2026-05-23-meetup-mvp-phase1.md` (스키마·그룹·초대)
> - `docs/superpowers/plans/2026-05-24-meetup-mvp-phase2.md` (회차·RSVP)
> - `docs/superpowers/plans/2026-05-24-meetup-mvp-phase3.md` (출석률·마이페이지)

---

## 1. 개요 (Overview)

### 한 줄 가치 명제

**카톡(단톡방)이 못 푸는 누적 데이터(누가 답했나·누가 얼마나 출석했나)를 한 화면으로 보여주는 보완 도구.**

### 포지셔닝

본 서비스는 카카오톡 단톡방을 **대체하지 않는다**. 공지·잡담·실시간 커뮤니케이션은 단톡방에 그대로 맡긴다. 단톡방이 잘 못하는 한 가지 — **회차별 RSVP 집계와 멤버별 누적 출석률** — 만 잘 해서 단톡방 옆에 붙여 쓰는 보완 도구다. 사용자가 본 서비스에서 보내는 시간은 **회차당 10초 안팎**으로 짧게 유지하는 것이 목표다.

### 대상 사용자

- **주최자**: 소규모 정기 모임(스터디·운동 동호회·독서 모임 등)을 직접 운영하는 사람. 출결 관리·정원 산정·회비 결정에 누적 데이터가 필요한 사람.
- **멤버**: 위 모임에 속한 참여자. Google 계정을 보유하고 카카오톡 등으로 초대 링크를 받아 들어온다.

타깃 규모는 **그룹당 5~30명**의 정기 모임이다. 공개 모집·대규모 컨퍼런스·일회성 이벤트는 대상이 아니다.

### 현재 상태 (2026-05-24)

- spec §1.4 In 범위가 모두 구현되어 동작한다.
- Phase 1·2·3 회귀 검증 PASS (자동 시나리오 + RLS 침투 + 빌드/린트).
- main 브랜치에 머지·푸시 완료, Vercel import는 사용자가 직접 진행 중.

---

## 2. 목표와 비목표 (Goals & Non-Goals)

### 2.1 In 범위 (현재 동작)

| 항목 | 비고 |
| ---- | ---- |
| Google OAuth 로그인 (게스트·이메일·매직링크 없음) | 기존 `feat/profiles-table` 인프라 재사용 |
| 그룹 생성 + 초대 토큰 (32B URL-safe base64) | 1 그룹 = 1 주최자(owner) |
| 초대 가입 (4분기 분기로 1-클릭) | `join_group_by_token` RPC로 멱등 가입 |
| 회차(occurrence) 수동 생성 — 일시·장소·메모 필수 | 반복 일정·시리즈 자동 생성 없음 |
| RSVP 3-상태 토글 (`going` / `not_going` / `pending`) | 응답 = 출석 간주 |
| 회차 시작 시간 이후 응답 자동 잠금 | DB RLS WITH CHECK로 강제 |
| 회차 상세에 응답 명단 공개 (이름 노출) | 같은 그룹 멤버에게만 보임 |
| 멤버별 누적 출석률 표 | `group_attendance_stats` view 활용 |
| 그룹 상세 = 다가오는 회차 + 멤버 출석률 + 지난 회차(접힘) | 4 블록 구성 |
| 마이페이지 `/me` = 다음 모임 + 그룹별 본인 출석률 | 5건 이하 다음 모임 표시 |
| KST 고정 (입력·표시 모두 `Asia/Seoul`) | `lib/datetime.ts` 유틸 |
| 다크모드 | `next-themes` 재사용 |

### 2.2 Out 범위 (v2+ 또는 영구 비범위)

- **단톡방 대체 기능**: 채팅·게시판·공지·DM·푸시 알림. 단톡방 옆에 붙어 쓰는 것이 본 서비스의 정체성이다.
- **공개 그룹 검색·신청·승인**: 본 MVP는 초대 링크 기반 사적 그룹만 다룬다.
- **결제·정산·회비 관리**.
- **카카오 알림톡·SMS·이메일 발송**: 알림 인프라 0개. 알림은 단톡방이 담당한다.
- **반복 일정(RRULE)·iCal/Google Calendar 연동**.
- **정원·대기열·인원 제한**.
- **공동 운영자·역할 분리**: 단일 주최자(생성자=owner) 모델만 지원.
- **카풀 매칭·동승 인원 관리**.
- **초대 토큰 회전/회수 UI**: 노출 시 새 그룹을 만드는 우회로 충분 (MVP 검증 전 회전 UI는 과잉).
- **다국어 / 다중 타임존**: KST 한국어 고정.
- **익명·게스트 응답**: Google OAuth 의무.
- **사후 출석부 수동 정정**: 응답 잠금 = 출석 확정.
- **푸시 알림(PWA·iOS·Android)**.

상세 v2+ 백로그는 §8 참조.

---

## 3. 핵심 사용자 시나리오 (Key Scenarios)

### 3.1 주최자 흐름

1. **그룹 생성**: 로그인 후 홈(`/`)의 "+ 새 그룹 만들기" → `/groups/new`에서 그룹명·설명 입력 → 생성. 생성자는 자동으로 멤버에 합류한다.
2. **초대 링크 공유**: `/groups/<id>`의 "초대 링크 복사" 버튼(owner만 노출) → `https://.../invite/<token>` 클립보드 저장 → **단톡방에 붙여넣기**.
3. **회차 생성**: 그룹 상세의 "+ 새 모임 만들기" → `/groups/<id>/events/new`에서 일시(KST datetime-local)·장소·메모 입력 → 생성. 회차 URL을 다시 단톡방에 공유.
4. **응답 확인**: `/groups/<id>/events/<eventId>`에서 "갈게요 N명 / 못 가요 M명 / 미응답 K명"을 1화면에서 확인. 멤버별 누적 출석률은 그룹 상세 페이지 하단에서 확인.

### 3.2 멤버 흐름

1. **가입**: 단톡방의 초대 URL 클릭 → `/invite/<token>` → 비로그인이면 그룹명 미리보기 + "Google로 로그인" → 로그인 복귀 후 "<그룹명> 그룹 가입하기" 버튼 → `/groups/<id>` 진입.
2. **RSVP**: 단톡방의 회차 URL 클릭 → `/groups/<id>/events/<eventId>` → "갈게요" / "못 가요" / "미정" 1탭. 토스트로 저장 확인.
3. **본인 확인**: `/me`에서 다음 모임 1~5건 + 가입한 모든 그룹의 본인 누적 출석률 확인.

### 3.3 응답 잠금

- 회차 `starts_at`이 지나면 UI에 "🔒 응답 마감" 배지 + 현재 응답 표시.
- DB가 RLS WITH CHECK로 INSERT·UPDATE를 거부하므로 앱 코드를 우회한 직접 호출(예: SQL 콘솔·악성 클라이언트)도 차단된다.

---

## 4. 기능 명세 (Features)

### 4.1 그룹

- **사용자 가치**: 정기 모임을 영속적으로 식별·관리하는 단위. 단톡방 1개 = 본 서비스 그룹 1개 매핑이 자연스럽다.
- **동작**: 로그인 사용자가 그룹명(1~50자)·설명(0~500자)을 입력해 생성. 생성자는 자동으로 owner이자 첫 멤버가 된다. 초대 토큰은 `crypto.randomBytes(32).toString("base64url")`로 1회 발급, 영구 유효.
- **핵심 제약**:
  - 단일 주최자(owner) 모델. 공동 운영자·소유권 이전은 v2+.
  - 토큰 회전/회수 UI 없음. 노출 시 새 그룹 생성으로 우회.
  - 그룹 삭제는 owner만(RLS), cascade로 멤버십·회차·응답 모두 삭제.
- **관련 파일**: `app/groups/new/page.tsx`, `app/groups/new/create-group-form.tsx`, `app/groups/new/actions.ts`, `lib/tokens.ts`.

### 4.2 초대 가입 (4분기 분기)

- **사용자 가치**: 카톡 단톡방에 붙여넣을 수 있는 1-클릭 가입 링크. 가입 흐름이 막히지 않도록 모든 상태에 명시적 UI를 둔다.
- **동작**: `/invite/<token>`이 다음 4 분기로 동작.

| 분기 | 조건 | 동작 |
| ---- | ---- | ---- |
| (a) | 토큰 무효 | "유효하지 않은 초대 링크" 화면 + 홈 버튼만. **그룹 정보 노출 0** |
| (b) | 토큰 유효 + 비로그인 | 그룹명·설명 미리보기 + `next=/invite/<token>` query로 Google 로그인 버튼 |
| (c) | 토큰 유효 + 로그인 + 이미 가입 | 즉시 `/groups/<id>` redirect (가입 다이얼로그 X) |
| (d) | 토큰 유효 + 로그인 + 미가입 | "<그룹명> 그룹 가입하기" 버튼 → `join_group_by_token` RPC → `/groups/<id>` redirect |

- **핵심 제약**:
  - 비멤버는 RLS상 `groups` 테이블을 SELECT 불가 → 초대 페이지가 그룹명을 보여주려면 별도 `get_group_by_invite_token` RPC(`security definer`, `invite_token` 컬럼은 반환하지 않음)를 사용한다.
  - `proxy.ts` 인증 가드의 화이트리스트에 `/invite/`가 포함돼야 (b)·(a)가 작동한다 — Phase 1 자동 검증 중 누락 발견 후 추가됨.
- **관련 파일**: `app/invite/[token]/page.tsx`, `app/invite/[token]/join-group-button.tsx`, `app/invite/[token]/actions.ts`, `lib/supabase/proxy.ts`.

### 4.3 회차 (Event)

- **사용자 가치**: "이번 주 화요일 19시 강남 수영장" 같은 1회성 모임 단위. 각 회차는 RSVP·출석 카운트의 기본 단위다.
- **동작**: owner만 `/groups/<id>/events/new`에서 일시(KST datetime-local)·장소(1~200자)·메모(1~1000자)·제목(선택, 0~100자)을 입력해 생성. 시작 시간은 KST로 해석 후 UTC ISO로 저장 (`lib/datetime.ts#kstDateTimeLocalToIso`). 그룹 상세에 다가오는 회차 5개 + 지난 회차 10개(접힘)가 정렬되어 표시된다.
- **핵심 제약**:
  - `location`·`memo` 모두 NOT NULL + length check. 운동 모임은 장소·안내가 사실상 필수라 nullable 분기 제거.
  - `title`은 nullable. 없으면 그룹명으로 fallback.
  - 과거 시점 생성은 Server Action에서 차단(UX) — 다만 RLS는 INSERT 자체를 허용해 시드/관리자 우회 가능.
  - 회차 생성·수정·삭제는 owner만 (RLS `events_*_owner`).
- **관련 파일**: `app/groups/[groupId]/events/new/`, `app/groups/[groupId]/events/[eventId]/page.tsx`, `app/groups/[groupId]/page.tsx`.

### 4.4 RSVP (3-상태 토글)

- **사용자 가치**: "갈게요/못 가요/미정" 1탭 응답. 단톡방의 "ㅇ", "ㄴ" 답글 카운팅을 대체.
- **동작**: 멤버가 `/groups/<id>/events/<eventId>`의 3 버튼 중 하나를 클릭 → `respondToEventAction` Server Action → `event_participations` upsert(`onConflict: event_id,user_id`) → `revalidatePath`로 명단·count 즉시 반영 + sonner 토스트.
- **잠금**:
  - 회차 `starts_at` 이후 UI는 "🔒 응답 마감" 배지 + 현재 응답만 표시 (버튼 비활성).
  - DB 차원에서 RLS `ep_insert_self_before_lock` / `ep_update_self_before_lock`이 `EXISTS (select 1 from events where id = event_id and starts_at > now())`를 강제하므로 직접 호출도 거부 (`ERROR 42501`).
  - 클라이언트에서 잠금 우회 시도 시 Server Action이 `42501`/`23514`/`row-level security` 메시지를 감지해 "응답이 마감되었습니다" 토스트로 매핑.
- **핵심 제약**:
  - 응답 = 출석 간주. 사후 출석부 수동 정정 없음.
  - `pending` 또는 행 없음 = 결석으로 카운트(분모는 `total_past`로 유지).
  - DELETE는 잠금 무관(응답 취소 허용).
- **관련 파일**: `app/groups/[groupId]/events/[eventId]/rsvp-buttons.tsx`, `app/groups/[groupId]/events/[eventId]/actions.ts`.

### 4.5 응답 명단

- **사용자 가치**: 누가 답했고 누가 안 했는지 한 화면에서 보이는 가시성 → 사회적 동기부여 작동.
- **동작**: 회차 상세에서 `going` / `not_going` / `pending` 3 그룹으로 멤버 이름을 나열. 각 그룹 옆에 N명 카운트.
  - 응답이 없는 멤버는 `pending`(미응답)으로 자동 분류.
  - 이름 표시 우선순위: `profiles.full_name` → `profiles.username` → `"(이름 미설정)"`.
- **핵심 제약**:
  - 같은 그룹 멤버 전원에게 공개 (RLS `ep_select_group_member`).
  - 다른 그룹 멤버·비로그인은 0 row.
  - 본인이 다른 그룹 멤버의 `profiles`를 읽을 수 있도록 `profiles_select_group_members` 정책이 별도로 추가됨 (Phase 1 마이그레이션).
- **관련 파일**: `app/groups/[groupId]/events/[eventId]/page.tsx`.

### 4.6 멤버 출석률 표 (그룹 상세 하단)

- **사용자 가치**: 정원·회비 책정 근거가 되는 누적 출석 데이터. 카톡 단톡방으로는 불가능한 가시성.
- **동작**: `group_attendance_stats` view에서 `(attended, total_past)` 쌍을 그룹의 모든 멤버에 대해 fetch → 클라이언트에서 비율 계산 + 정렬 → 표 렌더링.
  - 1차 정렬: 출석률 내림차순 (`total_past = 0`이면 마지막).
  - 2차 정렬: 가입일 오름차순 (오래된 멤버 우선).
  - `total_past = 0`인 행은 출석률 "—" 표시 (NaN/Infinity 노출 X).
- **핵심 제약**:
  - View는 `security_invoker = true`라 호출자의 RLS를 상속.
  - View는 nested FK select가 작동하지 않으므로 `group_members` + `profiles` join은 **별도 query 후 클라이언트 Map join**으로 처리.
- **관련 파일**: `app/groups/[groupId]/page.tsx`.

### 4.7 마이페이지 `/me`

- **사용자 가치**: 본인의 다음 일정·누적 출석률을 한눈에. 여러 그룹에 가입한 사용자가 그룹별로 들어가지 않고도 본인 상태 파악.
- **동작**: 본인이 멤버인 모든 그룹에서 `starts_at >= now()`인 회차 5건 + 본인의 그룹별 누적 출석률.
  - 다음 모임은 그룹명과 함께 표시.
  - 출석률은 그룹명 클릭 시 해당 그룹 페이지로 이동.
- **핵심 제약**:
  - 비로그인 진입 시 `/auth/login?next=/me` redirect.
  - 별도 진입 메뉴 없음 (직접 URL만). Nav에 추가하는 작업은 v2+.
- **관련 파일**: `app/me/page.tsx`.

---

## 5. 비기능 요구사항 (Non-Functional)

### 5.1 인증

- **Google OAuth 의무**. 이메일/매직링크/게스트는 모두 비범위.
- Supabase Auth + Google Provider (Supabase Studio에 클라이언트 ID/Secret 등록, 앱 env에는 노출되지 않음).
- 인증 검증은 `supabase.auth.getClaims()` 사용 (비대칭 JWT 로컬 검증, Auth 서버 왕복 0).

### 5.2 권한 모델

- **단일 주최자(owner)** = 그룹 생성자. `groups.owner_id = auth.users.id`.
- 멤버 등급은 없음. owner ↔ 멤버 두 단계뿐.
- 공동 운영자·소유권 이전은 v2+ (RPC 또는 역할 테이블).

### 5.3 타임존

- **KST 고정** (`Asia/Seoul`). 다국어·다지역은 v2+.
- 저장: `timestamptz` (UTC).
- 입력: HTML `<input type="datetime-local">` → `lib/datetime.ts#kstDateTimeLocalToIso`가 `"+09:00"` suffix로 명시 후 ISO 직렬화.
- 표시: `Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", ... })` (`lib/datetime.ts#formatKst` / `#formatKstDate`).
- 사용자 OS 시계가 KST가 아닌 경우에도 입력·표시 모두 KST로 일관 처리.

### 5.4 보안 (RLS)

- 모든 도메인 테이블에 RLS enable. 정책은 `supabase/migrations/20260523000000_create_event_tables.sql` + 보정 마이그레이션 3건.
- 핵심 정책 요약:
  - `groups`: 멤버 또는 owner만 SELECT. owner_id = auth.uid() 강제 INSERT.
  - `group_members`: 같은 그룹 멤버끼리 SELECT. 직접 INSERT는 owner self-join만 허용, 그 외는 `join_group_by_token` RPC(security definer)만.
  - `events`: 그룹 멤버 SELECT, owner만 INSERT/UPDATE/DELETE.
  - `event_participations`: 같은 그룹 멤버 SELECT. INSERT/UPDATE는 본인 행 + `starts_at > now()` 강제. DELETE는 본인 행(잠금 무관).
  - `profiles`: 본인 OR 같은 그룹 멤버 (정책 2개 OR 결합).
- 응답 잠금은 **앱 코드가 아닌 DB RLS에서 강제** → 클라이언트 우회 불가.
- 비밀 키(`SUPABASE_SERVICE_ROLE_KEY`)는 시드 스크립트 외 앱 코드에서 import 금지. 빌드 산출물 grep으로 미포함 확인 필요(배포 전).

### 5.5 렌더링·캐싱 (Next.js 16 + Cache Components)

- `next.config.ts`에 `cacheComponents: true` (Cache Components 활성화).
- Server Component page는 다음 패턴 필수:

```tsx
async function PageContent(props) {
  const supabase = await createClient();
  // 인증·데이터 fetching·redirect
  return <>{/* 본문 */}</>;
}

export default async function Page(props) {
  const params = await props.params;
  return (
    <main>
      <Suspense fallback={null}>
        <PageContent {...params} />
      </Suspense>
    </main>
  );
}
```

- 빌드 시 본 MVP의 모든 페이지가 `◐ (Cache Components)` 표기로 등록.
- `cookies()`/`headers()`를 읽는 함수에 `'use cache'`를 적용하지 않는다 (Supabase 클라이언트는 쿠키를 읽으므로 본질적으로 동적).

### 5.6 라우팅·인증 가드

- `proxy.ts` (Next.js 16 proxy 위치, 본 프로젝트는 `lib/supabase/proxy.ts#updateSession`을 호출하는 루트 proxy 구성).
- 화이트리스트(비로그인 통과): `/`, `/login*`, `/auth*`, `/invite/*`.
- 그 외 모든 경로는 비로그인 시 `/auth/login`으로 redirect.
- `createServerClient`와 `getClaims()` 호출 사이에 코드 삽입 금지 — 무작위 로그아웃 버그 방지.
- `supabaseResponse` 객체 그대로 반환 — 새 response 생성 시 쿠키 복사 필수.
- **runtime 제약**: Next.js 16의 `proxy.ts`는 **Node.js runtime 전용**으로, Next.js 15의 `middleware.ts`가 Edge runtime을 기본으로 했던 것과 다르다. 외부 의존성이 Edge runtime을 가정한 코드(`crypto` 일부, `fetch`의 일부 옵션 등)였다면 Node.js로 재작성이 필요.

### 5.7 접근성·반응형

- 모바일 360px 가독성 유지 (가로 스크롤 없음). 표는 `overflow-x-auto` 래퍼.
- shadcn/ui 기본 접근성 (Radix primitives) 그대로 활용.
- 다크모드 (`next-themes`).

---

## 6. 기술 스택 (Tech Stack)

### 6.1 런타임·프레임워크

| 영역 | 선택 | 비고 |
| ---- | ---- | ---- |
| Frontend Framework | Next.js 16.2.6 (App Router, Cache Components, `cacheComponents: true`) | Turbopack 기본 |
| React | React 19 (Server Components 기본) | |
| 언어 | TypeScript (strict) | |
| 스타일 | Tailwind CSS 3 + shadcn/ui (Radix primitives) | `components/ui/` |
| 토스트 | sonner | `components/ui/sonner.tsx` |
| 테마 | next-themes | 기존 인프라 |
| Backend | Supabase (Postgres + RLS + RPC + View) | |
| Supabase SDK | `@supabase/ssr` + `@supabase/supabase-js` | 서버/클라이언트 클라이언트 분리 |
| 인증 | Supabase Auth + Google OAuth | |
| 배포 | Vercel | 진행 중 |

### 6.2 키 파일 표

| 경로 | 역할 |
| ---- | ---- |
| `next.config.ts` | `cacheComponents: true` 등 빌드 설정 |
| `proxy.ts` (루트) | 미들웨어 진입 — `updateSession` 호출 |
| `lib/supabase/proxy.ts` | 세션 갱신 + 인증 가드 + 화이트리스트 |
| `lib/supabase/server.ts` | Server Component·Action용 클라이언트 |
| `lib/supabase/client.ts` | Client Component용 클라이언트 |
| `lib/database.types.ts` | Supabase 생성 TypeScript 타입 (수동 갱신 X — `generate_typescript_types` MCP) |
| `lib/datetime.ts` | KST datetime 입력·표시 유틸 (`kstDateTimeLocalToIso`, `formatKst`, `formatKstDate`, `isPast`) |
| `lib/tokens.ts` | `generateInviteToken()` — 32B URL-safe base64 |
| `app/page.tsx` | 홈 — 비로그인 starter UI / 로그인 내 그룹 카드 |
| `app/groups/new/` | 그룹 생성 폼 + Server Action |
| `app/groups/[groupId]/page.tsx` | 그룹 상세 4 블록 (회차 + 멤버 출석률 + 지난 회차) |
| `app/groups/[groupId]/layout.tsx` | 그룹 권한 검증(멤버만 통과) |
| `app/groups/[groupId]/events/new/` | 회차 생성 폼 (owner 검증) |
| `app/groups/[groupId]/events/[eventId]/` | 회차 상세 + RSVP 버튼 + 응답 명단 |
| `app/invite/[token]/page.tsx` | 초대 관문 4분기 |
| `app/me/page.tsx` | 마이페이지 (다음 모임 + 그룹별 출석률) |
| `components/copy-invite-link-button.tsx` | 초대 링크 클립보드 복사 (Client) |
| `supabase/migrations/` | 7개 마이그레이션 (§7 참조) |

### 6.3 Client Component (island) 4종

`'use client'` 표기가 필요한 최소 단위만 분리:

- `CreateGroupForm` — `useActionState`로 폼 상태 관리
- `CreateEventForm` — 동일 패턴, hidden input으로 `groupId` 전달
- `JoinGroupButton` — 초대 관문의 가입 확인
- `RsvpButtons` — 3-상태 토글, `useEffect` 기반 토스트, 잠금 분기
- `CopyInviteLinkButton` — `navigator.clipboard` + sonner

나머지는 모두 Server Component.

---

## 7. 데이터 모델 (Data Model)

### 7.1 ER 다이어그램

```mermaid
erDiagram
  auth_users ||--o{ profiles : "id = id"
  auth_users ||--o{ groups : "owner_id"
  auth_users ||--o{ group_members : "user_id"
  auth_users ||--o{ events : "created_by"
  auth_users ||--o{ event_participations : "user_id"
  groups ||--o{ group_members : "group_id"
  groups ||--o{ events : "group_id"
  events ||--o{ event_participations : "event_id"

  groups {
    uuid id PK
    text name "1~50"
    text description "0~500, nullable"
    uuid owner_id FK
    text invite_token UK "32B base64url"
    timestamptz created_at
  }

  group_members {
    uuid id PK
    uuid group_id FK
    uuid user_id FK
    timestamptz joined_at
  }

  events {
    uuid id PK
    uuid group_id FK
    text title "0~100, nullable"
    timestamptz starts_at "UTC 저장, KST 표시"
    text location "1~200, NOT NULL"
    text memo "1~1000, NOT NULL"
    uuid created_by FK
    timestamptz created_at
  }

  event_participations {
    uuid id PK
    uuid event_id FK
    uuid user_id FK
    text status "going|not_going|pending"
    timestamptz responded_at
  }

  profiles {
    uuid id PK_FK
    text full_name
    text username
    text avatar_url
  }
```

UNIQUE 제약: `group_members(group_id, user_id)`, `event_participations(event_id, user_id)`, `groups(invite_token)`.

### 7.2 인덱스

| 테이블 | 인덱스 | 용도 |
| ------ | ------ | ---- |
| `groups` | `invite_token` (UNIQUE 자동) | 초대 링크 조회 |
| `group_members` | `(group_id, user_id)` (UNIQUE 자동) | 멤버십 검증·멤버 목록 |
| `events` | `(group_id, starts_at desc)` | 그룹 상세 회차 정렬 |
| `event_participations` | `(event_id, user_id)` (UNIQUE 자동) | 응답 upsert + 카운트 |

### 7.3 View — `group_attendance_stats`

`security_invoker = true`로 호출자의 RLS 상속. 그룹×멤버 행마다 `attended`(going 카운트) + `total_past`(과거 회차 수)를 반환.

```sql
create view public.group_attendance_stats with (security_invoker = true) as
select
  gm.group_id,
  gm.user_id,
  count(*) filter (where ep.status = 'going')   as attended,
  count(*) filter (where e.starts_at < now())   as total_past
from public.group_members gm
left join public.events e
  on e.group_id = gm.group_id
  and e.starts_at < now()
left join public.event_participations ep
  on ep.event_id = e.id
  and ep.user_id = gm.user_id
group by gm.group_id, gm.user_id;
```

비율 계산은 클라이언트에서 `Math.round((attended / total_past) * 100)` (`total_past === 0`이면 `"—"`).

### 7.4 RPC

| 함수 | 권한 | 동작 |
| ---- | ---- | ---- |
| `join_group_by_token(token text) → uuid` | `security definer`, `authenticated` only | 토큰으로 그룹 찾기 → 이미 가입이면 group_id 반환 → 미가입이면 `group_members` insert 후 반환. 무효 토큰은 `raise exception 'invalid_invite_token'`. |
| `get_group_by_invite_token(token text) → table(id, name, description)` | `security definer`, `anon + authenticated` | 초대 관문에서 비멤버에게도 그룹명·설명 노출. `invite_token` 컬럼은 반환하지 않아 토큰 유출 방지. |
| `is_group_member(group_id uuid, user_id uuid) → boolean` | `security definer`, owner=postgres(BYPASSRLS), plpgsql + `SET LOCAL row_security TO OFF` | `group_members` RLS 정책의 self-reference 무한 재귀를 회피하는 헬퍼. §10 학습 사항 참조. |

### 7.5 RLS 정책 요약

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
| ------ | ------ | ------ | ------ | ------ |
| `profiles` | 본인 OR 같은 그룹 멤버 | 본인 | 본인 | × |
| `groups` | 본인이 멤버 OR owner | 로그인 + `owner_id = auth.uid()` | owner만 | owner만 |
| `group_members` | `is_group_member(group_id, auth.uid())` (헬퍼) | owner self-join만 (그 외는 `join_group_by_token` RPC) | × | 본인 행만 (탈퇴) |
| `events` | 그룹 멤버 | owner | owner | owner |
| `event_participations` | 같은 그룹 멤버 | 본인 + `starts_at > now()` | 본인 + `starts_at > now()` | 본인 (잠금 무관) |
| `group_attendance_stats` | 호출자의 RLS 상속 | — | — | — |

### 7.6 마이그레이션 파일 (7개)

| # | 파일 | 역할 |
| - | ---- | ---- |
| 1 | `20260520162012_create_profiles_table.sql` | 기존 — profiles 테이블 + 정책 + `handle_new_user` 트리거 |
| 2 | `20260520162139_revoke_execute_on_profile_trigger_functions.sql` | 기존 — 트리거 함수 EXECUTE 권한 revoke |
| 3 | `20260521174513_fix_handle_new_user_oauth_linking.sql` | 기존 — Google OAuth `full_name` 자동 채움 보정 |
| 4 | `20260523000000_create_event_tables.sql` | **본 MVP** — 4 테이블 + 인덱스 + RLS 11개 정책 + view + `join_group_by_token` RPC + `profiles_select_group_members` 보강 |
| 5 | `20260523000001_allow_owner_self_join.sql` | **본 MVP** — owner가 본인 그룹에 자기 행 추가 INSERT 허용 정책 |
| 6 | `20260523000002_get_group_by_invite_token.sql` | **본 MVP** — 초대 관문용 그룹명 노출 RPC |
| 7 | `20260524000000_phase1_rls_recursion_fix.sql` | **본 MVP** — `is_group_member` 헬퍼 plpgsql 전환 + owner postgres + `SET LOCAL row_security TO OFF` + `groups_select_member_or_owner` OR 절을 헬퍼 호출로 교체 (§10 학습 사항 참조) |

---

## 8. 범위 외 (Out of Scope) / v2+ 백로그

MVP의 가치가 검증되면 다음 후보들이 자연스러운 확장 경로:

| 항목 | 비고 |
| ---- | ---- |
| 초대 토큰 회전·회수 UI | 토큰 노출 시 새 토큰 발급 + 구 토큰 무효화 |
| 공동 운영자 / 권한 등급 | 역할 테이블 또는 owner_id 이전 RPC |
| 푸시 알림 (PWA, iOS 16.4+) | 회차 시작 알림·미응답 리마인더 |
| 카카오 알림톡 | 사업자 등록 후 회차 생성 시 자동 발송 |
| 반복 일정 (RRULE) | "매주 화/목 19:00" 자동 occurrence 생성 |
| iCal / Google Calendar 연동 | 회차 자동 캘린더 추가 |
| 정원 / 대기열 | 인원 제한 + 자동 승격 |
| 출석률 차트 | 기간 필터 + 시각화 (월별 추이) |
| 공개 그룹 검색·신청·승인 | |
| 회비·정산·결제 | |
| 카풀 매칭 | 회차별 출발지·도착지·동승 인원 |
| 다국어 / 다중 타임존 | KST 외 지역 지원 |
| 사후 출석부 수동 정정 | owner가 회차 종료 후 결석을 출석으로 정정 |
| 모바일 앱 (네이티브) | |
| 다가오는 회차 카드 빠른 RSVP 토글 | spec M4 항목 중 YAGNI로 Phase 3에서 SKIP — 회차 상세에서 RSVP 가능하면 충분 |
| Nav에 `/me` 진입 메뉴 | Phase 3에서 단순화 결정 (직접 URL만) |

---

## 9. 운영·배포 (Operations)

### 9.1 환경 변수

| 키 | 용도 | 노출 |
| ---- | ---- | ---- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 공개 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 공개 가능한 publishable 키 (신규 키 체계) | 공개 |
| `SUPABASE_SERVICE_ROLE_KEY` | 시드/마이그레이션 전용 비밀 키 | **서버 전용** — 앱 코드 import 금지 |

Google OAuth 클라이언트 ID/Secret은 Supabase Auth 콘솔에 등록되어 앱 env에는 노출되지 않는다.

### 9.2 마이그레이션 적용

- 원격 적용: Supabase MCP `apply_migration` 또는 Studio SQL Editor.
- 적용 후 `mcp__supabase__generate_typescript_types`로 `lib/database.types.ts` 갱신.
- 적용 후 `mcp__supabase__get_advisors`(security/performance)로 누락 검증.

### 9.3 빌드·검증

| 명령 | 기대 |
| ---- | ---- |
| `npm run dev` | 로컬 개발 서버 (Turbopack) |
| `npm run lint` | 경고 0 |
| `npm run build` | 통과. 본 MVP 라우트가 모두 `◐ (Partial Prerender)` 표기 |

배포 전 빌드 산출물에서 `SUPABASE_SERVICE_ROLE_KEY` grep 미검출 확인.

### 9.4 현재 상태 (2026-05-24)

- Phase 1·2·3 회귀 PASS, 코드 cleanup 및 main 푸시 완료.
- Vercel import는 사용자가 직접 진행 중.
- production URL 확정 후 §9.3 grep + production smoke test 예정 (1회성 작업이라 plan 별도 task로 등록하지 않음).

---

## 10. 알려진 제약과 학습 사항 (Known Constraints & Learnings)

본 절은 구현 중 발견·우회한 함정과 그 이유를 기록한다. v2+ 또는 후속 작업자가 같은 함정을 다시 밟지 않도록 한다.

### 10.1 RLS 무한 재귀 — 헬퍼 함수의 3중 안전장치

`group_members_select_same_group` 정책이 `group_members`를 직접 subquery로 참조하면 PostgreSQL이 RLS 평가 중 동일 정책을 재귀 호출해 `ERROR 42P17`가 발생한다. 해결은 `SECURITY DEFINER` 헬퍼지만, 다음 **3가지를 모두** 만족해야 우회된다:

1. `language plpgsql` — `sql + stable`이면 PostgreSQL planner가 함수를 호출 쿼리에 inline하면서 함수 옵션 `SET row_security`가 무시된다.
2. body 안에 `SET LOCAL row_security TO OFF` — 함수 옵션 `SET row_security`가 inline 외 평가 경로에서도 누락될 수 있어 backup.
3. `owner postgres` — BYPASSRLS 권한 보유 role로 `security definer` 작동.

추가 함정: STABLE 함수 body에서는 `SET LOCAL` 사용 자체가 금지(`ERROR 0A000`)이므로 `stable` 키워드는 반드시 제거(volatile = default).

또한 `groups_select_member_or_owner` 정책의 OR 두 번째 절에서도 `group_members`를 직접 참조하면 `groups → group_members → groups` 사이클이 형성된다. 이 절도 `is_group_member` 헬퍼 호출로 교체해야 한다.

> 본 함정은 Phase 1 OAuth 수동 검증 중 발견. 보정 마이그레이션 `20260524000000_phase1_rls_recursion_fix.sql`에 위 4가지가 모두 반영됨.

### 10.2 Supabase view + nested FK select 한계

`group_attendance_stats` view에 `select("..., profiles(full_name)")` 같은 nested FK select를 시도하면 Supabase 타입 추론이 `SelectQueryError`로 떨어진다. **view는 별도 query로 통계만 가져오고, `group_members` + `profiles`는 별도 query로 가져온 뒤 클라이언트에서 `Map`으로 join** 한다 (Phase 3 멤버 출석률 표·마이페이지 모두 이 패턴).

또한 `group_members.profiles` join도 Supabase 생성 타입에서 `SelectQueryError`로 추론되는 알려진 이슈가 있어, 페이지 코드에서 `m.profiles as unknown as { full_name; username }` 형태로 명시적 cast 처리한다.

### 10.3 OAuth 자동화 한계

`@supabase/ssr` + Next.js 15 PPR + Google OAuth 조합에서 magic link admin API + Playwright로 hash→cookie 변환을 자동 trigger하는 시도는 신뢰성 있게 작동하지 않았다 (Phase 1·2·3 모두 확인). 대안:

- 코드 review로 분기 로직·redirect 경로·정책 보호를 검증.
- DB JWT 시뮬레이션 (`SET LOCAL request.jwt.claims = '{"sub": "<uuid>"}'`)로 RLS 침투·정책 거부를 검증.
- 위 둘로 약 95% 커버. 나머지 5% (실제 OAuth 풀체인 — V1 본/V2 본/V5 본/V7 본)는 사용자 위임.

### 10.4 PPR + Server Component page 패턴

`cacheComponents: true` 환경에서 Server Component page의 최상위에서 `await`(특히 `supabase.auth.getClaims()`)을 호출하면 빌드가 깨진다 (Task 6 빌드 실패로 발견). 모든 page는 §5.5의 async content + `<Suspense>` 패턴을 따른다. 본 MVP 모든 라우트가 `◐ (Partial Prerender)` 표기로 빌드된다.

### 10.5 proxy 화이트리스트 누락 함정

`lib/supabase/proxy.ts`의 인증 가드는 비로그인 사용자를 `/auth/login`으로 redirect한다. `/invite/<token>`이 비로그인 사용자에게 그룹명 미리보기 + Google 로그인 버튼을 보여주는 분기(4.2 (b)·(a))가 작동하려면 화이트리스트에 `/invite/`를 추가해야 한다. Phase 1 자동 검증 중 V4 실패로 발견 → `commit 152d323`에서 추가.

### 10.6 응답 잠금은 DB가 책임

응답 잠금 로직(`starts_at > now()`)을 앱 코드에 두면 클라이언트 우회 시 보안 표면이 생긴다. 본 MVP는 RLS WITH CHECK에 박아 DB 레이어에서 강제한다. 클라이언트 UI 잠금은 UX 힌트일 뿐, 보안은 DB 정책이 책임진다.

### 10.7 비밀 키 노출 방지

`SUPABASE_SERVICE_ROLE_KEY`는 시드 스크립트 외 앱 코드 import 금지. 빌드 산출물 grep으로 미포함 확인이 배포 체크리스트의 일부.

### 10.8 Phase 3 단순화 결정 — 다가오는 회차 카드 빠른 RSVP 토글 SKIP

spec M4의 "다가오는 회차 카드 본인 응답 빠른 토글"은 Phase 3 진입 시점에 YAGNI로 SKIP. 회차 상세 페이지에서 RSVP가 가능하면 핵심 가치는 충분히 달성되고, 그룹 페이지에 추가 client island를 두면 복잡도가 증가한다. v2+ 후보.

### 10.9 Phase 3 단순화 결정 — `/me` 진입 메뉴 없음

`/me` 진입은 직접 URL만 지원. nav/AuthButton dropdown 추가는 Phase 3에서 보류했다. 사용자 흐름 데이터 수집 후 v2+에서 결정.

---

## 11. 참고 링크

- Spec 원본: `docs/superpowers/specs/2026-05-23-meetup-mvp-design.md`
- Phase 1 plan + 회귀 결과: `docs/superpowers/plans/2026-05-23-meetup-mvp-phase1.md`
- Phase 2 plan + 회귀 결과: `docs/superpowers/plans/2026-05-24-meetup-mvp-phase2.md`
- Phase 3 plan + 회귀 결과: `docs/superpowers/plans/2026-05-24-meetup-mvp-phase3.md`
- 핵심 디렉터리: `app/`, `components/`, `lib/`, `supabase/migrations/`
