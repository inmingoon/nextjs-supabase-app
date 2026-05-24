import { Suspense } from "react";
import { Home, Calendar, Plus, User } from "lucide-react";
import { MobileBottomNavLink } from "@/components/layout/mobile-bottom-nav-link";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: <Home className="h-5 w-5" /> },
  {
    href: "/my-events",
    label: "내 이벤트",
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    href: "/events/new",
    label: "만들기",
    icon: <Plus className="h-5 w-5" />,
  },
  { href: "/profile", label: "프로필", icon: <User className="h-5 w-5" /> },
];

function NavLinkFallback({
  label,
  icon,
}: {
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
  );
}

/**
 * 모바일 하단 nav — server component. Link만 client wrapper로 분리.
 * usePathname()은 Next.js 16 Cache Components 상 uncached data이므로
 * 각 link를 Suspense로 감싸 prerender를 막지 않도록 한다.
 */
export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background md:hidden">
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Suspense
              fallback={
                <NavLinkFallback label={item.label} icon={item.icon} />
              }
            >
              <MobileBottomNavLink {...item} />
            </Suspense>
          </li>
        ))}
      </ul>
    </nav>
  );
}
