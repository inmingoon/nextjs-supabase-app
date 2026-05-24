import Link from "next/link";
import { CalendarOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type Action = {
  label: string;
  href: string;
};

type Props = {
  title?: string;
  description?: string;
  action?: Action;
};

/**
 * 이벤트 목록 비어있을 때 공용 placeholder.
 */
export function EventListEmpty({
  title = "이벤트가 없습니다",
  description = "아직 등록된 이벤트가 없어요.",
  action,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
      <CalendarOff className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {action ? (
        <Button asChild variant="default" size="sm">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
