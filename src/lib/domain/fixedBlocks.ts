import { addDays, toKey } from "./dates";
import type { ExternalBusyMap } from "./reschedule";

/**
 * Khung giờ cố định tự khai báo (giờ ăn, giờ tan làm, giờ họp cố định, giờ
 * ngủ...) — thay thế đơn giản hơn cho Google Calendar: không cần tài khoản
 * Google, hoạt động cả ở chế độ offline, và người dùng đã biết chính xác
 * giờ này rồi nên không cần đồng bộ từ đâu cả.
 *
 * Không phải Goal: không có pillar, không theo dõi hoàn thành/streak, không
 * tính vào giờ/tuần hay thống kê trụ cột — CHỈ dùng để báo cho AI Rescheduler
 * biết khung giờ nào tuyệt đối không được xếp task vào.
 */
export interface FixedTimeBlock {
  id: string;
  label: string;
  start: number; // giờ thập phân
  duration: number; // giờ
  days: number[]; // 0=CN..6=T7, giống Goal.schedule.days
}

const EXPAND_DAYS = 14; // đủ dài hơn RESCHEDULE_LOOKAHEAD_DAYS (7 ngày) của reschedule.ts

/** Trải các khung giờ cố định (lặp lại hằng tuần) thành ExternalBusyMap cho `days` ngày tới. */
export function expandFixedBlocksToExternalBusy(
  blocks: FixedTimeBlock[],
  now: Date = new Date(),
  days: number = EXPAND_DAYS,
): ExternalBusyMap {
  const map: ExternalBusyMap = {};
  if (blocks.length === 0) return map;

  for (let i = 0; i < days; i++) {
    const d = addDays(now, i);
    const weekday = d.getDay();
    const dateKey = toKey(d);
    const todays = blocks.filter((b) => b.days.includes(weekday));
    if (todays.length === 0) continue;
    map[dateKey] = todays.map((b) => ({ start: b.start, end: b.start + b.duration }));
  }
  return map;
}
