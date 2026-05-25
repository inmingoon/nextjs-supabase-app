"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

type Props = {
  itemLabel: string;
  resourceType: "이벤트" | "사용자";
  onConfirm: (reason: string) => void;
};

export function AdminDeleteConfirm({ itemLabel, resourceType, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  function handleConfirm() {
    onConfirm(reason);
    toast.success(`${resourceType}이(가) 삭제되었습니다 (Phase 3에서 DB 처리)`);
    setOpen(false);
    setReason("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{resourceType} 삭제</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{itemLabel}</span>
            을(를) 삭제합니다. 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label className="text-sm font-medium">삭제 사유 (선택)</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="감사 로그에 기록됩니다"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
