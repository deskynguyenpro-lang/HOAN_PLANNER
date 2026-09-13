import type { Goal, Logs, PillarId } from "./types";
import { PILLAR_IDS } from "./pillars";
import { pillarsWeekOverview } from "./weekly";

// ─── Kiểu dữ liệu ────────────────────────────────────────────────────────

export type FocusMode = "growth" | "balance" | "sprint";

export type PillarWeights = Record<PillarId, number>;

export interface CorePriority {
  pillar: PillarId;
  action: string;
  reason: string;
}

export interface IdentityProfile {
  vision: string;
  pillarWeights: PillarWeights;
  focusMode: FocusMode;
  strategicSummary: string;
  corePriorities: CorePriority[];
  /** Các mục tiêu hằng ngày (theo id) mà AI đánh giá là ưu tiên cốt lõi. */
  coreGoalIds: string[];
  deprioritizedAdvice: string;
  updatedAt: string;
}

export const EQUAL_WEIGHTS: PillarWeights = { work: 25, study: 25, health: 25, research: 25 };

export const FOCUS_MODE_LABEL: Record<FocusMode, string> = {
  growth: "Tăng trưởng",
  balance: "Cân bằng",
  sprint: "Nước rút",
};

export const FOCUS_MODE_HINT: Record<FocusMode, string> = {
  growth: "Chấp nhận lệch cán cân để dồn lực cho trụ cột đang ưu tiên.",
  balance: "Vẫn ưu tiên theo định hướng nhưng không bỏ hẳn trụ cột nào.",
  sprint: "Tạm ẩn bớt việc phụ trên lịch trình để dồn toàn lực cho ưu tiên cốt lõi.",
};

export function emptyIdentity(): IdentityProfile {
  return {
    vision: "",
    pillarWeights: EQUAL_WEIGHTS,
    focusMode: "balance",
    strategicSummary: "",
    corePriorities: [],
    coreGoalIds: [],
    deprioritizedAdvice: "",
    updatedAt: "",
  };
}

/** Chuẩn hoá để tổng luôn = 100, làm tròn về số nguyên. */
export function normalizeWeights(raw: Partial<PillarWeights>): PillarWeights {
  const safe = PILLAR_IDS.map((id) => Math.max(0, Number(raw[id]) || 0));
  const total = safe.reduce((a, b) => a + b, 0);
  if (total <= 0) return { ...EQUAL_WEIGHTS };
  const scaled = safe.map((v) => (v / total) * 100);
  const rounded = scaled.map((v) => Math.round(v));
  // Bù phần lệch do làm tròn vào trụ cột lớn nhất, để tổng luôn đúng 100.
  const diff = 100 - rounded.reduce((a, b) => a + b, 0);
  if (diff !== 0) {
    const maxIdx = rounded.indexOf(Math.max(...rounded));
    rounded[maxIdx] += diff;
  }
  return Object.fromEntries(PILLAR_IDS.map((id, i) => [id, rounded[i]])) as PillarWeights;
}

/**
 * Tổng số giờ/tuần đang thực sự lên lịch (từ các mục tiêu hằng ngày thật) —
 * dùng làm "ngân sách thời gian" để chia lại theo % định hướng, thay vì bịa
 * ra một con số cố định không gắn với việc bạn thật sự đã tạo.
 */
export function currentWeeklyCapacity(goals: Goal[], logs: Logs): number {
  return pillarsWeekOverview(goals, logs).reduce((s, p) => s + p.targetHours, 0);
}

export interface RecommendedPillar {
  id: PillarId;
  weightPct: number;
  recommendedHours: number;
  actualHours: number;
  deltaHours: number; // recommended - actual; dương = đang thiếu so với định hướng
}

/**
 * Chia "ngân sách" giờ/tuần hiện có theo đúng tỷ lệ % định hướng, rồi so với
 * số giờ đang thực sự đặt cho từng trụ cột — để biết lệch ở đâu, lệch bao nhiêu.
 */
export function recommendedAllocation(
  weights: PillarWeights,
  goals: Goal[],
  logs: Logs,
): RecommendedPillar[] {
  const capacity = currentWeeklyCapacity(goals, logs);
  const actual = pillarsWeekOverview(goals, logs);
  const actualById = Object.fromEntries(actual.map((p) => [p.id, p.targetHours]));
  return PILLAR_IDS.map((id) => {
    const weightPct = weights[id] ?? 0;
    const recommendedHours = (capacity * weightPct) / 100;
    const actualHours = actualById[id] || 0;
    return {
      id,
      weightPct,
      recommendedHours,
      actualHours,
      deltaHours: recommendedHours - actualHours,
    };
  });
}

/** Trụ cột nào đang được xem là "ưu tiên cốt lõi" theo trọng số định hướng. */
export function isCorePillar(pillar: PillarId, weights: PillarWeights): boolean {
  const max = Math.max(...PILLAR_IDS.map((id) => weights[id] ?? 0));
  return weights[pillar] >= 30 || (weights[pillar] === max && max > 0);
}

/** Một mục tiêu hằng ngày có phải ưu tiên cốt lõi không — AI gắn trực tiếp theo id,
 *  hoặc suy ra từ trọng số trụ cột nếu goal đó chưa được AI đánh giá. */
export function isCoreFocusGoal(
  goal: Goal,
  identity: IdentityProfile | null,
): boolean {
  if (!identity) return false;
  if (identity.coreGoalIds.includes(goal.id)) return true;
  if (identity.coreGoalIds.length > 0) return false; // đã có đánh giá rõ ràng từ AI
  return isCorePillar(goal.category, identity.pillarWeights);
}

export function priorityScore(
  goal: Goal,
  identity: IdentityProfile | null,
): "high" | "medium" | "low" {
  if (!identity) return "medium";
  if (isCoreFocusGoal(goal, identity)) return "high";
  const w = identity.pillarWeights[goal.category] ?? 25;
  return w < 15 ? "low" : "medium";
}
