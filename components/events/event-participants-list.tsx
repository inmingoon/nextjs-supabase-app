import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserById } from "@/lib/dummy/users";
import type { EventParticipant } from "@/types/event-participant";

export function EventParticipantsList({
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

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {participants.map((p) => {
        const user = getUserById(p.userId);
        const name = user?.fullName ?? "익명";
        const initials = name.slice(0, 2);
        return (
          <li key={`${p.eventId}-${p.userId}`} className="flex flex-col items-center gap-1.5 text-center">
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
