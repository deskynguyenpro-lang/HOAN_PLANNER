import type { Goal, Objective } from "@/lib/domain/types";
import { normalizePillar } from "@/lib/domain/pillars";
import { todayKey } from "@/lib/domain/dates";

// ─── Chuyển đổi giữa hàng trong DB và kiểu dữ liệu trong app ────────────────

export interface GoalRow {
  id: string;
  user_id: string;
  name: string;
  target_hours: number;
  pillar: string;
  objective_id: string | null;
  schedule: Goal["schedule"];
  archived: boolean;
  created_at: string;
}

export interface ObjectiveRow {
  id: string;
  user_id: string;
  name: string;
  unit: string;
  start_value: number;
  target_value: number;
  deadline: string;
  archived: boolean;
}

export interface CheckinRow {
  objective_id: string;
  user_id: string;
  date: string;
  value: number;
}

export const goalToRow = (g: Goal, userId: string): GoalRow => ({
  id: g.id,
  user_id: userId,
  name: g.name,
  target_hours: g.target,
  pillar: normalizePillar(g.category),
  objective_id: g.objectiveId,
  schedule: g.schedule,
  archived: !!g.archived,
  created_at: g.createdAt || todayKey(),
});

export const rowToGoal = (r: GoalRow): Goal => ({
  id: r.id,
  name: r.name,
  target: r.target_hours,
  category: normalizePillar(r.pillar),
  objectiveId: r.objective_id,
  schedule: (r.schedule as Goal["schedule"]) || {
    start: 8,
    duration: r.target_hours || 1,
    days: [0, 1, 2, 3, 4, 5, 6],
    fromDate: r.created_at || todayKey(),
    toDate: "",
  },
  createdAt: r.created_at || todayKey(),
  archived: !!r.archived,
});

export const objectiveToRow = (o: Objective, userId: string): ObjectiveRow => ({
  id: o.id,
  user_id: userId,
  name: o.name,
  unit: o.unit || "",
  start_value: Number(o.startValue) || 0,
  target_value: Number(o.targetValue) || 0,
  deadline: o.deadline || "",
  archived: !!o.archived,
});

export const rowToObjective = (
  r: ObjectiveRow,
  checkins: CheckinRow[],
): Objective => ({
  id: r.id,
  name: r.name,
  unit: r.unit || "",
  startValue: r.start_value,
  targetValue: r.target_value,
  deadline: r.deadline || "",
  archived: !!r.archived,
  checkins: checkins
    .filter((c) => c.objective_id === r.id)
    .map((c) => ({ date: c.date, value: c.value }))
    .sort((a, b) => (a.date < b.date ? -1 : 1)),
});
