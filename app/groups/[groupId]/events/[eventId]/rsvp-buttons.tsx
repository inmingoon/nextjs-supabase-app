"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  respondToEventAction,
  type RespondState,
} from "./actions";

const initialState: RespondState = {};

type Props = {
  eventId: string;
  groupId: string;
  initialStatus: "going" | "not_going" | "pending";
  locked: boolean;
};

const STATUS_LABEL: Record<"going" | "not_going" | "pending", string> = {
  going: "✓ 갈게요",
  not_going: "못 가요",
  pending: "미정",
};

/**
 * RSVP 3-상태 토글 버튼. 서버 액션 응답 후 sonner toast로 피드백.
 * locked=true이면 버튼 대신 현재 응답을 배지로 표시.
 */
export function RsvpButtons({ eventId, groupId, initialStatus, locked }: Props) {
  const [state, formAction, pending] = useActionState(
    respondToEventAction,
    initialState,
  );

  // server action 응답 후 토스트 (strict mode 이중 render 방지를 위해 useEffect)
  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    } else if (state.status) {
      toast.success("응답이 저장되었습니다");
    }
  }, [state.error, state.status]);

  const current = state.status ?? initialStatus;

  if (locked) {
    return (
      <div className="rounded-md border bg-muted px-4 py-3 text-sm text-muted-foreground">
        🔒 응답 마감 — 현재 응답: {STATUS_LABEL[current]}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(["going", "not_going", "pending"] as const).map((opt) => (
        <form key={opt} action={formAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="status" value={opt} />
          <Button
            type="submit"
            variant={current === opt ? "default" : "outline"}
            disabled={pending}
          >
            {STATUS_LABEL[opt]}
          </Button>
        </form>
      ))}
    </div>
  );
}
