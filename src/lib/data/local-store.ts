import type { AppData } from "@/lib/domain/types";
import { normalizePillar } from "@/lib/domain/pillars";

/**
 * Lưu trữ cục bộ (localStorage) — dùng khi CHƯA cấu hình Supabase.
 * Cho phép chạy thử toàn bộ app không cần máy chủ; cũng là lớp dự phòng.
 */
const KEY = "khpt:data:v1";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && !url.includes("placeholder") && url.startsWith("http");
}

const EMPTY: AppData = { goals: [], logs: {}, objectives: [] };

export function loadLocal(): AppData {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const d = JSON.parse(raw) as Partial<AppData>;
    return {
      goals: (d.goals ?? []).map((g) => ({ ...g, category: normalizePillar(g.category) })),
      logs: d.logs ?? {},
      objectives: d.objectives ?? [],
    };
  } catch {
    return EMPTY;
  }
}

export function saveLocal(data: AppData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // localStorage đầy hoặc bị chặn — bỏ qua, UI sẽ báo lỗi lưu.
    throw new Error("Không ghi được vào bộ nhớ trình duyệt (đầy hoặc bị chặn).");
  }
}
