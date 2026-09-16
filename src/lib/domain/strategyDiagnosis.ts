import type { Goal, Logs, Objective } from "./types";
import { addDays, toKey } from "./dates";
import { getEffectiveBlocks } from "./schedule";
import { objectiveProgress } from "./stats";

/**
 * So sánh "bám lịch" (Task Completion — % buổi đã hoàn thành so với kế
 * hoạch) với "kết quả" (Goal Progress — % tiến độ thật của mục tiêu lớn) để
 * phân biệt 2 vấn đề khác nhau: làm đúng lịch nhưng SAI VIỆC (chiến thuật),
 * hay ĐÚNG VIỆC nhưng không theo được lịch (thực thi).
 */
export type StrategyVerdict = "STRATEGY_PROBLEM" | "EXECUTION_FRICTION" | "ON_TRACK" | "NOT_ENOUGH_DATA";

export interface StrategyDiagnosis {
  objectiveId: string;
  objectiveName: string;
  taskCompletionPct: number;
  goalProgressPct: number;
  verdict: StrategyVerdict;
  message: string;
}

function taskCompletionRate(
  goalIds: string[],
  goals: Goal[],
  logs: Logs,
  fromDate: Date,
  toDate: Date,
): number | null {
  let planned = 0;
  let completed = 0;
  let hasAny = false;
  for (let d = new Date(fromDate); d <= toDate; d = addDays(d, 1)) {
    const dk = toKey(d);
    const blocks = getEffectiveBlocks(dk, goals, logs).filter((b) => !b.hidden && goalIds.includes(b.goalId));
    blocks.forEach((b) => {
      hasAny = true;
      planned += b.duration;
      if (b.completed) completed += b.duration;
    });
  }
  if (!hasAny || planned <= 0) return null;
  return Math.round((completed / planned) * 100);
}

export function diagnoseStrategyVsExecution(
  objective: Objective,
  goals: Goal[],
  logs: Logs,
  historicalDays = 30,
  now: Date = new Date(),
): StrategyDiagnosis {
  const linkedIds = goals.filter((g) => g.objectiveId === objective.id).map((g) => g.id);
  const goalProgressPct = objectiveProgress(objective).pct;
  const base = { objectiveId: objective.id, objectiveName: objective.name, goalProgressPct };

  if (linkedIds.length === 0) {
    return {
      ...base,
      taskCompletionPct: 0,
      verdict: "NOT_ENOUGH_DATA",
      message: `Chưa có mục tiêu hằng ngày nào gắn với "${objective.name}" để đánh giá bám lịch.`,
    };
  }

  const taskCompletionPct = taskCompletionRate(
    linkedIds,
    goals,
    logs,
    addDays(now, -(historicalDays - 1)),
    now,
  );
  if (taskCompletionPct === null) {
    return {
      ...base,
      taskCompletionPct: 0,
      verdict: "NOT_ENOUGH_DATA",
      message: `Chưa có đủ dữ liệu ${historicalDays} ngày gần đây để đánh giá "${objective.name}".`,
    };
  }

  if (taskCompletionPct > 80 && goalProgressPct < 30) {
    return {
      ...base,
      taskCompletionPct,
      verdict: "STRATEGY_PROBLEM",
      message: `Bạn bám lịch rất tốt (${taskCompletionPct}% buổi hoàn thành) nhưng "${objective.name}" mới tiến ${goalProgressPct}% — kế hoạch hiện tại có thể chưa tạo ra đúng kết quả, nên xem lại cách làm thay vì cố thêm giờ.`,
    };
  }
  if (taskCompletionPct < 50) {
    return {
      ...base,
      taskCompletionPct,
      verdict: "EXECUTION_FRICTION",
      message: `Chỉ mới hoàn thành ${taskCompletionPct}% các buổi đã lên kế hoạch cho "${objective.name}" — có thể lịch đang quá tải hoặc task quá rộng, cân nhắc giảm tải hoặc chia nhỏ việc.`,
    };
  }
  return {
    ...base,
    taskCompletionPct,
    verdict: "ON_TRACK",
    message: `"${objective.name}" đang đi đúng hướng — bám lịch ${taskCompletionPct}%, tiến độ ${goalProgressPct}%.`,
  };
}
