import type { Goal, Logs, Objective, PillarId } from "./types";
import { addDays, parseKey, toKey } from "./dates";
import { PILLAR_IDS } from "./pillars";
import { getEffectiveBlocks } from "./schedule";

export interface DayStats {
  totalCompleted: number;
  totalPlanned: number;
  totalTarget: number;
  pct: number | null;
  hasData: boolean;
  byGoal: Record<string, number>;
}

export function dayStatsFromBlocks(
  dateKey: string,
  goals: Goal[],
  logs: Logs,
): DayStats {
  const blocks = getEffectiveBlocks(dateKey, goals, logs).filter((b) => !b.hidden);
  const byGoal: Record<string, number> = {};
  let totalCompleted = 0;
  let totalPlanned = 0;
  const scheduledGoalIds = new Set<string>();

  blocks.forEach((b) => {
    scheduledGoalIds.add(b.goalId);
    totalPlanned += b.duration;
    if (b.completed) {
      totalCompleted += b.duration;
      byGoal[b.goalId] = (byGoal[b.goalId] || 0) + b.duration;
    }
  });

  const totalTarget = goals
    .filter((g) => !g.archived && scheduledGoalIds.has(g.id))
    .reduce((s, g) => s + g.target, 0);

  const pct =
    totalTarget > 0
      ? Math.round((totalCompleted / totalTarget) * 100)
      : blocks.length
        ? Math.round((totalCompleted / Math.max(totalPlanned, 0.01)) * 100)
        : null;

  return { byGoal, totalCompleted, totalPlanned, totalTarget, pct, hasData: blocks.length > 0 };
}

export function categoryTotals(
  goals: Goal[],
  logs: Logs,
  fromDate: Date,
  toDate: Date,
): Record<PillarId, number> {
  const totals = Object.fromEntries(PILLAR_IDS.map((id) => [id, 0])) as Record<
    PillarId,
    number
  >;
  const goalCat: Record<string, PillarId> = {};
  goals.forEach((g) => (goalCat[g.id] = g.category));
  Object.entries(logs).forEach(([dk, log]) => {
    const d = parseKey(dk);
    if (d < fromDate || d > toDate) return;
    (log.blocks || []).forEach((b) => {
      if (!b.completed) return;
      const cat = goalCat[b.goalId] || "research";
      totals[cat] = (totals[cat] || 0) + b.duration;
    });
  });
  return totals;
}

export function hoursForGoalsInRange(
  goalIds: string[],
  logs: Logs,
  fromDate: Date,
  toDate: Date,
): number {
  let total = 0;
  Object.entries(logs).forEach(([dk, log]) => {
    const d = parseKey(dk);
    if (d < fromDate || d > toDate) return;
    (log.blocks || []).forEach((b) => {
      if (b.completed && goalIds.includes(b.goalId)) total += b.duration;
    });
  });
  return total;
}

export function objectiveProgress(obj: Objective) {
  const sorted = [...(obj.checkins || [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  const current = sorted.length ? sorted[sorted.length - 1].value : obj.startValue;
  const direction = obj.targetValue >= obj.startValue ? 1 : -1;
  const range = Math.abs(obj.targetValue - obj.startValue) || 1;
  const raw = direction === 1 ? current - obj.startValue : obj.startValue - current;
  const pct = Math.max(0, Math.min(100, Math.round((raw / range) * 100)));
  let daysLeft: number | null = null;
  if (obj.deadline) {
    const d = parseKey(obj.deadline);
    daysLeft = Math.ceil((d.getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
  }
  return { current, pct, sorted, daysLeft };
}

export function copyWeekBlocks(logs: Logs, sourceStart: Date, weeksAhead: number): Logs {
  const targetStart = addDays(sourceStart, 7 * weeksAhead);
  const next: Logs = { ...logs };
  for (let i = 0; i < 7; i++) {
    const srcKey = toKey(addDays(sourceStart, i));
    const tgtKey = toKey(addDays(targetStart, i));
    const srcBlocks = logs[srcKey]?.blocks || [];
    const copied = srcBlocks.map((b, idx) => ({
      ...b,
      id: `b_${Date.now()}_${i}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      completed: false,
      skipped: false,
      reason: "",
    }));
    next[tgtKey] = { blocks: copied };
  }
  return next;
}
