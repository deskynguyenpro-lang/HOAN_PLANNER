import type { EnergyLevel } from "./types";

export const ENERGY_LEVELS: EnergyLevel[] = ["HIGH_FOCUS", "MEDIUM", "LOW_ENERGY", "ADMIN"];

export interface EnergyMeta {
  label: string;
  emoji: string;
  hint: string;
  color: string;
}

export const ENERGY_META: Record<EnergyLevel, EnergyMeta> = {
  HIGH_FOCUS: {
    label: "Tập trung cao",
    emoji: "🧠",
    hint: "Cần não bộ tỉnh táo",
    color: "#a855f7",
  },
  MEDIUM: {
    label: "Trung bình",
    emoji: "⚡",
    hint: "Cường độ vừa phải",
    color: "#f59e0b",
  },
  LOW_ENERGY: {
    label: "Năng lượng thấp",
    emoji: "☕",
    hint: "Thư giãn / đọc tin / xem clip",
    color: "#22c55e",
  },
  ADMIN: {
    label: "Hành chính",
    emoji: "📁",
    hint: "Sự vụ ngắn, giấy tờ",
    color: "#64748b",
  },
};

/** Từ defer_count -> mức cảnh báo hiển thị trên Task Card. */
export function deferSeverity(deferCount: number): "none" | "warn" | "critical" {
  if (deferCount >= 3) return "critical";
  if (deferCount > 0) return "warn";
  return "none";
}
