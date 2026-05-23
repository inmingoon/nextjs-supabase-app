"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  joinGroupByTokenAction,
  type JoinGroupState,
} from "./actions";

const initialState: JoinGroupState = {};

type Props = {
  token: string;
  groupName: string;
};

/**
 * 초대 링크로 그룹에 가입하는 submit 버튼.
 * useActionState로 서버 액션 pending / error 상태를 관리한다.
 */
export function JoinGroupButton({ token, groupName }: Props) {
  const [state, formAction, pending] = useActionState(
    joinGroupByTokenAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <Button type="submit" disabled={pending}>
        {pending ? "가입 중…" : `${groupName} 그룹 가입하기`}
      </Button>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
    </form>
  );
}
