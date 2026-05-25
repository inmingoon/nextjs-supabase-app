import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { ProfileForm } from "@/components/profile/profile-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CURRENT_DUMMY_USER } from "@/lib/dummy/users";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold">프로필</h1>
        <div className="mt-6">
          <ProfileForm user={CURRENT_DUMMY_USER} />
        </div>

        <Separator className="my-8" />

        <section className="space-y-3">
          <h2 className="text-base font-semibold">설정</h2>
          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <p className="text-sm font-medium">테마</p>
              <p className="text-xs text-muted-foreground">
                라이트/다크 모드 전환
              </p>
            </div>
            <ThemeToggle />
          </div>
        </section>
      </main>
      <MobileBottomNav />
    </div>
  );
}
