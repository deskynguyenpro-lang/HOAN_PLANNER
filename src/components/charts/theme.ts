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

function read(): ChartTheme {
  const s =
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement)
      : null;
  const v = (name: string, fallback: string) =>
    (s?.getPropertyValue(name) || "").trim() || fallback;

  const surface = v("--surface", "#161b2e");
  const border = v("--border", "#2a3150");
  const text = v("--text", "#eef1fa");

  return {
    grid: v("--grid", "rgba(255,255,255,0.06)"),
    axis: v("--text-3", "#626a93"),
    brand: v("--brand", "#ff6b5b"),
    work: v("--work", "#f2a93b"),
    study: v("--study", "#5b8def"),
    health: v("--health", "#35c793"),
    research: v("--research", "#9b6ef3"),
    good: v("--good", "#35c793"),
    warn: v("--warn", "#f2a93b"),
    bad: v("--bad", "#ff6b5b"),
    tooltip: {
      background: surface,
      border: `1px solid ${border}`,
      borderRadius: 10,
      fontSize: 12,
      color: text,
      boxShadow: "0 12px 30px -12px rgba(0,0,0,0.5)",
    },
  };
}

/** Màu biểu đồ lấy từ biến CSS, tự cập nhật khi đổi giao diện sáng/tối. */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(() => read());

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
