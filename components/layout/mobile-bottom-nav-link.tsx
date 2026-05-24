"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  label: string;
  icon: ReactNode;
};

/**
 * 모바일 하단 nav 한 칸 — active state는 pathname 정확히 일치할 때.
 * icon은 parent server component에서 렌더한 ReactNode를 받아 client 경계
 * 직렬화 제약(함수 prop 금지)을 회피한다.
 */
export function MobileBottomNavLink({ href, label, icon }: Props) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 py-2 text-xs",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
