"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Cable,
  LogOut,
  Home,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/consultations", label: "Consultations", icon: CalendarCheck },
  { href: "/admin/integrations", label: "Integrations", icon: Cable },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login") return null;

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex flex-col w-full lg:w-[15.5rem] shrink-0 border-b lg:border-b-0 lg:border-r border-white/8 bg-surface/90 lg:min-h-screen lg:sticky lg:top-0 lg:h-screen backdrop-blur-md">
      <div className="px-5 py-6 border-b border-white/8 relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-8 -right-6 w-28 h-28 rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, rgba(183,172,127,0.25), transparent 70%)",
          }}
        />
        <p className="relative font-serif text-[1.4rem] text-foreground leading-none">
          Estate Valora
        </p>
        <p className="relative mt-1.5 text-[11px] uppercase tracking-[0.14em] text-foreground-subtle">
          Brokerage admin
        </p>
      </div>

      <nav className="flex lg:flex-col gap-1 p-3 overflow-x-auto lg:overflow-visible">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] whitespace-nowrap transition-all duration-200 ${
                active
                  ? "bg-electric/12 text-electric shadow-[inset_0_0_0_1px_rgba(183,172,127,0.2)]"
                  : "text-foreground-muted hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-electric hidden lg:block" />
              )}
              <Icon size={16} className="shrink-0 opacity-85" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-3 flex lg:flex-col gap-1 border-t border-white/8">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] text-foreground-muted hover:text-foreground hover:bg-white/[0.04] transition-colors"
        >
          <Home size={16} /> Site
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] text-foreground-muted hover:text-warm hover:bg-warm/10 w-full text-left transition-colors"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}
