"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type JoinGroupState = {
  error?: string;
};

/**
 * 초대 토큰으로 그룹에 가입한다.
 * - 비로그인 → 호출 자체가 정책상 거부됨. 호출 전에 페이지에서 분기
 * - 이미 가입 → RPC가 그룹 id 반환 (멱등)
 * - 무효 토큰 → RPC가 raise → error 상태 반환
 */
export async function joinGroupByTokenAction(
  _prev: JoinGroupState,
  formData: FormData,
): Promise<JoinGroupState> {
  const token = String(formData.get("token") ?? "");
  if (token.length === 0) {
    return { error: "초대 토큰이 비어 있습니다." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_group_by_token", { token });

  if (error || !data) {
    const msg = error?.message ?? "";
    if (msg.includes("invalid_invite_token")) {
      return { error: "유효하지 않은 초대 링크입니다." };
    }
    if (msg.includes("not_authenticated")) {
      return { error: "로그인이 필요합니다." };
    }
    return { error: `가입에 실패했습니다: ${msg || "unknown"}` };
  }

  redirect(`/groups/${data}`);
}
