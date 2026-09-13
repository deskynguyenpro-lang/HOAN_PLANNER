"use client";

import { createClient } from "@/lib/supabase/client";
import { emptyIdentity, type IdentityProfile } from "@/lib/domain/identity";
import { isSupabaseConfigured } from "./local-store";

/**
 * Lưu vào bảng "settings" (đã có sẵn trong schema.sql — 1 dòng/người dùng,
 * cột data dạng jsonb) dưới khoá "identity". Chọn cách này thay vì tạo bảng
 * mới để không bắt người dùng phải chạy thêm SQL trên Supabase đang chạy thật.
 */
const LOCAL_KEY = "khpt:identity:v1";

function loadLocal(): IdentityProfile {
  if (typeof window === "undefined") return emptyIdentity();
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? { ...emptyIdentity(), ...JSON.parse(raw) } : emptyIdentity();
  } catch {
    return emptyIdentity();
  }
}
function saveLocal(profile: IdentityProfile) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(profile));
  } catch {
    /* bỏ qua */
  }
}

export async function fetchIdentity(): Promise<IdentityProfile> {
  if (!isSupabaseConfigured()) return loadLocal();

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return emptyIdentity();

  const { data, error } = await supabase
    .from("settings")
    .select("data")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  const stored = (data?.data as { identity?: Partial<IdentityProfile> } | null)?.identity;
  return stored ? { ...emptyIdentity(), ...stored } : emptyIdentity();
}

export async function saveIdentity(profile: IdentityProfile): Promise<void> {
  if (!isSupabaseConfigured()) {
    saveLocal(profile);
    return;
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Chưa đăng nhập");

  // Gộp vào "data" hiện có (không ghi đè các khoá thiết lập khác trong tương lai).
  const { data: existing } = await supabase
    .from("settings")
    .select("data")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const nextData = { ...(existing?.data || {}), identity: profile };

  const { error } = await supabase
    .from("settings")
    .upsert(
      { user_id: auth.user.id, data: nextData, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}
