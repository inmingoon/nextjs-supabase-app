import { z } from "zod";

/**
 * 이벤트 생성/수정 폼 Zod 스키마.
 * - title: 1~100자 필수
 * - description: 0~1000자 (빈 문자열 허용)
 * - eventDate: 미래 datetime-local 문자열
 * - location: 1~200자 필수
 */
export const eventFormSchema = z
  .object({
    title: z
      .string()
      .min(1, "제목을 입력하세요")
      .max(100, "제목은 100자 이하여야 합니다"),
    description: z
      .string()
      .max(1000, "설명은 1000자 이하여야 합니다")
      .optional()
      .or(z.literal("")),
    eventDate: z
      .string()
      .min(1, "일시를 선택하세요")
      .refine((v) => !Number.isNaN(Date.parse(v)), {
        message: "유효한 일시가 아닙니다",
      }),
    location: z
      .string()
      .min(1, "장소를 입력하세요")
      .max(200, "장소는 200자 이하여야 합니다"),
  })
  .refine(
    (data) => {
      if (!data.eventDate) return true;
      return new Date(data.eventDate).getTime() > Date.now();
    },
    {
      message: "이벤트 일시는 미래여야 합니다",
      path: ["eventDate"],
    },
  );

export type EventFormValues = z.infer<typeof eventFormSchema>;
