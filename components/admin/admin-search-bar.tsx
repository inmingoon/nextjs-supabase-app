"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  debounceMs?: number;
};

export function AdminSearchBar({
  value,
  onChange,
  placeholder = "검색...",
  debounceMs = 200,
}: Props) {
  const [local, setLocal] = useState(value);

  // 외부에서 value가 바뀌면 local과 동기화
  useEffect(() => {
    setLocal(value);
  }, [value]);

  // onChange의 최신 참조를 ref에 보관해 debounce effect의 deps 폭증/stale closure 회피
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // local 변경 → debounce 후 onChange 호출
  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => {
      onChangeRef.current(local);
    }, debounceMs);
    return () => clearTimeout(t);
  }, [local, value, debounceMs]);

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}
