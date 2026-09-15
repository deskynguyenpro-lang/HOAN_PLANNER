import type { EnergyLevel, Goal, Logs, Objective } from "./types";
import type { IdentityProfile } from "./identity";
import { timeframeDisplayLabel } from "./identity";
import { toKey } from "./dates";
import { getEffectiveBlocks } from "./schedule";
import { pillarsWeekOverview } from "./weekly";
import { dayStatsFromBlocks, computeVelocityAlerts, type VelocityAlert } from "./stats";
import { pillarOf } from "./pillars";
import { BREAKDOWN_THRESHOLD } from "./reschedule";

/**
 * Bộ tổng hợp bối cảnh đầy đủ (Full Context) cho System Prompt của AI Chat.
 * Nhận dữ liệu người dùng đã tải ở client (goals/logs/objectives/identity)
 * thay vì tự truy vấn DB theo userId — đúng kiến trúc hiện có của dự án:
 * client luôn sở hữu dữ liệu (localStorage hoặc Supabase), server chỉ tính
 * toán trên dữ liệu được gửi kèm (xem lib/domain/reschedule.ts, route
 * /api/identity-strategy). Route /api/ai/chat gọi hàm này với đúng dữ liệu
 * client gửi lên.
 */

export interface TodayTaskContext {
  name: string;
  pillarLabel: string;
  start: number;
  duration: number;
  energyLevel: EnergyLevel;
  deferCount: number;
  status: "done" | "skipped" | "pending";
}

export interface BreakdownCandidate {
  blockId: string;
  dateKey: string;
  taskName: string;
  deferCount: number;
}

export interface UserFullContext {
  identity: {
    vision: string;
    timeframeLabel: string;
    pillarWeights: Record<string, number>;
    focusMode: string;
  } | null;
  today: {
    dateKey: string;
    tasks: TodayTaskContext[];
    planVsActualPct: number | null;
  };
  week: {
    totalPlannedHours: number;
    completedHours: number;
    adherencePct: number | null;
    bufferCapacityPct: number;
    bufferBudgetHours: number;
    bufferRemainingHours: number;
  };
  breakdownCandidates: BreakdownCandidate[];
  velocityAlerts: VelocityAlert[];
}

const BREAKDOWN_SCAN_DAYS = 14;

export function buildUserFullContext(
  goals: Goal[],
  logs: Logs,
  objectives: Objective[],
  identity: IdentityProfile | null,
  bufferCapacityPct: number,
  now: Date = new Date(),
): UserFullContext {
  const goalMap = Object.fromEntries(goals.map((g) => [g.id, g]));
  const todayKey = toKey(now);

  const todayBlocks = getEffectiveBlocks(todayKey, goals, logs).filter((b) => !b.hidden);
  const tasks: TodayTaskContext[] = todayBlocks
    .map((b) => {
      const g = goalMap[b.goalId];
      if (!g) return null;
      return {
        name: g.name,
        pillarLabel: pillarOf(g.category).label,
        start: b.start,
        duration: b.duration,
        energyLevel: b.energyLevel,
        deferCount: b.deferCount,
        status: (b.completed ? "done" : b.skipped ? "skipped" : "pending") as TodayTaskContext["status"],
      };
    })
    .filter((t): t is TodayTaskContext => !!t)
    .sort((a, b) => a.start - b.start);

  const dayStats = dayStatsFromBlocks(todayKey, goals, logs);

  const weekOverview = pillarsWeekOverview(goals, logs);
  const totalPlannedHours = weekOverview.reduce((s, p) => s + p.targetHours, 0);
  const completedHours = weekOverview.reduce((s, p) => s + p.doneHours, 0);
  const adherencePct = totalPlannedHours > 0 ? Math.round((completedHours / totalPlannedHours) * 100) : null;

  const bufferBudgetHours = (totalPlannedHours * bufferCapacityPct) / 100;
  const bufferUsedHours = Object.values(logs).reduce((sum, day) => {
    return (
      sum +
      (day?.blocks || [])
        .filter((b) => b.isBufferBlock && b.completed)
        .reduce((s, b) => s + b.duration, 0)
    );
  }, 0);
  const bufferRemainingHours = Math.max(0, bufferBudgetHours - bufferUsedHours);

  const breakdownCandidates: BreakdownCandidate[] = [];
  for (let i = 0; i < BREAKDOWN_SCAN_DAYS; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dk = toKey(d);
    (logs[dk]?.blocks || []).forEach((b) => {
      if (b.hidden || b.completed || b.deferCount < BREAKDOWN_THRESHOLD) return;
      const g = goalMap[b.goalId];
      breakdownCandidates.push({
        blockId: b.id,
        dateKey: dk,
        taskName: g?.name || "(việc không rõ)",
        deferCount: b.deferCount,
      });
    });
  }

  return {
    identity: identity
      ? {
          vision: identity.vision,
          timeframeLabel: timeframeDisplayLabel(identity),
          pillarWeights: identity.pillarWeights,
          focusMode: identity.focusMode,
        }
      : null,
    today: {
      dateKey: todayKey,
      tasks,
      planVsActualPct: dayStats.pct,
    },
    week: {
      totalPlannedHours,
      completedHours,
      adherencePct,
      bufferCapacityPct,
      bufferBudgetHours,
      bufferRemainingHours,
    },
    breakdownCandidates,
    velocityAlerts: computeVelocityAlerts(objectives),
  };
}

/** Render bối cảnh thành văn bản gọn để nhét vào System Prompt. */
export function formatContextForPrompt(ctx: UserFullContext): string {
  const lines: string[] = [];

  if (ctx.identity) {
    lines.push(`ĐỊNH HƯỚNG: "${ctx.identity.vision || "(chưa mô tả)"}" — mốc ${ctx.identity.timeframeLabel}, chế độ ${ctx.identity.focusMode}.`);
    lines.push(
      `Trọng số 4 trụ cột: ${Object.entries(ctx.identity.pillarWeights)
        .map(([k, v]) => `${k}=${v}%`)
        .join(", ")}.`,
    );
  } else {
    lines.push("ĐỊNH HƯỚNG: người dùng chưa thiết lập.");
  }

  lines.push(`\nHÔM NAY (${ctx.today.dateKey}):`);
  if (ctx.today.tasks.length === 0) {
    lines.push("- Không có việc nào trong lịch trình.");
  } else {
    ctx.today.tasks.forEach((t) => {
      lines.push(
        `- ${t.name} (${t.pillarLabel}, ${t.energyLevel}, ${t.start}h, ${t.duration}h) — trạng thái: ${t.status}${t.deferCount > 0 ? `, đã hoãn ${t.deferCount} lần` : ""}`,
      );
    });
  }
  if (ctx.today.planVsActualPct !== null) {
    lines.push(`Tỷ lệ hoàn thành hôm nay: ${ctx.today.planVsActualPct}%.`);
  }

  lines.push(
    `\nTUẦN NÀY: kế hoạch ${ctx.week.totalPlannedHours.toFixed(1)}h, đã hoàn thành ${ctx.week.completedHours.toFixed(1)}h` +
      (ctx.week.adherencePct !== null ? ` (${ctx.week.adherencePct}%)` : "") +
      `. Ngân sách đệm (buffer) ${ctx.week.bufferCapacityPct}% ~ ${ctx.week.bufferBudgetHours.toFixed(1)}h, còn trống ${ctx.week.bufferRemainingHours.toFixed(1)}h.`,
  );

  if (ctx.breakdownCandidates.length) {
    lines.push(`\nVIỆC ĐÃ HOÃN >= ${BREAKDOWN_THRESHOLD} LẦN (cần gợi ý chia nhỏ):`);
    ctx.breakdownCandidates.forEach((c) => lines.push(`- "${c.taskName}" (hoãn ${c.deferCount} lần)`));
  }

  if (ctx.velocityAlerts.length) {
    lines.push(`\nCẢNH BÁO TỐC ĐỘ (mục tiêu lớn có nguy cơ trễ deadline):`);
    ctx.velocityAlerts.forEach((a) => lines.push(`- ${a.message}`));
  }

  return lines.join("\n");
}
