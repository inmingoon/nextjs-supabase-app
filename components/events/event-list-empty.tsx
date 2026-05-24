import { Calendar } from "lucide-react";

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

/**
 * 이벤트 목록 비어있을 때 공용 placeholder.
 * `action`은 임의의 ReactNode (Button + Link 등)을 받는다.
 */
export function EventListEmpty({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed py-12 text-center">
      <Calendar className="h-10 w-10 text-muted-foreground" />
      <div>
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
