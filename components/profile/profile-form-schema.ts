import { z } from "zod";

export const profileFormSchema = z.object({
  fullName: z
    .string()
    .min(1, "이름을 입력하세요")
    .max(50, "이름은 50자 이하여야 합니다"),
  avatarUrl: z
    .string()
    .url("유효한 URL이 아닙니다")
    .optional()
    .or(z.literal("")),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
