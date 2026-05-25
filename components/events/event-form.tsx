"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { makeEventFormSchema, type EventFormValues } from "./event-form-schema";

type Props = {
  mode: "create" | "edit";
  defaultValues?: Partial<EventFormValues>;
  eventId?: string;
};

/**
 * 이벤트 생성·수정 공용 폼.
 * Phase 2 더미: submit 시 console.log + sonner toast.
 * Phase 3 Task 009에서 Server Action으로 교체 예정.
 */
export function EventForm({ mode, defaultValues, eventId }: Props) {
  const router = useRouter();
  const schema = makeEventFormSchema({ enforceFutureDate: mode === "create" });
  const form = useForm<EventFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      eventDate: defaultValues?.eventDate ?? "",
      location: defaultValues?.location ?? "",
    },
  });

  function onSubmit(values: EventFormValues) {
    // TODO(Phase 3): Server Action 전 values.eventDate 를 kstDateTimeLocalToIso() 로 변환해야 timestamptz 가 KST 시각으로 정확히 저장됨. 미변환 시 9시간 shift.
    console.log(`[Phase 2 dummy] EventForm submit (${mode})`, {
      eventId,
      values,
    });
    toast.success(
      mode === "create"
        ? "이벤트가 생성되었습니다 (Phase 3에서 DB 저장)"
        : "이벤트가 수정되었습니다 (Phase 3에서 DB 저장)",
    );
    router.push("/my-events");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>제목 *</FormLabel>
              <FormControl>
                <Input placeholder="예: Next.js 16 스터디 모임" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>설명</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="이벤트 내용을 자유롭게 적어주세요"
                  {...field}
                />
              </FormControl>
              <FormDescription>최대 1000자</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="eventDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>일시 (KST) *</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>장소 *</FormLabel>
              <FormControl>
                <Input
                  placeholder="예: 강남역 스터디카페 또는 온라인"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            취소
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={form.formState.isSubmitting}
          >
            {mode === "create" ? "이벤트 만들기" : "수정 저장"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
