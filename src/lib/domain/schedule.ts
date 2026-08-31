import type { Block, Goal, Logs, Schedule } from "./types";
import { parseKey } from "./dates";

export function dayBlocks(dateKey: string, logs: Logs): Block[] {
  return logs[dateKey]?.blocks ?? [];
}

/**
 * Lịch lặp hiệu lực của một mục tiêu. Mục tiêu cũ chưa có schedule sẽ dùng
 * mặc định hợp lý để vẫn hiện trên timeline.
 */
export function effectiveSchedule(g: Goal): Schedule {
  const s = g.schedule;
  if (s && s.days && s.days.length) {
    return {
      start: s.start ?? 8,
      duration: s.duration ?? (g.target || 1),
      days: s.days,
      fromDate: s.fromDate || g.createdAt || "0000-01-01",
      toDate: s.toDate || "",
    };
  }
  return {
    start: 8,
    duration: g.target || 1,
    days: [0, 1, 2, 3, 4, 5, 6],
    fromDate: g.createdAt || "0000-01-01",
    toDate: "",
  };
}

/**
 * Khối hiệu lực của một ngày = khối đã lưu + khối "ảo" sinh ra từ lịch lặp
 * của từng mục tiêu (nếu mục tiêu lặp vào thứ đó và chưa được hiện thực hoá).
 */
export function getEffectiveBlocks(
  dateKey: string,
  goals: Goal[],
  logs: Logs,
): Block[] {
  const stored = dayBlocks(dateKey, logs);
  const storedGoalIds = new Set(stored.map((b) => b.goalId));
  const weekday = parseKey(dateKey).getDay();
  const virtual: Block[] = [];

  goals.forEach((g) => {
    if (g.archived) return;
    const sch = effectiveSchedule(g);
    if (dateKey < sch.fromDate) return;
    if (sch.toDate && dateKey > sch.toDate) return;
    if (!sch.days.includes(weekday)) return;
    if (storedGoalIds.has(g.id)) return;
    virtual.push({
      id: `v_${g.id}_${dateKey}`,
      goalId: g.id,
      start: sch.start,
      duration: sch.duration,
      completed: false,
      skipped: false,
      reason: "",
      virtual: true,
    });
  });

  return [...stored, ...virtual];
}

/**
 * Ghi một thay đổi cho 1 khối vào logs. Khối ảo sẽ được hiện thực hoá thành
 * khối thật cho đúng ngày đó, không ảnh hưởng ngày khác.
 */
export function materializeAndUpdate(
  dateKey: string,
  blockId: string,
  blocks: Block[],
  logs: Logs,
  patch: Partial<Block>,
): Logs {
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return logs;
  const stored = dayBlocks(dateKey, logs);
  const idx = stored.findIndex((b) => b.id === blockId);
  let nextStored: Block[];
  if (idx >= 0) {
    nextStored = stored.map((b, i) => (i === idx ? { ...b, ...patch } : b));
  } else {
    nextStored = [
      ...stored,
      {
        ...block,
        id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        virtual: false,
        ...patch,
      },
    ];
  }
  return { ...logs, [dateKey]: { blocks: nextStored } };
}

/** Chia các khối chồng giờ thành nhiều cột cạnh nhau để không che nhau. */
export function layoutDayBlocks(blocks: Block[]) {
  const sorted = [...blocks].sort(
    (a, b) => a.start - b.start || a.duration - b.duration,
  );
  const clusters: Block[][] = [];
  let current: Block[] = [];
  let currentEnd = -Infinity;
  sorted.forEach((b) => {
    const end = b.start + b.duration;
    if (current.length === 0 || b.start < currentEnd) {
      current.push(b);
      currentEnd = Math.max(currentEnd, end);
    } else {
      clusters.push(current);
      current = [b];
      currentEnd = end;
    }
  });
  if (current.length) clusters.push(current);

  const placed: { block: Block; col: number; totalCols: number }[] = [];
  clusters.forEach((cluster) => {
    const colEnds: number[] = [];
    const start = placed.length;
    cluster.forEach((b) => {
      const end = b.start + b.duration;
      let col = colEnds.findIndex((ce) => ce <= b.start);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(end);
      } else {
        colEnds[col] = end;
      }
      placed.push({ block: b, col, totalCols: 1 });
    });
    for (let i = start; i < placed.length; i++) placed[i].totalCols = colEnds.length;
  });
  return placed;
}
