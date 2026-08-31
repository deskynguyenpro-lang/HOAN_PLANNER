"use client";

import { useEffect, useRef, useState } from "react";
import { Settings2, ListChecks, Database, Wand2, LogOut } from "lucide-react";
import { GoalManager } from "./GoalManager";
import { BackupModal } from "./BackupModal";
import { SeedConfirmModal } from "./SeedConfirmModal";

type Panel = null | "goals" | "backup" | "seed";

export function SettingsMenu({ align = "right" }: { align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const item = (icon: React.ReactNode, label: string, onClick: () => void) => (
    <button
      onClick={() => {
        onClick();
        setOpen(false);
      }}
      className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-medium text-text-2 hover:bg-chip hover:text-text transition"
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost flex items-center justify-center rounded-xl"
        style={{ width: 38, height: 38 }}
        aria-label="Thiết lập"
        aria-expanded={open}
      >
        <Settings2 size={16} />
      </button>

      {open && (
        <div
          className="absolute z-40 mt-2 w-56 p-1.5 rounded-2xl animate-scale-in"
          style={{
            ...(align === "right" ? { right: 0 } : { left: 0 }),
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 24px 60px -20px rgba(0,0,0,0.65)",
          }}
        >
          {item(<ListChecks size={15} />, "Mục tiêu hằng ngày", () => setPanel("goals"))}
          {item(<Database size={15} />, "Sao lưu / Khôi phục", () => setPanel("backup"))}
          {item(<Wand2 size={15} />, "Tải dữ liệu mẫu", () => setPanel("seed"))}
          <div className="hair my-1.5" />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-medium text-text-2 hover:bg-chip hover:text-bad transition"
            >
              <LogOut size={15} />
              Đăng xuất
            </button>
          </form>
        </div>
      )}

      {panel === "goals" && <GoalManager onClose={() => setPanel(null)} />}
      {panel === "backup" && <BackupModal onClose={() => setPanel(null)} />}
      {panel === "seed" && <SeedConfirmModal onClose={() => setPanel(null)} />}
    </div>
  );
}
