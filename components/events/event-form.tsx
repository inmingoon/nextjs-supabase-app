"use client";

import { useRef, useTransition } from "react";
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
import { createEvent, updateEvent } from "@/lib/actions/events";
import { isRedirectError } from "@/lib/redirect-error";

type Props = {
  mode: "create" | "edit";
  defaultValues?: Partial<EventFormValues>;
  eventId?: string;
};

/**
 * 이벤트 생성·수정 공용 폼.
 * Phase 3 Task 4: dummy submit → Server Action 호출로 교체.
 * - useTransition 으로 pending state 관리
 * - cover 파일은 RHF 외부 file input (uncontrolled, useRef) → FormData 로 수동 첨부
 * - Server Action 내부 redirect 결과는 catch 에서 rethrow 해야 navigation 동작
 */
export function EventForm({ mode, defaultValues, eventId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("title", values.title);
        formData.set("description", values.description ?? "");
        formData.set("eventDate", values.eventDate);
        formData.set("location", values.location);
        const file = fileInputRef.current?.files?.[0];
        if (file) {
          formData.set("cover", file);
        }
        if (mode === "create") {
          await createEvent(formData);
        } else if (eventId) {
          await updateEvent(eventId, formData);
        }
      } catch (e) {
        // NEXT_REDIRECT 는 Next.js navigation 메커니즘 — rethrow 필수
        if (isRedirectError(e)) throw e;
        const message = e instanceof Error ? e.message : "저장 실패";
        toast.error(message);
      }
    });
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

        <FormItem>
          <FormLabel>커버 이미지 (선택)</FormLabel>
          <FormControl>
            <Input ref={fileInputRef} type="file" accept="image/*" />
          </FormControl>
          <FormDescription>jpg·png·webp 최대 2MB 권장</FormDescription>
        </FormItem>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
            disabled={isPending}
          >
            취소
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending
              ? "저장 중..."
              : mode === "create"
                ? "이벤트 만들기"
                : "수정 저장"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
