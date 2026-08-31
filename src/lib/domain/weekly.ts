import type {
  DriftAlert,
  Goal,
  Logs,
  Objective,
  PillarId,
  WeeklyMetrics,
} from "./types";
import { addDays, parseKey, startOfWeek, toKey, WEEKDAYS_VI } from "./dates";
import { PILLARS, PILLAR_IDS, pillarOf } from "./pillars";
import { effectiveSchedule, getEffectiveBlocks } from "./schedule";
import { dayStatsFromBlocks, objectiveProgress } from "./stats";
import { computeStreak, longestStreak } from "./streak";

const emptyPerPillar = () =>
  Object.fromEntries(
    PILLAR_IDS.map((id) => [
      id,
      { hours: 0, prevHours: 0, deltaPct: 0, adherence: null as number | null },
    ]),
  ) as WeeklyMetrics["perPillar"];

/** Giờ hoàn thành + số buổi (kế hoạch / hoàn thành) của 1 tuần, tách theo trụ cột. */
function weekAggregate(goals: Goal[], logs: Logs, weekStartKey: string) {
  const goalPillar: Record<string, PillarId> = {};
  goals.forEach((g) => (goalPillar[g.id] = g.category));
  const start = parseKey(weekStartKey);

  let completedHours = 0;
  let plannedSessions = 0;
  let completedSessions = 0;
  const hoursByPillar: Record<string, number> = {};
  const plannedByPillar: Record<string, number> = {};
  const doneByPillar: Record<string, number> = {};

  for (let i = 0; i < 7; i++) {
    const dk = toKey(addDays(start, i));
    const blocks = getEffectiveBlocks(dk, goals, logs).filter((b) => !b.hidden);
    blocks.forEach((b) => {
      const p = goalPillar[b.goalId] || "research";
      plannedSessions += 1;
      plannedByPillar[p] = (plannedByPillar[p] || 0) + 1;
      if (b.completed) {
        completedHours += b.duration;
        completedSessions += 1;
        hoursByPillar[p] = (hoursByPillar[p] || 0) + b.duration;
        doneByPillar[p] = (doneByPillar[p] || 0) + 1;
      }
    });
  }

  return {
    completedHours,
    plannedSessions,
    completedSessions,
    hoursByPillar,
    plannedByPillar,
    doneByPillar,
  };
}

export function computeWeeklyMetrics(
  goals: Goal[],
  logs: Logs,
  weekStartKey: string,
): WeeklyMetrics {
  const cur = weekAggregate(goals, logs, weekStartKey);
  const prevKey = toKey(addDays(parseKey(weekStartKey), -7));
  const prev = weekAggregate(goals, logs, prevKey);

  const adherence =
    cur.plannedSessions > 0
      ? Math.round((cur.completedSessions / cur.plannedSessions) * 100)
      : null;

  const deltaHoursPct =
    prev.completedHours > 0
      ? Math.round(
          ((cur.completedHours - prev.completedHours) / prev.completedHours) * 100,
        )
      : cur.completedHours > 0
        ? 100
        : 0;

  const perPillar = emptyPerPillar();
  PILLAR_IDS.forEach((id) => {
    const hours = cur.hoursByPillar[id] || 0;
    const prevHours = prev.hoursByPillar[id] || 0;
    const planned = cur.plannedByPillar[id] || 0;
    const done = cur.doneByPillar[id] || 0;
    perPillar[id] = {
      hours,
      prevHours,
      deltaPct:
        prevHours > 0
          ? Math.round(((hours - prevHours) / prevHours) * 100)
          : hours > 0
            ? 100
            : 0,
      adherence: planned > 0 ? Math.round((done / planned) * 100) : null,
    };
  });

  // Ngày tốt / kém nhất trong tuần
  const start = parseKey(weekStartKey);
  let best: WeeklyMetrics["bestDay"] = null;
  let worst: WeeklyMetrics["worstDay"] = null;
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    const s = dayStatsFromBlocks(toKey(d), goals, logs);
    if (!s.hasData || s.pct === null) continue;
    const label = WEEKDAYS_VI[d.getDay()];
    if (!best || s.pct > best.pct) best = { label, pct: s.pct };
    if (!worst || s.pct < worst.pct) worst = { label, pct: s.pct };
  }

  // Lý do bỏ lỡ trong tuần
  const reasonCounts: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const dk = toKey(addDays(start, i));
    (logs[dk]?.blocks || []).forEach((b) => {
      if (b.skipped && b.reason)
        reasonCounts[b.reason] = (reasonCounts[b.reason] || 0) + 1;
    });
  }
  const topReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Điểm tổng hợp của tuần
  const weeklyTargetHours = goals
    .filter((g) => !g.archived)
    .reduce((s, g) => {
      const sch = effectiveSchedule(g);
      const daysInWeek = sch.days.length;
      return s + g.target * daysInWeek;
    }, 0);
  const volumePart =
    weeklyTargetHours > 0
      ? Math.min(100, (cur.completedHours / weeklyTargetHours) * 100)
      : 0;
  const pillarsPlanned = PILLAR_IDS.filter((id) => (cur.plannedByPillar[id] || 0) > 0);
  const pillarsHit = pillarsPlanned.filter((id) => (cur.hoursByPillar[id] || 0) > 0);
  const balancePart = pillarsPlanned.length
    ? (pillarsHit.length / pillarsPlanned.length) * 100
    : 0;
  const score = Math.round(
    0.55 * (adherence ?? 0) + 0.25 * volumePart + 0.2 * balancePart,
  );

  return {
    weekStart: weekStartKey,
    adherence,
    completedHours: cur.completedHours,
    prevCompletedHours: prev.completedHours,
    deltaHoursPct,
    perPillar,
    bestDay: best,
    worstDay: worst,
    topReasons,
    sessions: cur.completedSessions,
    score,
  };
}

/** Dữ liệu "dải quỹ đạo" — N tuần gần nhất: giờ theo trụ cột + tỷ lệ bám kế hoạch. */
export function trajectoryData(goals: Goal[], logs: Logs, weeks = 12) {
  const thisMonday = startOfWeek(new Date());
  const rows: {
    weekStart: string;
    label: string;
    adherence: number | null;
    work: number;
    study: number;
    health: number;
    research: number;
    total: number;
  }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = toKey(addDays(thisMonday, -7 * i));
    const agg = weekAggregate(goals, logs, ws);
    const d = parseKey(ws);
    rows.push({
      weekStart: ws,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      adherence:
        agg.plannedSessions > 0
          ? Math.round((agg.completedSessions / agg.plannedSessions) * 100)
          : null,
      work: agg.hoursByPillar.work || 0,
      study: agg.hoursByPillar.study || 0,
      health: agg.hoursByPillar.health || 0,
      research: agg.hoursByPillar.research || 0,
      total: agg.completedHours,
    });
  }
  return rows;
}

/** Cảnh báo lệch hướng — hiện ngay trên trang Tổng quan. */
export function computeDriftAlerts(
  goals: Goal[],
  logs: Logs,
  objectives: Objective[],
): DriftAlert[] {
  const alerts: DriftAlert[] = [];
  const today = new Date();
  const from = addDays(today, -6);

  // 1. Trụ cột bị bỏ bê 7 ngày qua
  PILLARS.forEach((p) => {
    const activeGoals = goals.filter((g) => !g.archived && g.category === p.id);
    if (!activeGoals.length) return;
    let planned = 0;
    let doneHours = 0;
    for (let i = 0; i < 7; i++) {
      const dk = toKey(addDays(from, i));
      getEffectiveBlocks(dk, goals, logs)
        .filter((b) => !b.hidden)
        .forEach((b) => {
          const g = goals.find((x) => x.id === b.goalId);
          if (!g || g.category !== p.id) return;
          planned += b.duration;
          if (b.completed) doneHours += b.duration;
        });
    }
    if (planned <= 0) return;
    const ratio = doneHours / planned;
    if (ratio === 0) {
      alerts.push({
        id: `neglect-${p.id}`,
        kind: "pillar-neglected",
        severity: "bad",
        pillar: p.id,
        title: `${p.label}: chưa có buổi nào hoàn thành trong 7 ngày`,
        detail: `Bạn đã lên ${Math.round(planned * 10) / 10} giờ cho ${p.label} tuần này nhưng chưa hoàn thành buổi nào. Chọn 1 buổi ngắn 25–45 phút để khởi động lại.`,
      });
    } else if (ratio < 0.3) {
      alerts.push({
        id: `neglect-${p.id}`,
        kind: "pillar-neglected",
        severity: "warn",
        pillar: p.id,
        title: `${p.label} đang tụt: mới đạt ${Math.round(ratio * 100)}% kế hoạch tuần`,
        detail: `Chỉ ${Math.round(doneHours * 10) / 10}/${Math.round(planned * 10) / 10} giờ đã hoàn thành. Ưu tiên trả nợ trụ cột này trong 2 ngày tới.`,
      });
    }
  });

  // 2. Mục tiêu lớn chậm so với nhịp cần thiết để kịp hạn
  objectives
    .filter((o) => !o.archived && o.deadline)
    .forEach((o) => {
      const prog = objectiveProgress(o);
      if (prog.daysLeft === null) return;
      const created = o.checkins?.length
        ? [...o.checkins].sort((a, b) => (a.date < b.date ? -1 : 1))[0].date
        : null;
      const totalDays = created
        ? Math.max(
            1,
            Math.round(
              (parseKey(o.deadline).getTime() - parseKey(created).getTime()) /
                86400000,
            ),
          )
        : null;
      if (!totalDays || prog.daysLeft < 0) {
        if (prog.daysLeft !== null && prog.daysLeft < 0 && prog.pct < 100) {
          alerts.push({
            id: `obj-${o.id}`,
            kind: "objective-behind",
            severity: "bad",
            title: `"${o.name}" đã quá hạn, mới đạt ${prog.pct}%`,
            detail: `Cần dời hạn mới hoặc điều chỉnh mục tiêu cho thực tế, rồi phân bổ lại giờ hằng ngày.`,
          });
        }
        return;
      }
      const timeElapsedPct = Math.round(
        ((totalDays - prog.daysLeft) / totalDays) * 100,
      );
      const gap = timeElapsedPct - prog.pct;
      if (gap >= 30) {
        alerts.push({
          id: `obj-${o.id}`,
          kind: "objective-behind",
          severity: "bad",
          title: `"${o.name}" chậm ${gap} điểm so với tiến độ cần có`,
          detail: `Đã đi hết ${timeElapsedPct}% thời gian nhưng mới đạt ${prog.pct}%. Còn ${prog.daysLeft} ngày — tăng giờ cho các mục tiêu gắn với "${o.name}".`,
        });
      } else if (gap >= 15) {
        alerts.push({
          id: `obj-${o.id}`,
          kind: "objective-behind",
          severity: "warn",
          title: `"${o.name}" đang chậm nhịp nhẹ`,
          detail: `Tiến độ ${prog.pct}% / thời gian ${timeElapsedPct}%. Còn ${prog.daysLeft} ngày để bắt kịp.`,
        });
      }
    });

  // 3. Tỷ lệ bám kế hoạch tuần này thấp
  const wk = computeWeeklyMetrics(goals, logs, toKey(startOfWeek(today)));
  if (wk.adherence !== null && wk.adherence < 50) {
    alerts.push({
      id: "adherence",
      kind: "low-adherence",
      severity: wk.adherence < 30 ? "bad" : "warn",
      title: `Tuần này mới bám kế hoạch ${wk.adherence}%`,
      detail: `Nếu kế hoạch đang quá tải, hãy giảm bớt số buổi hoặc rút ngắn thời lượng để dễ giữ nhịp hơn.`,
    });
  }

  // 4. Vừa đứt một streak dài
  const cur = computeStreak(goals, logs);
  const best = longestStreak(goals, logs);
  const yStats = dayStatsFromBlocks(toKey(addDays(today, -1)), goals, logs);
  if (cur === 0 && best >= 5 && yStats.hasData) {
    alerts.push({
      id: "streak",
      kind: "streak-broken",
      severity: "warn",
      title: `Streak vừa đứt (kỷ lục ${best} ngày)`,
      detail: `Hoàn thành ≥70% kế hoạch hôm nay để bắt đầu chuỗi mới ngay.`,
    });
  }

  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "bad" ? -1 : 1));
}

export function scoreLabel(score: number): { text: string; tone: "good" | "warn" | "bad" } {
  if (score >= 80) return { text: "Xuất sắc", tone: "good" };
  if (score >= 65) return { text: "Tốt", tone: "good" };
  if (score >= 45) return { text: "Trung bình", tone: "warn" };
  return { text: "Cần cải thiện", tone: "bad" };
}

export { pillarOf };
