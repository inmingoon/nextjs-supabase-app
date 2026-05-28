# Phase 3 Task 7 — 주최자 플로우 Playwright MCP 시나리오

dev server: `http://localhost:3000` (port 3000, Cache Components enabled)
사전 조건: SQL Editor에 `20260526000000_v2_get_event_public_users.sql` + `20260526000001_v2_realtime_event_participants.sql` 적용 완료.

## 시나리오 1: 이벤트 생성

1. `mcp__playwright__browser_navigate http://localhost:3000/auth/login`
2. `mcp__playwright__browser_click "Google로 계속하기"` → host1 계정 선택
3. callback redirect 후 `/` 도착
4. `mcp__playwright__browser_navigate http://localhost:3000/events/new`
5. `mcp__playwright__browser_fill_form` 4 input 채우기 (title·description·eventDate·location)
6. `mcp__playwright__browser_click "이벤트 만들기"`
7. Expected: `/events/{새 UUID}` redirect, EventDetailHeader에 입력값 + KST 일시 표시

PASS 기준:
- DB v2_events row INSERT (id, created_by = host1, invite_code 32B base64url)
- redirect URL이 `/events/{uuid}` 패턴
- 이벤트 상세 페이지에 입력값 그대로 표시

## 시나리오 2: 커버 이미지 업로드

1. `/events/new`에서 4 input + 커버 이미지(jpg, 2MB 이하) 첨부
2. "이벤트 만들기" 클릭
3. Expected: v2_events.cover_image_url에 public URL 저장, EventDetailHeader가 이미지 표시
4. Bonus: 2MB 초과 이미지 또는 PDF 첨부 → "지원하지 않는 이미지 형식" 또는 "이미지는 2MB 이하여야 합니다" toast

## 시나리오 3: 이벤트 수정

1. `/events/{id}/edit` 진입 (host1 계정)
2. title 변경 + 저장
3. Expected: DB UPDATE, `/events/{id}` redirect, 변경된 title 표시

## 시나리오 4: 초대 링크 복사

1. `/events/{id}` 진입 (host1 계정)
2. "관리" 탭 클릭 → "링크 복사" 버튼 클릭
3. Expected: clipboard에 `${origin}/invite/{invite_code}` 저장, toast 표시

## 결과 (실행 후 기록)

| 시나리오 | 결과 | 비고 |
| --- | --- | --- |
| 1. 이벤트 생성 | TBD | |
| 2. 커버 업로드 | TBD | allowlist (jpg/png/webp + 2MB) 검증 포함 |
| 3. 이벤트 수정 | TBD | count:exact 0-row 가드 시 "찾을 수 없거나 수정 권한이 없습니다" |
| 4. 초대 링크 복사 | TBD | clipboard 권한 거부 시 코드 검증으로 PASS |
