"use client";

import { useEffect, useState } from "react";

export interface ChartTheme {
  grid: string;
  axis: string;
  brand: string;
  work: string;
  study: string;
  health: string;
  research: string;
  good: string;
  warn: string;
  bad: string;
  tooltip: React.CSSProperties;
}

// Giá trị mặc định (dark) — dùng cho SSR và lần render client đầu tiên để
// tránh hydration mismatch. Sau khi mount mới đọc biến CSS thật.
const FALLBACK: ChartTheme = {
  grid: "rgba(255,255,255,0.055)",
  axis: "#6a7299",
  brand: "#ff6a5a",
  work: "#f6ab3c",
  study: "#6293f4",
  health: "#35cf98",
  research: "#a179f6",
  good: "#35cf98",
  warn: "#f6ab3c",
  bad: "#ff6a5a",
  tooltip: {
    background: "#161c31",
    border: "1px solid #29314f",
    borderRadius: 10,
    fontSize: 12,
    color: "#f0f2fb",
    boxShadow: "0 12px 30px -12px rgba(0,0,0,0.5)",
  },
};

function read(): ChartTheme {
  if (typeof window === "undefined") return FALLBACK;
  const s = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) =>
    (s.getPropertyValue(name) || "").trim() || fallback;

  return {
    grid: v("--grid", FALLBACK.grid),
    axis: v("--text-3", FALLBACK.axis),
    brand: v("--brand", FALLBACK.brand),
    work: v("--work", FALLBACK.work),
    study: v("--study", FALLBACK.study),
    health: v("--health", FALLBACK.health),
    research: v("--research", FALLBACK.research),
    good: v("--good", FALLBACK.good),
    warn: v("--warn", FALLBACK.warn),
    bad: v("--bad", FALLBACK.bad),
    tooltip: {
      background: v("--surface", "#161c31"),
      border: `1px solid ${v("--border", "#29314f")}`,
      borderRadius: 10,
      fontSize: 12,
      color: v("--text", "#f0f2fb"),
      boxShadow: "0 12px 30px -12px rgba(0,0,0,0.5)",
    },
  };
}

/** Màu biểu đồ lấy từ biến CSS, tự cập nhật khi đổi giao diện sáng/tối. */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(FALLBACK);

  useEffect(() => {
    setTheme(read());
    const obs = new MutationObserver(() => setTheme(read()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  return theme;
}
