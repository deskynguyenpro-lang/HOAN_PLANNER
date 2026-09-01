"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Loader2,
  Check,
  AlertTriangle,
  LogOut,
  LayoutDashboard,
  CalendarCheck2,
  CalendarRange,
  Target,
  LineChart,
} from "lucide-react";
import { useStore } from "@/lib/data/store";
import { ThemeToggle } from "./ThemeToggle";
import { SettingsMenu } from "@/components/settings/SettingsMenu";

const NAV = [
  { href: "/tong-quan", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/hom-nay", label: "Hôm nay", icon: CalendarCheck2 },
  { href: "/lich", label: "Lịch", icon: CalendarRange },
  { href: "/muc-tieu", label: "Mục tiêu", icon: Target },
  { href: "/phan-tich", label: "Phân tích", icon: LineChart },
];

function SaveStatus() {
  const { saveState, saveError } = useStore();
  if (saveState === "saving")
    return (
      <span className="flex items-center gap-1.5 text-text-3 text-[11.5px]">
        <Loader2 size={12} className="animate-spin" /> Đang lưu…
      </span>
    );
  if (saveState === "saved")
    return (
      <span className="flex items-center gap-1.5 text-good text-[11.5px]">
        <Check size={12} /> Đã lưu
      </span>
    );
  if (saveState === "error")
    return (
      <span
        className="flex items-center gap-1.5 text-bad text-[11.5px]"
        title={saveError}
      >
        <AlertTriangle size={12} /> Lưu lỗi
      </span>
    );
  return null;
}

export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen w-full lg:flex">
      {/* ─── Sidebar (desktop) ─────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-[248px] shrink-0 sticky top-0 h-screen border-r"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2.5 px-5 h-[68px] border-b" style={{ borderColor: "var(--border)" }}>
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 34,
              height: 34,
              background: "linear-gradient(145deg, var(--brand-2), var(--brand))",
            }}
          >
            <Compass size={17} color="#fff" strokeWidth={2.3} />
          </div>
          <div className="leading-tight">
            <div className="headline text-[13.5px]">Kế hoạch phát triển</div>
            <div className="eyebrow" style={{ fontSize: 9 }}>
              4 trụ cột
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((n) => {
            const active = isActive(n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold transition-colors"
                style={{
                  background: active ? "var(--brand-dim)" : "transparent",
                  color: active ? "var(--brand)" : "var(--text-2)",
                }}
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full transition-all"
                  style={{
                    width: active ? 3 : 0,
                    height: active ? 18 : 0,
                    background: "linear-gradient(180deg, var(--brand-2), var(--brand))",
                  }}
                />
                <Icon
                  size={17}
                  className={active ? "" : "group-hover:text-text transition-colors"}
                />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SettingsMenu align="left" />
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="btn-ghost w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] rounded-xl hover:!text-bad"
            >
              <LogOut size={16} /> Đăng xuất
            </button>
          </form>
          <div className="px-2 pt-1">
            <div className="text-text-3 text-[10.5px] truncate">{email}</div>
            <div className="mt-1">
              <SaveStatus />
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Top bar (mobile) */}
        <header
          className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-[58px] border-b"
          style={{
            borderColor: "var(--border)",
            background: "color-mix(in srgb, var(--bg) 88%, transparent)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 30,
                height: 30,
                background: "linear-gradient(145deg, var(--brand-2), var(--brand))",
              }}
            >
              <Compass size={15} color="#fff" strokeWidth={2.3} />
            </div>
            <span className="headline text-[14px]">Kế hoạch phát triển</span>
          </div>
          <div className="flex items-center gap-1.5">
            <SaveStatus />
            <ThemeToggle compact />
            <SettingsMenu align="right" />
          </div>
        </header>

        <main
          key={pathname}
          className="page-enter mx-auto max-w-5xl px-4 lg:px-8 py-5 lg:py-8 pb-28 lg:pb-12"
        >
          {children}
        </main>
      </div>

      {/* ─── Bottom nav (mobile) ───────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--surface) 94%, transparent)",
          backdropFilter: "blur(10px)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="max-w-lg mx-auto grid grid-cols-5">
          {NAV.map((n) => {
            const active = isActive(n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className="flex flex-col items-center gap-1 py-2.5"
                style={{ color: active ? "var(--brand)" : "var(--text-3)" }}
              >
                <span
                  className="flex items-center justify-center rounded-lg"
                  style={{
                    width: 34,
                    height: 24,
                    background: active ? "var(--brand-dim)" : "transparent",
                  }}
                >
                  <Icon size={18} />
                </span>
                <span
                  className="text-[10px]"
                  style={{ fontWeight: active ? 700 : 500 }}
                >
                  {n.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
