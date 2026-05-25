"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Copy, Check, Share2 } from "lucide-react";

export function EventShareActions({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("초대 링크가 복사되었습니다");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했습니다");
    }
  }

  function shareKakao() {
    toast.info("카카오톡 공유는 Phase 4 v2.x에서 지원 예정입니다");
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1" onClick={copy}>
        {copied ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            복사됨
          </>
        ) : (
          <>
            <Copy className="mr-2 h-4 w-4" />
            링크 복사
          </>
        )}
      </Button>
      <Button variant="outline" className="flex-1" onClick={shareKakao}>
        <Share2 className="mr-2 h-4 w-4" />
        카카오톡
      </Button>
    </div>
  );
}
