"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateInviteToken } from "@/lib/tokens";

export type CreateGroupState = {
  error?: string;
};

/**
 * 그룹을 생성한다. 생성자는 자동으로 group_members에 추가되고
 * 생성된 그룹 상세 페이지로 redirect.
 */
export async function createGroupAction(
  _prev: CreateGroupState,
  formData: FormData,
): Promise<CreateGroupState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (name.length < 1 || name.length > 50) {
    return { error: "그룹 이름은 1~50자여야 합니다." };
  }
  if (description.length > 500) {
    return { error: "설명은 500자 이하여야 합니다." };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) {
    return { error: "로그인이 필요합니다." };
  }

  const inviteToken = generateInviteToken();

  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      name,
      description: description.length > 0 ? description : null,
      owner_id: userId,
      invite_token: inviteToken,
    })
    .select("id")
    .single();

  if (error || !group) {
    return { error: `그룹 생성에 실패했습니다: ${error?.message ?? "unknown"}` };
  }

  // 생성자를 멤버로 자동 추가 (group_members_insert_owner_self 정책 사용)
  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: userId });

  if (memberError) {
    return { error: `멤버십 생성 실패: ${memberError.message}` };
  }

  redirect(`/groups/${group.id}`);
}
