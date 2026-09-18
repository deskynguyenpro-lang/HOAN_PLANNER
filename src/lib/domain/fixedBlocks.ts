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

/**
 * Ngoại lệ cho ĐÚNG 1 ngày cụ thể của 1 khung giờ cố định — không sửa quy
 * tắc lặp lại chung, chỉ override cho ngày đó. VD: "Chiều nay nghỉ làm" =
 * 1 exception CANCELLED cho block "Công việc trên cty" vào đúng hôm nay,
 * mọi ngày khác vẫn áp dụng quy tắc lặp lại như cũ.
 */
export interface FixedBlockException {
  id: string;
  blockId: string;
  date: string; // 'YYYY-MM-DD'
  status: "CANCELLED" | "MODIFIED";
  /** Chỉ dùng khi status === "MODIFIED" — giờ/độ dài riêng cho đúng ngày này. */
  overrideStart?: number;
  overrideDuration?: number;
}

const EXPAND_DAYS = 14; // đủ dài hơn RESCHEDULE_LOOKAHEAD_DAYS (7 ngày) của reschedule.ts

function pushBusy(map: ExternalBusyMap, dateKey: string, interval: { start: number; end: number }) {
  (map[dateKey] ||= []).push(interval);
}

/** Ngoại lệ (nếu có) áp dụng cho block `blockId` vào đúng ngày `dateKey`. */
function exceptionFor(
  exceptions: FixedBlockException[],
  blockId: string,
  dateKey: string,
): FixedBlockException | undefined {
  return exceptions.find((e) => e.blockId === blockId && e.date === dateKey);
}

/**
 * Trải các khung giờ cố định (lặp lại hằng tuần) thành ExternalBusyMap cho
 * `days` ngày tới — áp dụng `exceptions` (nếu có) để bỏ qua hoặc đổi giờ cho
 * đúng 1 ngày cụ thể mà không ảnh hưởng quy tắc lặp lại chung.
 */
export function expandFixedBlocksToExternalBusy(
  blocks: FixedTimeBlock[],
  now: Date = new Date(),
  days: number = EXPAND_DAYS,
  exceptions: FixedBlockException[] = [],
): ExternalBusyMap {
  const map: ExternalBusyMap = {};
  if (blocks.length === 0) return map;

  for (let i = 0; i < days; i++) {
    const d = addDays(now, i);
    const weekday = d.getDay();
    const prevWeekday = (weekday + 6) % 7;
    const dateKey = toKey(d);
    const prevDateKey = toKey(addDays(d, -1));

    // Khung giờ lặp vào đúng thứ hôm nay -> phần trong ngày hôm nay.
    blocks
      .filter((b) => b.days.includes(weekday))
      .forEach((b) => {
        const ex = exceptionFor(exceptions, b.id, dateKey);
        if (ex?.status === "CANCELLED") return; // nghỉ hẳn ngày này, không chặn giờ nào
        const start = ex?.status === "MODIFIED" && ex.overrideStart !== undefined ? ex.overrideStart : b.start;
        const duration =
          ex?.status === "MODIFIED" && ex.overrideDuration !== undefined ? ex.overrideDuration : b.duration;
        if (duration <= 0) return;
        pushBusy(map, dateKey, { start, end: Math.min(start + duration, 24) });
      });

    // Khung giờ lặp vào hôm qua nhưng kéo qua nửa đêm (VD ca đêm 22:00-06:00)
    // -> phần dư sau 24h đổ sang đầu ngày hôm nay. Exception áp dụng theo
    // ngày BẮT ĐẦU của khung giờ (hôm qua), không phải ngày nhận phần dư.
    blocks
      .filter((b) => b.days.includes(prevWeekday) && b.start + b.duration > 24)
      .forEach((b) => {
        const ex = exceptionFor(exceptions, b.id, prevDateKey);
        if (ex?.status === "CANCELLED") return;
        const start = ex?.status === "MODIFIED" && ex.overrideStart !== undefined ? ex.overrideStart : b.start;
        const duration =
          ex?.status === "MODIFIED" && ex.overrideDuration !== undefined ? ex.overrideDuration : b.duration;
        const end = start + duration;
        if (end <= 24) return;
        pushBusy(map, dateKey, { start: 0, end: end - 24 });
      });
  }
  return map;
}
