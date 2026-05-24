import { Suspense } from "react";
import { LayoutDashboard, Calendar, Users, BarChart } from "lucide-react";
import { AdminSidebarLink } from "@/components/layout/admin-sidebar-link";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const ADMIN_NAV_ITEMS = [
  {
    href: "/admin",
    label: "대시보드",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/admin/events",
    label: "이벤트 관리",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    href: "/admin/users",
    label: "사용자 관리",
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: "/admin/analytics",
    label: "통계 분석",
    icon: <BarChart className="h-4 w-4" />,
  },
];

function SidebarLinkFallback({
  label,
  icon,
}: {
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
  );
}

/**
 * Admin 데스크톱 좌측 사이드바 — server component. Link만 client wrapper로 분리.
 * usePathname()은 Next.js 16 Cache Components 상 uncached data이므로
 * 각 link를 Suspense로 감싸 prerender를 막지 않도록 한다.
 * 하단 strip에 테마 토글.
 */
export function AdminSidebar() {
  return (
    <aside className="hidden w-64 flex-col border-r bg-background md:flex">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">관리자</h2>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {ADMIN_NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Suspense
                fallback={
                  <SidebarLinkFallback label={item.label} icon={item.icon} />
                }
              >
                <AdminSidebarLink {...item} />
              </Suspense>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t p-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">테마</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
