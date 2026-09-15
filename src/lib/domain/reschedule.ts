import type { Block, EnergyLevel, Goal, Logs } from "./types";
import { addDays, toKey } from "./dates";
import { dayBlocks, getEffectiveBlocks, materializeAndUpdate } from "./schedule";
import { currentWeeklyCapacity } from "./identity";
import { deferSeverity } from "./energy";

/**
 * Bộ máy xếp lịch bù cho task bị bỏ lỡ (missed) — thuần hàm, không side-effect,
 * không gọi mạng/AI. "AI" ở đây là một thuật toán ràng buộc (constraint
 * scheduler) chạy tất định, dễ test — không phải một lời gọi LLM, vì việc
 * xếp lịch không cần suy luận ngôn ngữ tự nhiên, chỉ cần đúng quy tắc.
 */

// ─── Ràng buộc & khung giờ mặc định ─────────────────────────────────────
export const SLEEP_WINDOW = { start: 22.5, end: 6 } as const; // 22:30 → 06:00 hôm sau
export const HIGH_FOCUS_WINDOW = { start: 8, end: 11 } as const;
export const LOW_ENERGY_WINDOWS = [
  { start: 16, end: 17.5 },
  { start: 20.5, end: 21.5 },
] as const;
export const MAX_CONTINUOUS_FOCUS_HOURS = 2;
export const MIN_BREAK_HOURS = 0.25; // 15 phút — dưới mức này coi là "liên tục"
export const MISSED_LOOKBACK_DAYS = 7; // quét bỏ lỡ trong 7 ngày gần nhất
export const RESCHEDULE_LOOKAHEAD_DAYS = 7; // tìm chỗ trống trong 7 ngày tới
export const BREAKDOWN_THRESHOLD = 3; // >= số lần hoãn này thì ngừng tự xếp lại

export type AutonomyLevel = 1 | 2 | 3;

export interface MissedBlockRef {
  dateKey: string;
  block: Block;
  goal: Goal;
}

export interface ProposedSchedule {
  dateKey: string;
  start: number;
  duration: number;
  usedBuffer: boolean;
}

export type OverloadOptionId = "A" | "B" | "C" | "D";
export interface OverloadOption {
  id: OverloadOptionId;
  label: string;
  description: string;
}

export const OVERLOAD_OPTIONS: OverloadOption[] = [
  {
    id: "A",
    label: "Bù sang tuần sau",
    description: "Chuyển việc này sang đúng khung giờ tương ứng ở tuần kế tiếp.",
  },
  {
    id: "B",
    label: "Chia nhỏ / giảm thời lượng",
    description: "Giảm quy mô hoặc thời lượng của việc này để dễ xếp vào lịch còn trống.",
  },
  {
    id: "C",
    label: "Tạm hoãn (Pause)",
    description: "Ẩn tạm việc này khỏi lịch trình — không tính là bỏ lỡ nữa.",
  },
  {
    id: "D",
    label: "Tăng giờ làm việc tuần này",
    description: "Chủ động mở rộng ngân sách giờ/tuần cho tuần này (cần bạn xác nhận).",
  },
];

export type RescheduleOutcome =
  | {
      kind: "needs_breakdown";
      missed: MissedBlockRef;
      deferCount: number;
      suggestion: string;
    }
  | {
      kind: "scheduled";
      missed: MissedBlockRef;
      proposed: ProposedSchedule;
      reasoning: string;
    }
  | {
      kind: "overload";
      missed: MissedBlockRef;
      options: OverloadOption[];
      reasoning: string;
    };

export interface DetectAndProcessResult {
  nextLogs: Logs;
  outcomes: RescheduleOutcome[];
}

// ─── Tiện ích khoảng thời gian (đơn vị: giờ thập phân trong 1 ngày) ──────
interface Interval {
  start: number;
  end: number;
}

function intersect(a: Interval, b: Interval): Interval | null {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  return end > start ? { start, end } : null;
}

/** Lấy phần của `base` KHÔNG bị các `holes` che — base và holes đã cùng đơn vị. */
function subtractIntervals(base: Interval[], holes: Interval[]): Interval[] {
  let result = base;
  for (const hole of holes) {
    const next: Interval[] = [];
    for (const seg of result) {
      const ov = intersect(seg, hole);
      if (!ov) {
        next.push(seg);
        continue;
      }
      if (ov.start > seg.start) next.push({ start: seg.start, end: ov.start });
      if (ov.end < seg.end) next.push({ start: ov.end, end: seg.end });
    }
    result = next;
  }
  return result.filter((s) => s.end - s.start > 1e-6);
}

function fitsAwakeWindow(start: number, duration: number): boolean {
  return start >= SLEEP_WINDOW.end && start + duration <= SLEEP_WINDOW.start;
}

function energyWindowsFor(level: EnergyLevel): readonly Interval[] {
  if (level === "HIGH_FOCUS") return [HIGH_FOCUS_WINDOW];
  if (level === "LOW_ENERGY" || level === "ADMIN") return LOW_ENERGY_WINDOWS;
  return [{ start: SLEEP_WINDOW.end, end: SLEEP_WINDOW.start }]; // MEDIUM: bất kỳ giờ thức
}

/** Slot rảnh trong 1 ngày, có đánh dấu phần nào thuộc buffer block đã đặt sẵn. */
interface FreeSlot extends Interval {
  isBuffer: boolean;
}

function freeSlotsForDay(dateKey: string, goals: Goal[], logs: Logs, excludeBlockId?: string): FreeSlot[] {
  const all = getEffectiveBlocks(dateKey, goals, logs).filter(
    (b) => !b.hidden && b.id !== excludeBlockId,
  );
  const fixed = all.filter((b) => !b.skipped && (!b.isBufferBlock || b.completed));
  const buffers = all.filter((b) => !b.skipped && !b.completed && b.isBufferBlock);

  const dayWindow: Interval = { start: SLEEP_WINDOW.end, end: SLEEP_WINDOW.start };
  const gaps = subtractIntervals(
    [dayWindow],
    fixed.map((b) => ({ start: b.start, end: b.start + b.duration })),
  );

  const slots: FreeSlot[] = [];
  for (const g of gaps) {
    const overlaps = buffers
      .map((b) => intersect(g, { start: b.start, end: b.start + b.duration }))
      .filter((x): x is Interval => !!x)
      .sort((a, b) => a.start - b.start);

    let cursor = g.start;
    for (const ov of overlaps) {
      if (ov.start > cursor) slots.push({ start: cursor, end: ov.start, isBuffer: false });
      slots.push({ start: ov.start, end: ov.end, isBuffer: true });
      cursor = ov.end;
    }
    if (cursor < g.end) slots.push({ start: cursor, end: g.end, isBuffer: false });
  }
  return slots;
}

/** Tổng giờ đang lên lịch trong ngày (để kiểm tra ràng buộc "không quá 2h liên tục"). */
function busyIntervalsForDay(dateKey: string, goals: Goal[], logs: Logs, excludeBlockId?: string): Interval[] {
  return getEffectiveBlocks(dateKey, goals, logs)
    .filter((b) => !b.hidden && !b.skipped && b.id !== excludeBlockId && !b.isBufferBlock)
    .map((b) => ({ start: b.start, end: b.start + b.duration }))
    .sort((a, b) => a.start - b.start);
}

/** Gộp các khoảng cách nhau dưới MIN_BREAK_HOURS thành 1 chuỗi liên tục. */
function mergeClose(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const iv of sorted) {
    const last = merged[merged.length - 1];
    if (last && iv.start - last.end < MIN_BREAK_HOURS) {
      last.end = Math.max(last.end, iv.end);
    } else {
      merged.push({ ...iv });
    }
  }
  return merged;
}

/** Chuỗi thời gian liên tục (gộp các khối cách nhau < MIN_BREAK_HOURS) chứa khoảng `placed`. */
function continuousRunContaining(placed: Interval, existing: Interval[]): Interval {
  const merged = mergeClose([...existing, placed]);
  return merged.find((m) => m.start <= placed.start && m.end >= placed.end) ?? placed;
}

/**
 * Tìm điểm bắt đầu sớm nhất trong `usable` sao cho đặt task vào đó không tạo
 * ra chuỗi liên tục > MAX_CONTINUOUS_FOCUS_HOURS — thử lùi dần qua từng chuỗi
 * bị chặn, không chỉ dừng ở đầu slot.
 */
function findValidStartInSlot(usable: Interval, duration: number, existingBusy: Interval[]): number | null {
  let candidateStart = usable.start;
  while (candidateStart + duration <= usable.end + 1e-9) {
    const placed: Interval = { start: candidateStart, end: candidateStart + duration };
    const run = continuousRunContaining(placed, existingBusy);
    if (run.end - run.start <= MAX_CONTINUOUS_FOCUS_HOURS + 1e-6) return candidateStart;
    candidateStart = run.end + MIN_BREAK_HOURS;
  }
  return null;
}

/** Tổng giờ đã lên lịch (không tính buffer) trong tuần chứa `weekStartKey`. */
function weeklyLoadHours(weekStartDate: Date, goals: Goal[], logs: Logs, excludeBlockId?: string): number {
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const dk = toKey(addDays(weekStartDate, i));
    total += busyIntervalsForDay(dk, goals, logs, excludeBlockId).reduce(
      (s, iv) => s + (iv.end - iv.start),
      0,
    );
  }
  return total;
}

function weekStart(d: Date): Date {
  const day = (d.getDay() + 6) % 7;
  return addDays(d, -day);
}

/**
 * Tìm chỗ trống hợp lệ cho 1 task bị bỏ lỡ, ưu tiên buffer block, đúng khung
 * giờ năng lượng, không vi phạm các rào cản tuyệt đối. Không sửa đổi gì —
 * chỉ trả về đề xuất hoặc null nếu không tìm được.
 */
export function calculateAutoReschedule(
  missed: MissedBlockRef,
  goals: Goal[],
  logs: Logs,
  now: Date = new Date(),
): ProposedSchedule | null {
  const duration = missed.block.duration;
  const energyWindows = energyWindowsFor(missed.block.energyLevel);
  const weeklyMaxHours = currentWeeklyCapacity(goals, logs);

  for (let i = 1; i <= RESCHEDULE_LOOKAHEAD_DAYS; i++) {
    const day = addDays(now, i);
    const dateKey = toKey(day);
    const slots = freeSlotsForDay(dateKey, goals, logs, missed.block.id);
    // Ưu tiên buffer trước (Buffer First), rồi mới đến giờ trống thường.
    const ordered = [...slots.filter((s) => s.isBuffer), ...slots.filter((s) => !s.isBuffer)];

    const existingBusy = busyIntervalsForDay(dateKey, goals, logs, missed.block.id);

    for (const slot of ordered) {
      if (slot.end - slot.start < duration) continue;

      const win = energyWindows.find((w) => intersect(slot, w));
      if (!win) continue;
      const usable = intersect(slot, win);
      if (!usable || usable.end - usable.start < duration) continue;

      const candidateStart = findValidStartInSlot(usable, duration, existingBusy);
      if (candidateStart === null) continue;
      if (!fitsAwakeWindow(candidateStart, duration)) continue;

      const weekLoad = weeklyLoadHours(weekStart(day), goals, logs, missed.block.id);
      if (weekLoad + duration > weeklyMaxHours + 1e-6) continue;

      return {
        dateKey,
        start: candidateStart,
        duration,
        usedBuffer: slot.isBuffer,
      };
    }
  }
  return null;
}

function breakdownSuggestion(): string {
  return "Task này đã bị hoãn 3 lần. Đề xuất chia nhỏ thành các micro-task 15 phút hoặc xem xét loại bỏ nếu không còn phù hợp với mục tiêu.";
}

function reasoningFor(proposed: ProposedSchedule, missed: MissedBlockRef): string {
  const src = proposed.usedBuffer ? "khung giờ dự phòng (buffer)" : "khoảng trống phù hợp";
  return `Đã bỏ lỡ lúc ${missed.dateKey} — xếp lại vào ${src} ngày ${proposed.dateKey}, khớp mức năng lượng ${missed.block.energyLevel}, không vượt quá 2h liên tục và trong ngân sách giờ/tuần.`;
}

/**
 * Quét toàn bộ task bị bỏ lỡ trong MISSED_LOOKBACK_DAYS ngày gần nhất, tăng
 * defer_count cho mỗi task, rồi với mỗi task: nếu đã hoãn >= ngưỡng thì đề
 * xuất chia nhỏ (không tự xếp lại nữa); ngược lại thử xếp bù tự động.
 * Hàm thuần — trả về logs mới + danh sách kết quả, KHÔNG tự lưu ở đâu cả.
 */
export function detectAndProcessMissedTasks(
  goals: Goal[],
  logs: Logs,
  now: Date = new Date(),
): DetectAndProcessResult {
  const goalMap = Object.fromEntries(goals.map((g) => [g.id, g]));
  const todayKeyStr = toKey(now);
  const nowDec = now.getHours() + now.getMinutes() / 60;

  let nextLogs = logs;
  const outcomes: RescheduleOutcome[] = [];

  for (let i = 0; i < MISSED_LOOKBACK_DAYS; i++) {
    const dateKey = toKey(addDays(now, -i));
    const blocksToday = getEffectiveBlocks(dateKey, goals, nextLogs).filter((b) => !b.hidden);

    for (const b of blocksToday) {
      if (b.completed || b.skipped) continue;
      const end = b.start + b.duration;
      const isPastDay = dateKey < todayKeyStr;
      const isPastToday = dateKey === todayKeyStr && end < nowDec;
      if (!isPastDay && !isPastToday) continue;

      const goal = goalMap[b.goalId];
      if (!goal) continue;

      const nextDeferCount = b.deferCount + 1;
      nextLogs = materializeAndUpdate(dateKey, b.id, blocksToday, nextLogs, {
        deferCount: nextDeferCount,
      });
      const updatedBlock: Block = { ...b, deferCount: nextDeferCount };
      const missed: MissedBlockRef = { dateKey, block: updatedBlock, goal };

      if (deferSeverity(nextDeferCount) === "critical") {
        outcomes.push({
          kind: "needs_breakdown",
          missed,
          deferCount: nextDeferCount,
          suggestion: breakdownSuggestion(),
        });
        continue;
      }

      const proposed = calculateAutoReschedule(missed, goals, nextLogs, now);
      if (proposed) {
        outcomes.push({ kind: "scheduled", missed, proposed, reasoning: reasoningFor(proposed, missed) });
      } else {
        outcomes.push({
          kind: "overload",
          missed,
          options: OVERLOAD_OPTIONS,
          reasoning:
            "Không tìm được khung giờ nào trong 7 ngày tới thoả các ràng buộc (giấc ngủ, giờ cố định, tối đa 2h liên tục, ngân sách giờ/tuần).",
        });
      }
    }
  }

  return { nextLogs, outcomes };
}

/** Áp dụng 1 đề xuất "scheduled" vào logs: xoá khối cũ (bị bỏ lỡ), thêm khối mới vào ngày đề xuất. */
export function applyProposedSchedule(
  outcome: Extract<RescheduleOutcome, { kind: "scheduled" }>,
  logs: Logs,
): Logs {
  const { missed, proposed } = outcome;
  const oldDayBlocks = dayBlocks(missed.dateKey, logs).filter((b) => b.id !== missed.block.id);
  const newDayBlocks = dayBlocks(proposed.dateKey, logs);

  const movedBlock: Block = {
    ...missed.block,
    id: missed.block.virtual ? `b_${Date.now()}_moved` : missed.block.id,
    start: proposed.start,
    duration: proposed.duration,
    isBufferBlock: false,
    virtual: false,
  };

  return {
    ...logs,
    [missed.dateKey]: { blocks: oldDayBlocks },
    [proposed.dateKey]: { blocks: [...newDayBlocks, movedBlock] },
  };
}
