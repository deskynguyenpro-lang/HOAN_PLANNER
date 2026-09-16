"use client";

import { createClient } from "@/lib/supabase/client";
import type { FixedTimeBlock } from "@/lib/domain/fixedBlocks";
import { isSupabaseConfigured } from "./local-store";

/**
 * Lưu vào bảng "settings" (jsonb, đã dùng cho định hướng/buffer) dưới khoá
 * "fixedBlocks" — hoạt động cả offline và cloud (không như Google Calendar,
 * không cần đăng nhập server).
 */
const LOCAL_KEY = "khpt:fixed-blocks:v1";

function loadLocal(): FixedTimeBlock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveLocal(blocks: FixedTimeBlock[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(blocks));
  } catch {
    /* bỏ qua */
  }
}

export async function fetchFixedBlocks(): Promise<FixedTimeBlock[]> {
  if (!isSupabaseConfigured()) return loadLocal();

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("settings")
    .select("data")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  const stored = (data?.data as { fixedBlocks?: FixedTimeBlock[] } | null)?.fixedBlocks;
  return Array.isArray(stored) ? stored : [];
}

export async function saveFixedBlocks(blocks: FixedTimeBlock[]): Promise<void> {
  if (!isSupabaseConfigured()) {
    saveLocal(blocks);
    return;
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Chưa đăng nhập");

  const { data: existing } = await supabase
    .from("settings")
    .select("data")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const nextData = { ...(existing?.data || {}), fixedBlocks: blocks };

  const { error } = await supabase
    .from("settings")
    .upsert(
      { user_id: auth.user.id, data: nextData, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}
