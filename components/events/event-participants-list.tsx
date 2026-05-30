import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ParticipantUser = {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
};

/**
 * 참여자 아바타 그리드. server 컴포넌트지만 자체 fetch 없이 부모(page.tsx)가
 * getEventPublicUsers RPC로 가져온 결과를 그대로 받음 — count와 list가 동일 소스를
 * 공유해 RLS direct-select와 SECURITY DEFINER RPC 간 권한 비대칭을 회피.
 */
export function EventParticipantsList({
  users,
}: {
  users: ParticipantUser[];
}) {
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
