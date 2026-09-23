import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata = {
  title: "Admin | Estate Valora",
};

export default function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:flex relative">
      <div
        className="pointer-events-none fixed inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 10% 0%, rgba(183,172,127,0.07), transparent 50%), radial-gradient(ellipse 45% 35% at 100% 20%, rgba(44,156,197,0.06), transparent 45%)",
        }}
      />
      <AdminSidebar />
      <main className="relative flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
