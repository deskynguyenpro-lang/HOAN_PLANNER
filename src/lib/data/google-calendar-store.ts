"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "./local-store";

/**
 * Đồng bộ Google Calendar chỉ khả dụng ở chế độ cloud (Supabase) — cần một
 * phiên đăng nhập server-side để gắn refresh token vào, điều mà chế độ
 * offline không có (mọi dữ liệu offline chỉ nằm trong localStorage của
 * trình duyệt, server không biết "người dùng" nào). Đây là giới hạn kiến
 * trúc, không phải lựa chọn tuỳ ý.
 */
export function isGoogleCalendarFeatureAvailable(): boolean {
  return isSupabaseConfigured();
}

export interface GoogleCalendarStatus {
  connected: boolean;
  connectedAt: string | null;
}

export async function fetchGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  if (!isSupabaseConfigured()) return { connected: false, connectedAt: null };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { connected: false, connectedAt: null };

  const { data, error } = await supabase
    .from("settings")
    .select("data")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  const gcal = (data?.data as { googleCalendar?: { connectedAt?: string } } | null)?.googleCalendar;
  return { connected: !!gcal, connectedAt: gcal?.connectedAt || null };
}

export async function disconnectGoogleCalendar(): Promise<void> {
  const res = await fetch("/api/integrations/google-calendar/disconnect", { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Không gỡ kết nối được." }));
    throw new Error(err.error);
  }
}

/** Điều hướng sang Google để xin quyền — luồng redirect chuẩn, không phải fetch. */
export function startGoogleCalendarConnect(returnTo: string): void {
  window.location.href = `/api/integrations/google-calendar/connect?returnTo=${encodeURIComponent(returnTo)}`;
}

export interface ExternalBusyByDay {
  [dateKey: string]: { start: number; end: number }[];
}

export async function fetchExternalBusyBlocks(fromISO: string, toISO: string): Promise<ExternalBusyByDay> {
  if (!isSupabaseConfigured()) return {};
  const res = await fetch(
    `/api/integrations/google-calendar/events?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`,
  );
  if (!res.ok) return {};
  const data = await res.json();
  return data.busyByDay || {};
}
