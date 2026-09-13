/**
 * Thiết lập chung của người dùng, lưu trong settings.data (jsonb) — cùng bảng
 * "settings" đã dùng cho định hướng (xem lib/data/identity-store.ts), dưới
 * khoá riêng "bufferCapacityPct" để không đụng tới các khoá khác.
 */
export const DEFAULT_BUFFER_CAPACITY_PCT = 20;
export const MIN_BUFFER_CAPACITY_PCT = 0;
export const MAX_BUFFER_CAPACITY_PCT = 50;

export function clampBufferCapacityPct(pct: number): number {
  if (!Number.isFinite(pct)) return DEFAULT_BUFFER_CAPACITY_PCT;
  return Math.min(MAX_BUFFER_CAPACITY_PCT, Math.max(MIN_BUFFER_CAPACITY_PCT, Math.round(pct)));
}
