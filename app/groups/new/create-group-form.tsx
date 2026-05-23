"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createGroupAction, type CreateGroupState } from "./actions";

const initialState: CreateGroupState = {};

export function CreateGroupForm() {
  const [state, formAction, pending] = useActionState(
    createGroupAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">그룹 이름</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={50}
          placeholder="예: 강남 수영회"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">설명 (선택)</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={500}
          placeholder="모임 소개를 적어주세요"
          rows={4}
        />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "만드는 중…" : "그룹 만들기"}
      </Button>
    </form>
  );
}
