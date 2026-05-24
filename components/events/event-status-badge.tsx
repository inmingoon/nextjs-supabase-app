import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EventStatus } from "@/types/event";

type Props = {
  status: EventStatus;
  className?: string;
};

const STATUS_LABEL: Record<EventStatus, string> = {
  upcoming: "예정",
  ongoing: "진행 중",
  completed: "완료",
};

const STATUS_CLASSES: Record<EventStatus, string> = {
  upcoming:
    "bg-blue-100 text-blue-900 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200",
  ongoing:
    "bg-green-100 text-green-900 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-200",
  completed:
    "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300",
};

/** 이벤트 상태(upcoming/ongoing/completed) 배지. */
export function EventStatusBadge({ status, className }: Props) {
  return (
    <Badge
      variant="secondary"
      className={cn(STATUS_CLASSES[status], "border-transparent", className)}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}
