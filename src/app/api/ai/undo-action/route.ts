import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/local-store";

/**
 * POST /api/ai/undo-action — hoàn tác hành động xếp lại lịch gần nhất của AI.
 *
 * Chỉ có tác dụng ở chế độ Supabase (cloud) — nhật ký hành động của chế độ
 * cục bộ (offline) nằm trong localStorage của trình duyệt, server không đọc
 * được, nên phải hoàn tác trực tiếp trong app qua
 * lib/data/ai-log-store.ts#undoLastActionLog() (không cần gọi route này).
 *
 * Route chỉ đánh dấu nhật ký là đã hoàn tác + trả về oldSchedule; CLIENT tự
 * áp dụng oldSchedule vào logs thật qua setLogs() (persistence lịch trình
 * luôn do client sở hữu, xem lib/data/store.tsx).
 */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      mode: "local",
      message:
        "Ở chế độ offline, hoàn tác được xử lý trực tiếp trên máy — dùng undoLastActionLog() phía client, không cần gọi API này.",
      undone: null,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { data: latest, error: findErr } = await supabase
    .from("ai_action_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("undone", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findErr) {
    return NextResponse.json(
      {
        error:
          "Không đọc được nhật ký hành động AI — có thể bảng ai_action_logs chưa được tạo (chạy migration trong supabase/schema.sql).",
        detail: findErr.message,
      },
      { status: 500 },
    );
  }
  if (!latest) {
    return NextResponse.json({ mode: "cloud", undone: null, message: "Không có hành động nào để hoàn tác." });
  }

  const { error: updErr } = await supabase
    .from("ai_action_logs")
    .update({ undone: true })
    .eq("id", latest.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({
    mode: "cloud",
    undone: {
      taskId: latest.task_id,
      oldSchedule: latest.old_schedule,
      newSchedule: latest.new_schedule,
      reasoning: latest.reasoning,
    },
  });
}
