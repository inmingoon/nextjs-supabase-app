"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  url: string;
};

/**
 * 초대 링크를 클립보드에 복사하고 토스트로 피드백.
 * navigator.clipboard는 secure context(HTTPS, localhost) 필수.
 */
export function CopyInviteLinkButton({ url }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("초대 링크가 복사되었습니다");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("복사에 실패했습니다. 직접 복사해 주세요.");
    }
  }

  return (
    <Button variant="outline" onClick={handleCopy}>
      {copied ? "✓ 복사됨" : "초대 링크 복사"}
    </Button>
  );
}
