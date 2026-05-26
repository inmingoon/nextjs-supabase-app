import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserById } from "@/lib/queries/users";
import type { EventParticipant } from "@/types/event-participant";
import type { User } from "@/types/user";

/**
 * 참여자 아바타 그리드. server 컴포넌트 — 각 참여자의 user를 DB에서 조회.
 * Phase 3 dummy 폐기로 sync → async 전환.
 */
export async function EventParticipantsList({
  participants,
}: {
  participants: EventParticipant[];
}) {
  if (participants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        아직 참여자가 없습니다.
      </p>
    );
  }

  // 병렬 fetch — N+1이지만 화면당 참여자 수가 작아 우선 단순 구현.
  // TODO(Phase 3 Task 5 또는 Task 8): getProfilesByIds(.in("id", ids))로 1 round-trip 배치 전환.
  const users = await Promise.all(
    participants.map((p) => getUserById(p.userId)),
  );

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {participants.map((p, idx) => {
        const user: User | null = users[idx] ?? null;
        const name = user?.fullName ?? "익명";
        const initials = name.slice(0, 2);
        return (
          <li
            key={`${p.eventId}-${p.userId}`}
            className="flex flex-col items-center gap-1.5 text-center"
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={user?.avatarUrl ?? undefined} alt={name} />
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
