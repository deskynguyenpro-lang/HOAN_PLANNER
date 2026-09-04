"use client";

import { createClient } from "@/lib/supabase/client";
import type { WeeklyMetrics } from "@/lib/domain/types";
import { isSupabaseConfigured } from "./local-store";

export interface WeeklyReviewRow {
  id: number;
  week_start: string;
  metrics: WeeklyMetrics;
  ai_summary: string;
  created_at: string;
}

const LOCAL_KEY = "khpt:weekly:v1";

function loadLocalReviews(): WeeklyReviewRow[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveLocalReviews(rows: WeeklyReviewRow[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
  } catch {
    /* bỏ qua */
  }
}

export async function fetchWeeklyReviews(): Promise<WeeklyReviewRow[]> {
  if (!isSupabaseConfigured()) {
    return loadLocalReviews().sort((a, b) => (a.week_start < b.week_start ? 1 : -1));
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("weekly_reviews")
    .select("id, week_start, metrics, ai_summary, created_at")
    .order("week_start", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WeeklyReviewRow[];
}

export async function saveWeeklyReview(
  weekStart: string,
  metrics: WeeklyMetrics,
  aiSummary?: string,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    const rows = loadLocalReviews();
    const idx = rows.findIndex((r) => r.week_start === weekStart);
    const row: WeeklyReviewRow = {
      id: idx >= 0 ? rows[idx].id : Date.now(),
      week_start: weekStart,
      metrics,
      ai_summary: aiSummary ?? (idx >= 0 ? rows[idx].ai_summary : ""),
      created_at: idx >= 0 ? rows[idx].created_at : new Date().toISOString(),
    };
    if (idx >= 0) rows[idx] = row;
    else rows.push(row);
    saveLocalReviews(rows);
    return;
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Chưa đăng nhập");

  const payload: Record<string, unknown> = {
    user_id: auth.user.id,
    week_start: weekStart,
    metrics,
  };
  if (aiSummary !== undefined) payload.ai_summary = aiSummary;

  const { error } = await supabase
    .from("weekly_reviews")
    .upsert(payload, { onConflict: "user_id,week_start" });
  if (error) throw error;
}
