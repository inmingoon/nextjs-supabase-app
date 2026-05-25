import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="border-b bg-background px-6 py-4 md:px-8">
          <p className="text-xs text-muted-foreground">v2.0 관리자 콘솔 · 더미 데이터</p>
        </header>
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
