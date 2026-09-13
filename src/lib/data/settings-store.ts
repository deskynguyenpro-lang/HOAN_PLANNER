"use client";

import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_BUFFER_CAPACITY_PCT,
  clampBufferCapacityPct,
} from "@/lib/domain/settings";
import { isSupabaseConfigured } from "./local-store";

const LOCAL_KEY = "khpt:buffer-capacity:v1";

function loadLocal(): number {
  if (typeof window === "undefined") return DEFAULT_BUFFER_CAPACITY_PCT;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? clampBufferCapacityPct(Number(raw)) : DEFAULT_BUFFER_CAPACITY_PCT;
  } catch {
    return DEFAULT_BUFFER_CAPACITY_PCT;
  }
}
function saveLocal(pct: number) {
  try {
    window.localStorage.setItem(LOCAL_KEY, String(pct));
  } catch {
    /* bỏ qua */
  }
}

export async function fetchBufferCapacityPct(): Promise<number> {
  if (!isSupabaseConfigured()) return loadLocal();

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return DEFAULT_BUFFER_CAPACITY_PCT;

  const { data, error } = await supabase
    .from("settings")
    .select("data")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  const stored = (data?.data as { bufferCapacityPct?: number } | null)?.bufferCapacityPct;
  return stored === undefined ? DEFAULT_BUFFER_CAPACITY_PCT : clampBufferCapacityPct(stored);
}

export async function saveBufferCapacityPct(pct: number): Promise<void> {
  const clamped = clampBufferCapacityPct(pct);
  if (!isSupabaseConfigured()) {
    saveLocal(clamped);
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
  const nextData = { ...(existing?.data || {}), bufferCapacityPct: clamped };

  const { error } = await supabase
    .from("settings")
    .upsert(
      { user_id: auth.user.id, data: nextData, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}
