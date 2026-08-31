import type { PillarId } from "./types";

export interface Pillar {
  id: PillarId;
  label: string;
  short: string;
  color: string; // biến CSS
  hex: string; // giá trị màu gốc (dùng cho Recharts / canvas)
}

/** 4 trụ cột cố định của kế hoạch phát triển bản thân. */
export const PILLARS: Pillar[] = [
  { id: "work", label: "Công việc", short: "CV", color: "var(--work)", hex: "#F2A93B" },
  { id: "study", label: "Học tập", short: "HT", color: "var(--study)", hex: "#5B8DEF" },
  { id: "health", label: "Sức khỏe", short: "SK", color: "var(--health)", hex: "#35C793" },
  { id: "research", label: "Nghiên cứu", short: "NC", color: "var(--research)", hex: "#9B6EF3" },
];

export const PILLAR_IDS = PILLARS.map((p) => p.id);

const BY_ID = new Map(PILLARS.map((p) => [p.id, p]));

export function pillarOf(id: string): Pillar {
  return BY_ID.get(id as PillarId) ?? PILLARS[0];
}

/** Chuẩn hoá category cũ ("personal" / "other" / …) về 1 trong 4 trụ cột. */
export function normalizePillar(raw: string | null | undefined): PillarId {
  if (raw && BY_ID.has(raw as PillarId)) return raw as PillarId;
  return "research";
}

export const REASONS = [
  "Thiếu thời gian",
  "Mất tập trung",
  "Việc phát sinh",
  "Sức khỏe / mệt mỏi",
  "Kế hoạch không hợp lý",
  "Khác",
];
