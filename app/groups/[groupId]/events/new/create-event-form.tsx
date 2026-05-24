"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEventAction, type CreateEventState } from "./actions";

const initialState: CreateEventState = {};

type Props = {
  groupId: string;
};

export function CreateEventForm({ groupId }: Props) {
  const [state, formAction, pending] = useActionState(
    createEventAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <input type="hidden" name="groupId" value={groupId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="startsAt">회차 시작 시간 (KST)</Label>
        <Input
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="location">장소</Label>
        <Input
          id="location"
          name="location"
          required
          maxLength={200}
          placeholder="예: 강남 수영장 자유 레인"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="memo">메모</Label>
        <Textarea
          id="memo"
          name="memo"
          required
          maxLength={1000}
          placeholder="예: 수영복 챙겨오세요"
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">제목 (선택)</Label>
        <Input
          id="title"
          name="title"
          maxLength={100}
          placeholder="기본은 그룹명을 사용합니다"
        />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "만드는 중…" : "회차 만들기"}
      </Button>
    </form>
  );
}
