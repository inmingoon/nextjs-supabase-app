# UX Toast / Debounce Audit — v2 Phase 4

감사 날짜: 2026-06-01  
대상 브랜치: `feat/event-platform-v2`

---

## 1. Toast 커버리지 감사

| 컴포넌트 | Mutation 액션 | 성공 피드백 | 실패 피드백 | 판정 |
|---|---|---|---|---|
| `components/admin/admin-delete-confirm.tsx` | 삭제 확인 다이얼로그 → `onConfirm(reason)` 호출 | `toast.success("…삭제되었습니다")` — 낙관적(optimistic) 발사, Phase 3 TODO 주석 포함 | 없음 — 에러 처리는 호출자(caller) 책임, 컴포넌트 범위 밖 | OK |
| `components/copy-invite-link-button.tsx` | 클립보드 복사 | `toast.success("초대 링크가 복사되었습니다")` | `toast.error("복사에 실패했습니다. 직접 복사해 주세요.")` | OK |
| `components/events/event-form.tsx` | 이벤트 생성(`createEvent`) / 수정(`updateEvent`) | 성공 시 Server Action 내부에서 `redirect()` — 네비게이션이 피드백 역할 | `toast.error(message)` — NEXT\_REDIRECT 는 rethrow, 그 외 에러는 toast | OK |
| `components/events/event-share-actions.tsx` | 클립보드 복사 + 카카오톡 공유(stub) | `toast.success("초대 링크가 복사되었습니다")` / 카카오 stub: `toast.info("…지원 예정")` | `toast.error("복사에 실패했습니다")` | OK |
| `components/invite/invite-preview.tsx` | 이벤트 참여(`joinEvent`) | 성공 시 Server Action 내부 `redirect()` — NEXT\_REDIRECT rethrow → 네비게이션이 피드백 | `toast.error(e.message \| "참여 실패")` | OK |
| `components/profile/profile-form.tsx` | 프로필 저장 (Phase 2 더미) | `toast.success("프로필이 저장되었습니다 (Phase 3에서 DB 저장)")` — 더미 고정 메시지 | 없음 — 아직 Server Action 미연결, 실패 경로 자체가 없음 | OK (Phase 3 미구현 stub) |

### 판정 기준 메모

- **redirect = 피드백**: `event-form.tsx`와 `invite-preview.tsx`는 성공 시 페이지 이동으로 사용자에게 충분한 피드백을 제공한다. 별도 `toast.success` 추가는 노이즈.
- **admin-delete-confirm.tsx 낙관적 toast**: 실제 DB 작업 전에 toast가 발사된다. Phase 3 주석(`Phase 3에서 DB 처리`)에 이미 인식된 TODO. 현 단계(학습 프로젝트)에서 수정 대상 아님.
- **profile-form.tsx**: Phase 2 더미 상태. Server Action 연결 후 실패 경로 추가가 필요하지만, 현재는 실패가 발생할 수 없는 구조이므로 gap 아님.

---

## 2. 어드민 검색 Debounce 확인

파일: `components/admin/admin-search-bar.tsx`

**메커니즘**: `useEffect` + `setTimeout` / `clearTimeout` 패턴

```ts
useEffect(() => {
  if (local === value) return;
  const t = setTimeout(() => {
    onChangeRef.current(local);
  }, debounceMs);
  return () => clearTimeout(t);
}, [local, value, debounceMs]);
```

**지연**: `debounceMs` prop, 기본값 **200ms** (`debounceMs = 200`)

**추가 패턴**:
- `onChangeRef` (useRef)로 `onChange` 최신 참조를 보관 → stale closure 방지
- `local === value` 조건으로 외부 동기화 시 불필요한 디바운스 스킵

**결과**: Phase 3 후속 #6 확인 완료. 200ms debounce 정상 구현됨.

---

## 3. Fixes Applied

**없음**

감사 결과, 6개 컴포넌트 모두 기존 패턴 내에서 적절한 UX 피드백을 갖추고 있어 추가 수정이 필요한 genuine gap이 발견되지 않았다.
