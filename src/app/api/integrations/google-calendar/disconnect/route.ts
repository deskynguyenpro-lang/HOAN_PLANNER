import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/local-store";

/** POST /api/integrations/google-calendar/disconnect — gỡ liên kết Google Calendar. */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Chỉ hỗ trợ ở chế độ cloud." }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("settings")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();

  const nextData = { ...(existing?.data || {}) };
  delete (nextData as Record<string, unknown>).googleCalendar;

  const { error } = await supabase
    .from("settings")
    .upsert({ user_id: user.id, data: nextData, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
