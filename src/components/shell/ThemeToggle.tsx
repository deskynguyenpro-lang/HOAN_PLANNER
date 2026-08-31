"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (localStorage.getItem("kh-theme") as Theme) || "dark";
    setTheme(stored);
  }, []);

  const apply = (t: Theme) => {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("kh-theme", t);
    } catch {
      /* bỏ qua nếu trình duyệt chặn localStorage */
    }
  };

  const next = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      onClick={() => apply(next)}
      className="btn-ghost flex items-center justify-center gap-2 rounded-xl transition"
      style={{ width: compact ? 38 : undefined, height: 38, padding: compact ? 0 : "0 12px" }}
      aria-label={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      title={theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
    >
      <Icon size={16} />
      {!compact && (
        <span className="text-[12.5px] font-semibold">
          {theme === "dark" ? "Sáng" : "Tối"}
        </span>
      )}
    </button>
  );
}
