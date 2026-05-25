"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { User } from "@/types/user";

const profileFormSchema = z.object({
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

type ProfileFormValues = z.infer<typeof profileFormSchema>;

/**
 * 프로필 이름/아바타 수정 폼.
 * Phase 2 더미: submit 시 console.log + sonner toast.
 * Phase 3에서 Server Action으로 교체 예정.
 */
export function ProfileForm({ user }: { user: User }) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user.fullName ?? "",
      avatarUrl: user.avatarUrl ?? "",
    },
  });

  function onSubmit(values: ProfileFormValues) {
    console.log("[Phase 2 dummy] ProfileForm submit", values);
    toast.success("프로필이 저장되었습니다 (Phase 3에서 DB 저장)");
  }

  const initials = (user.fullName ?? user.email).slice(0, 2);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={user.avatarUrl ?? undefined}
              alt={user.fullName ?? user.email}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{user.email}</p>
            <p className="capitalize">{user.role}</p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름 *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="avatarUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>아바타 URL</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          저장
        </Button>
      </form>
    </Form>
  );
}
