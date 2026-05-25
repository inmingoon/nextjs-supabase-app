import { z } from "zod";

type SchemaOptions = {
  /** false to skip the "must be future" refine — used by edit mode on past/ongoing events */
  enforceFutureDate?: boolean;
};

const baseShape = {
  title: z
    .string()
    .min(1, "제목을 입력하세요")
    .max(100, "제목은 100자 이하여야 합니다"),
  description: z
    .string()
    .max(1000, "설명은 1000자 이하여야 합니다")
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
};

/**
 * 이벤트 생성/수정 폼 검증 schema 팩토리.
 * - create 모드: 미래 일시만 허용 (enforceFutureDate=true)
 * - edit 모드: 과거 이벤트 수정 가능 (enforceFutureDate=false)
 */
export function makeEventFormSchema({ enforceFutureDate = true }: SchemaOptions = {}) {
  const base = z.object(baseShape);
  if (!enforceFutureDate) return base;
  return base.refine(
    (data) => {
      if (!data.eventDate) return true;
      return new Date(data.eventDate).getTime() > Date.now();
    },
    {
      message: "이벤트 일시는 미래여야 합니다",
      path: ["eventDate"],
    }
  );
}

/** 기본 schema (create 모드 호환 — backward-compatible export) */
export const eventFormSchema = makeEventFormSchema();

export type EventFormValues = z.infer<typeof eventFormSchema>;
