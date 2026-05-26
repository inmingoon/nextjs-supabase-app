import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getEventPublicUsers } from "@/lib/queries/participants";

/**
 * 참여자 아바타 그리드. server 컴포넌트 — SECURITY DEFINER RPC 한 번으로 모든 참여자 공개 프로필을 조회.
 * Task 2 review Important #1 (RLS self/admin 제한으로 다른 참여자 표시 차단) + #3 (N+1) 동시 해소.
 * 호출자는 해당 이벤트의 host 또는 참여자여야 데이터가 반환됨 (서버 측 검증).
 */
export async function EventParticipantsList({
  eventId,
}: {
  eventId: string;
}) {
  const users = await getEventPublicUsers(eventId);

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        아직 참여자가 없습니다.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {users.map((user) => {
        const name = user.fullName ?? "익명";
        const initials = name.slice(0, 2);
        return (
          <li
            key={user.id}
            className="flex flex-col items-center gap-1.5 text-center"
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="line-clamp-1 text-xs text-muted-foreground">
              {name}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
