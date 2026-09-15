"use client";

import { createClient } from "@/lib/supabase/client";
import type { AutonomyLevel } from "@/lib/domain/reschedule";
import { isSupabaseConfigured } from "./local-store";

/**
 * Nhật ký hành động của bộ máy xếp lại lịch (reschedule.ts) — phục vụ Hoàn
 * tác (Undo). Theo đúng pattern các *-store.ts khác trong dự án: chế độ cục
 * bộ dùng localStorage, chế độ Supabase dùng bảng "ai_action_logs" (mới,
 * xem supabase/schema.sql mục 6 — cần chạy 1 lần trên Supabase đang dùng).
 */

export interface ScheduleSnapshot {
  dateKey: string;
  start: number;
  duration: number;
}

export interface AiActionLogEntry {
  id: string;
  taskId: string;
  oldSchedule: ScheduleSnapshot;
  newSchedule: ScheduleSnapshot;
  reasoning: string;
  autonomyLevel: AutonomyLevel;
  undone: boolean;
  createdAt: string;
}

const LOCAL_KEY = "khpt:ai-action-log:v1";
const LOCAL_CAP = 50;

function loadLocal(): AiActionLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveLocal(rows: AiActionLogEntry[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(rows.slice(-LOCAL_CAP)));
  } catch {
    /* bỏ qua */
  }
}

type NewLogInput = Omit<AiActionLogEntry, "id" | "createdAt" | "undone">;

/** Ghi 1 hành động xếp lại lịch vào nhật ký (sau khi đã apply lên logs thật). */
export async function appendActionLog(entry: NewLogInput): Promise<AiActionLogEntry> {
  if (!isSupabaseConfigured()) {
    const rows = loadLocal();
    const row: AiActionLogEntry = {
      ...entry,
      id: `log_${Date.now()}`,
      createdAt: new Date().toISOString(),
      undone: false,
    };
    rows.push(row);
    saveLocal(rows);
    return row;
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Chưa đăng nhập");

  const { data, error } = await supabase
    .from("ai_action_logs")
    .insert({
      user_id: auth.user.id,
      task_id: entry.taskId,
      old_schedule: entry.oldSchedule,
      new_schedule: entry.newSchedule,
      reasoning: entry.reasoning,
      autonomy_level: entry.autonomyLevel,
      undone: false,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToEntry(data);
}

export async function fetchRecentActionLogs(limit = 20): Promise<AiActionLogEntry[]> {
  if (!isSupabaseConfigured()) {
    return loadLocal().slice(-limit).reverse();
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_action_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(rowToEntry);
}

/**
 * Hoàn tác hành động AI gần nhất chưa bị hoàn tác — chỉ đánh dấu nhật ký và
 * trả về oldSchedule để nơi gọi tự áp dụng lại vào logs thật qua setLogs()
 * (persistence lịch trình luôn do client thực hiện, xem store.tsx).
 */
export async function undoLastActionLog(): Promise<AiActionLogEntry | null> {
  if (!isSupabaseConfigured()) {
    const rows = loadLocal();
    const idx = [...rows].reverse().findIndex((r) => !r.undone);
    if (idx === -1) return null;
    const realIdx = rows.length - 1 - idx;
    rows[realIdx] = { ...rows[realIdx], undone: true };
    saveLocal(rows);
    return rows[realIdx];
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Chưa đăng nhập");

  const { data: latest, error: findErr } = await supabase
    .from("ai_action_logs")
    .select("*")
    .eq("user_id", auth.user.id)
    .eq("undone", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!latest) return null;

  const { error: updErr } = await supabase
    .from("ai_action_logs")
    .update({ undone: true })
    .eq("id", latest.id);
  if (updErr) throw updErr;

  return rowToEntry({ ...latest, undone: true });
}

function rowToEntry(r: {
  id: number | string;
  task_id: string;
  old_schedule: ScheduleSnapshot;
  new_schedule: ScheduleSnapshot;
  reasoning: string;
  autonomy_level: number;
  undone: boolean;
  created_at: string;
}): AiActionLogEntry {
  return {
    id: String(r.id),
    taskId: r.task_id,
    oldSchedule: r.old_schedule,
    newSchedule: r.new_schedule,
    reasoning: r.reasoning || "",
    autonomyLevel: (r.autonomy_level as AutonomyLevel) || 3,
    undone: !!r.undone,
    createdAt: r.created_at,
  };
}
