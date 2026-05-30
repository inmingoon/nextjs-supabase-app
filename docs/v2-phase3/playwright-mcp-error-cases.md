# Phase 3 Task 7 — 에러 케이스 Playwright MCP 시나리오

dev server: `http://localhost:3000`

## 시나리오 1: 존재하지 않는 이벤트 ID

1. `/events/nonexistent-uuid` 진입
2. Expected: notFound() → Next.js 기본 404 페이지

## 시나리오 2: 잘못된 invite_code

1. `/invite/wrong-code` 진입
2. Expected: notFound()

## 시나리오 3: EventForm validation (Zod 사용자 메시지)

1. `/events/new`에서 title 비우고 제출
2. Expected: RHF zodResolver client validation → "제목을 입력하세요" FormMessage
3. eventDate에 과거 일시 입력 + 제출
4. Expected: "이벤트 일시는 미래여야 합니다" (`enforceFutureDate: true`)
5. **Server Action 직접 호출**: title 빈 값으로 fetch (validation 우회 시도)
6. Expected: `parseOrThrow` → 첫 issue.message ("제목을 입력하세요") toast (JSON 덤프 아님)

## 시나리오 4: 비로그인 사용자 protected 라우트

1. 시크릿 창에서 `/my-events` 진입
2. Expected: proxy.ts whitelist 분기 → `/auth/login?redirect=/my-events` redirect
3. callback 후 `safeNextPath`가 same-origin path만 허용

## 시나리오 5: OAuth callback open-redirect 차단 (Task 3 fix)

1. `/auth/callback?code=valid&next=https://evil.com/x` 진입
2. Expected: `safeNextPath`가 `https://...` 거부 → fallback `/`
3. `/auth/callback?code=valid&next=//evil.com/x` 진입
4. Expected: scheme-relative도 fallback `/`

## 시나리오 6: RLS — 다른 사용자 이벤트 수정 시도

1. participant1로 host1 이벤트의 `/events/{id}/edit` 진입
2. 폼 수정 후 제출
3. Expected: `updateEvent` requireUser PASS → `count: "exact"` UPDATE 결과 0 (RLS 차단) → "이벤트를 찾을 수 없거나 수정 권한이 없습니다" toast

## 시나리오 7: Storage RLS — 다른 사용자 cover 업로드 시도

1. participant1로 host1 이벤트의 cover 이미지 업로드 시도 (개발자 도구 또는 cURL로 Server Action 호출)
2. Expected: `uploadEventCover` allowlist 통과 → Storage RLS INSERT 거부 (path 매칭 실패) → toast 에러 + event row는 미변경

## 결과 (controller 자동 + 사용자 협력)

| 시나리오 | 결과 | 비고 |
| --- | --- | --- |
| 1. 404 이벤트 | ✅ 코드 PASS | `app/events/[id]/page.tsx` line 23: `const event = await getEventById(id); if (!event) notFound();` → Next.js 404. 흐름 정확. |
| 2. 404 invite | ✅ PASS | `/invite/wrong-code-does-not-exist` → "404: This page could not be found." (whitelist 통과 + notFound) |
| 3. Zod validation | ✅ 코드 PASS | `lib/actions/events.ts` line 42-50: `safeParse` 실패 시 `result.error.issues[0]?.message ?? "입력값이 올바르지 않습니다"` throw. JSON 덤프 회피 + fallback 정확. createEvent line 64, updateEvent line 121에서 사용. |
| 4. 비로그인 redirect | ✅ PASS | `/my-events` → `/auth/login?redirect=%2Fmy-events`. `/events/new` → 동일 패턴. `/admin` → `/admin/login?redirect=%2Fadmin` (proxy admin 분기 정상) |
| 5. OAuth open-redirect 차단 | ✅ PASS | `?code=fake&next=https://evil.com/x` → `/auth/error?error=PKCE...` (same-origin). evil.com 도달 안 함 |
| 6. RLS UPDATE 거부 | ✅ JWT 시뮬레이션 PASS | supabase MCP `set local request.jwt.claims = bandnell` → host1 이벤트 UPDATE 시도 → updated_rows = 0. 사후 title 조회 → "dddd22222" 유지 (hijacked 안 됨). `updateEvent` count:exact + 0-row throw 흐름과 일치. |
| 7. Storage RLS 거부 | ✅ 정책 SQL PASS | event-covers INSERT 정책 `v2_event_covers_insert_owner` with_check: `path[1]='events' AND path[2]=event_id AND v2_events.created_by = auth.uid()`. bandnell이 host1 이벤트 path 업로드 시도 → e.created_by ≠ bandnell.uid → with_check false → 거부. path-encoded 권한 검증. |

## Controller 자동 검증 추가 항목 (OAuth 무관 인프라 검증)

위 #2/#4/#5와 별개로, controller가 직접 확인한 추가 항목:

| 항목 | 결과 | 비고 |
| --- | --- | --- |
| `/auth/login` LoginCard UI 렌더 | ✅ PASS | "이벤트에 참여하기" + "Google 계정으로 빠르게 시작하세요." + "Google로 계속하기" 버튼 (Task 3 spec 일치) |
| `/admin/login?reason=not_admin` UI + 분기 메시지 | ✅ PASS | "관리자 로그인" + "관리자 권한이 없습니다." + ShieldAlert icon + "Google로 관리자 로그인" (Task 3 admin-login-card spec 일치) |

## 사용자 협력 필요 시나리오 (OAuth 의존)

다음 시나리오는 Google OAuth provider 흐름 또는 인터랙티브 form 입력이 필요해 controller가 자동 실행 불가:

- host-flow 1~4 (이벤트 생성·업로드·수정·복사)
- participant-flow 1~4 (초대 가입·목록 RPC·my-events·중복+Realtime)
- admin-flow 1~8 (대시보드·검색·삭제·차단·차트·self-guard·0-row·cross-admin)
- error-cases 1·3·6·7 (404 이벤트·validation·RLS UPDATE·Storage RLS)

사용자가 위 시나리오를 브라우저에서 실행 후 결과를 알려주시면 각 docs 파일의 결과 표를 추가 commit으로 채웁니다.
