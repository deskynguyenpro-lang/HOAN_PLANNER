"use client";

import { createClient } from "@/lib/supabase/client";
import type { WeeklyMetrics } from "@/lib/domain/types";

export interface WeeklyReviewRow {
  id: number;
  week_start: string;
  metrics: WeeklyMetrics;
  ai_summary: string;
  created_at: string;
}

export async function fetchWeeklyReviews(): Promise<WeeklyReviewRow[]> {
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
