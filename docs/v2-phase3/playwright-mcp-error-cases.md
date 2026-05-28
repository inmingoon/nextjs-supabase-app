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

## 결과 (실행 후 기록)

| 시나리오 | 결과 | 비고 |
| --- | --- | --- |
| 1. 404 이벤트 | TBD | |
| 2. 404 invite | TBD | |
| 3. Zod validation | TBD | client + server 양쪽 메시지 정상 |
| 4. 비로그인 redirect | TBD | proxy whitelist + safe-next |
| 5. OAuth open-redirect 차단 | TBD | Task 3 fix safe-next.ts 검증 |
| 6. RLS UPDATE 거부 | TBD | count:exact 0-row throw |
| 7. Storage RLS 거부 | TBD | path 매칭 실패 |
