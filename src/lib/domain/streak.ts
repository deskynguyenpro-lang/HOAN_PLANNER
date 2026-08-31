import type { Goal, Logs } from "./types";
import { addDays, parseKey, toKey } from "./dates";
import { dayStatsFromBlocks } from "./stats";

export function computeStreak(goals: Goal[], logs: Logs, threshold = 70): number {
  let streak = 0;
  let cursor = new Date();

  // Hôm nay chỉ tính vào streak khi đã đạt ngưỡng — ngày dở dang không được
  // xoá sổ một streak thật xây từ các ngày trước.
  const t = dayStatsFromBlocks(toKey(cursor), goals, logs);
  if (t.hasData && t.pct !== null && t.pct >= threshold) streak += 1;
  cursor = addDays(cursor, -1);

  while (true) {
    const st = dayStatsFromBlocks(toKey(cursor), goals, logs);
    if (st.hasData && st.pct !== null && st.pct >= threshold) {
      streak += 1;
      cursor = addDays(cursor, -1);
    } else break;
  }
  return streak;
}

export function longestStreak(goals: Goal[], logs: Logs, threshold = 70): number {
  const keys = Object.keys(logs);
  if (!keys.length) return 0;
  const first = keys.map(parseKey).sort((a, b) => a.getTime() - b.getTime())[0];
  let longest = 0;
  let current = 0;
  let cursor = first;
  const end = new Date();
  while (cursor <= end) {
    const s = dayStatsFromBlocks(toKey(cursor), goals, logs);
    if (s.hasData && s.pct !== null && s.pct >= threshold) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
    cursor = addDays(cursor, 1);
  }
  return longest;
}
