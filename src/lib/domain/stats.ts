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

/** % tiến độ (0-100) của 1 giá trị cụ thể theo hướng tăng/giảm của mục tiêu. */
function pctForValue(obj: Objective, value: number): number {
  const direction = obj.targetValue >= obj.startValue ? 1 : -1;
  const range = Math.abs(obj.targetValue - obj.startValue) || 1;
  const raw = direction === 1 ? value - obj.startValue : obj.startValue - value;
  return Math.max(0, Math.min(100, Math.round((raw / range) * 100)));
}

export interface PredictiveVelocityPoint {
  date: string;
  planned: number | null;
  actual: number | null;
  projected: number | null;
}

export interface PredictiveVelocity {
  objectiveId: string;
  objectiveName: string;
  hasEnoughData: boolean;
  currentPct: number;
  /** % tiến độ đạt được mỗi ngày, tính theo `historicalDays` ngày gần nhất (rolling window). */
  actualCompletionRatePctPerDay: number;
  deadline: string | null;
  /** 'YYYY-MM-DD' — null nếu chưa đủ dữ liệu hoặc không có deadline để so sánh. */
  predictedCompletionDate: string | null;
  /** > 0 = dự kiến trễ so với deadline, <= 0 = đúng hoặc sớm hạn. */
  lateDays: number | null;
  chartSeries: PredictiveVelocityPoint[];
}

/**
 * Dự báo tiến độ 1 mục tiêu lớn ("Goal" trong yêu cầu gốc — Objective trong
 * app này, vì đây là thực thể có deadline + check-in thật) dựa trên tốc độ
 * tiến bộ THỰC TẾ trong `historicalDays` ngày gần nhất (rolling window,
 * không lấy trung bình từ lúc tạo — phản ánh đúng nhịp gần đây hơn).
 */
export function calculatePredictiveVelocity(
  objective: Objective,
  historicalDays = 30,
  now: Date = new Date(),
): PredictiveVelocity {
  const { current, sorted, daysLeft } = objectiveProgress(objective);
  const currentPct = pctForValue(objective, current);
  const todayStr = toKey(now);
  // Chuẩn hoá về đúng nửa đêm (bỏ giờ:phút:giây của `now`) trước khi so sánh
  // với ngày check-in (parseKey luôn trả về mốc nửa đêm) — nếu không, check-in
  // đúng ngày biên có thể bị loại sai chỉ vì `now` không phải nửa đêm.
  const windowStart = parseKey(toKey(addDays(now, -historicalDays)));

  const base: PredictiveVelocity = {
    objectiveId: objective.id,
    objectiveName: objective.name,
    hasEnoughData: false,
    currentPct,
    actualCompletionRatePctPerDay: 0,
    deadline: objective.deadline || null,
    predictedCompletionDate: null,
    lateDays: null,
    chartSeries: [],
  };

  const inWindow = sorted.filter((c) => parseKey(c.date) >= windowStart);
  // Cần >= 2 điểm để tính tốc độ; nếu window gần chưa đủ, dùng toàn bộ lịch sử thay thế.
  const usable = inWindow.length >= 2 ? inWindow : sorted;
  if (usable.length < 2) return base;

  const first = usable[0];
  const last = usable[usable.length - 1];
  const daysElapsed = (parseKey(last.date).getTime() - parseKey(first.date).getTime()) / 86400000;
  if (daysElapsed <= 0) return base;

  const direction = objective.targetValue >= objective.startValue ? 1 : -1;
  const progressSoFar = direction === 1 ? last.value - first.value : first.value - last.value;
  const ratePerDay = progressSoFar / daysElapsed; // đơn vị gốc/ngày, luôn dương khi đang tiến bộ
  // Giá trị gốc thay đổi theo `direction` mỗi ngày (VD: giảm cân thì giá trị
  // giảm khi tiến bộ) — nhân với direction để quy đổi đúng chiều trước khi
  // tính % (nếu cộng thẳng ratePerDay sẽ SAI chiều cho mục tiêu dạng giảm).
  const pctPerDay = pctForValue(objective, first.value + direction * ratePerDay) - pctForValue(objective, first.value);

  const fromDate = parseKey(sorted[0].date);
  const planned = (dateStr: string): number | null => {
    if (!objective.deadline) return null;
    const d = parseKey(dateStr);
    const total = parseKey(objective.deadline).getTime() - fromDate.getTime();
    if (total <= 0) return null;
    return Math.max(0, Math.min(100, ((d.getTime() - fromDate.getTime()) / total) * 100));
  };

  const chartSeries: PredictiveVelocityPoint[] = [
    { date: sorted[0].date, planned: planned(sorted[0].date), actual: pctForValue(objective, sorted[0].value), projected: null },
    ...sorted.slice(1).map((c) => ({
      date: c.date,
      planned: planned(c.date),
      actual: pctForValue(objective, c.value),
      projected: null,
    })),
  ];
  if (sorted[sorted.length - 1].date !== todayStr) {
    chartSeries.push({ date: todayStr, planned: planned(todayStr), actual: currentPct, projected: currentPct });
  } else {
    chartSeries[chartSeries.length - 1].projected = currentPct;
  }

  const remaining = direction === 1 ? objective.targetValue - current : current - objective.targetValue;
  if (remaining <= 0 || ratePerDay === 0) {
    return { ...base, hasEnoughData: true, actualCompletionRatePctPerDay: pctPerDay, chartSeries };
  }

  const daysNeeded = remaining / ratePerDay;
  if (!Number.isFinite(daysNeeded) || daysNeeded < 0) {
    return { ...base, hasEnoughData: true, actualCompletionRatePctPerDay: pctPerDay, chartSeries };
  }
  const predictedDate = addDays(now, Math.ceil(daysNeeded));
  const predictedCompletionDate = toKey(predictedDate);
  const lateDays = daysLeft === null ? null : Math.ceil(daysNeeded - daysLeft);

  if (predictedCompletionDate !== todayStr) {
    chartSeries.push({ date: predictedCompletionDate, planned: planned(predictedCompletionDate), actual: null, projected: 100 });
  }

  return {
    ...base,
    hasEnoughData: true,
    actualCompletionRatePctPerDay: pctPerDay,
    predictedCompletionDate,
    lateDays,
    chartSeries,
  };
}

export interface VelocityAlert {
  objectiveId: string;
  objectiveName: string;
  /** Số ngày dự kiến trễ so với deadline nếu giữ đúng tốc độ hiện tại. */
  projectedLateDays: number;
  message: string;
}

/**
 * Dựa vào tốc độ tiến bộ thực tế giữa các lần check-in gần nhất, dự báo mục
 * tiêu lớn có kịp deadline không — chỉ báo khi có đủ dữ liệu (>=2 check-in,
 * đang có tiến bộ đo được) để tránh cảnh báo sai vì thiếu số liệu.
 */
export function computeVelocityAlerts(objectives: Objective[]): VelocityAlert[] {
  const alerts: VelocityAlert[] = [];
  for (const obj of objectives.filter((o) => !o.archived && o.deadline)) {
    const { current, sorted, daysLeft } = objectiveProgress(obj);
    if (sorted.length < 2 || daysLeft === null || daysLeft <= 0) continue;

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const daysElapsed = (parseKey(last.date).getTime() - parseKey(first.date).getTime()) / 86400000;
    if (daysElapsed <= 0) continue;

    const direction = obj.targetValue >= obj.startValue ? 1 : -1;
    const progressSoFar = direction === 1 ? last.value - first.value : first.value - last.value;
    if (progressSoFar <= 0) continue; // chưa đo được tiến bộ nào — không đủ cơ sở dự báo

    const ratePerDay = progressSoFar / daysElapsed;
    const remaining = direction === 1 ? obj.targetValue - current : current - obj.targetValue;
    if (remaining <= 0) continue; // đã đạt hoặc vượt mục tiêu

    const daysNeeded = remaining / ratePerDay;
    const projectedLateDays = Math.ceil(daysNeeded - daysLeft);
    if (projectedLateDays > 0) {
      alerts.push({
        objectiveId: obj.id,
        objectiveName: obj.name,
        projectedLateDays,
        message: `Với tốc độ hiện tại, mục tiêu "${obj.name}" dự kiến sẽ trễ khoảng ${projectedLateDays} ngày so với mốc đã chọn. Bạn muốn chia nhỏ scope hay tối ưu lại lịch làm việc?`,
      });
    }
  }
  return alerts;
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
      deferCount: 0,
      isBufferBlock: false,
    }));
    next[tgtKey] = { blocks: copied };
  }
  return next;
}
