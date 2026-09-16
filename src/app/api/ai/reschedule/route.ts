import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/local-store";
import type { Goal, Logs } from "@/lib/domain/types";
import {
  applyProposedSchedule,
  detectAndProcessMissedTasks,
  type AutonomyLevel,
  type ExternalBusyMap,
  type RescheduleOutcome,
} from "@/lib/domain/reschedule";

/**
 * POST /api/ai/reschedule — bộ máy phát hiện task bỏ lỡ + xếp lại lịch.
 *
 * Đây là tính toán thuần (constraint scheduler tất định, không gọi AI/LLM
 * nào) nên KHÔNG cần giữ bí mật gì — route này tồn tại chủ yếu để (1) có
 * một điểm API ổn định cho UI (Turn 2) và AI Chat Assistant (Turn 4) gọi
 * vào, và (2) ghi Audit Log vào Supabase cho người dùng cloud.
 *
 * Lịch trình thật (goals/logs) luôn do CLIENT sở hữu và lưu qua setLogs()
 * (xem lib/data/store.tsx) — route này KHÔNG tự ghi vào bảng goals/day_logs.
 * Nó chỉ tính toán và trả về logs đã áp dụng để client tự lưu, đồng thời tự
 * ghi Audit Log (bảng ai_action_logs) khi ở chế độ cloud và autonomyLevel
 * yêu cầu ghi DB.
 *
 * Mức độ tự chủ:
 *  - Level 1 (Advisor):  chỉ trả về outcomes, không có appliedLogs.
 *  - Level 2 (Assisted): trả về outcomes; nếu `confirm: true` (người dùng đã
 *    bấm "Áp dụng") thì mới trả appliedLogs + ghi Audit Log.
 *  - Level 3 (Auto):     luôn trả appliedLogs + ghi Audit Log ngay.
 */

interface ReschedulePayload {
  autonomyLevel: AutonomyLevel;
  goals: Goal[];
  logs: Logs;
  confirm?: boolean;
  now?: string;
  /** Khung giờ bận từ Google Calendar (nếu đã kết nối) — client tự lấy qua
   * /api/integrations/google-calendar/events rồi gửi kèm, để AI Rescheduler
   * không bao giờ xếp chèn lên lịch ngoài. */
  externalBusyByDay?: ExternalBusyMap;
}

export async function POST(req: NextRequest) {
  const cloud = isSupabaseConfigured();
  let userId: string | null = null;

  if (cloud) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }
    userId = user.id;
  }

  let body: ReschedulePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const autonomyLevel = body.autonomyLevel;
  if (![1, 2, 3].includes(autonomyLevel)) {
    return NextResponse.json({ error: "autonomyLevel phải là 1, 2 hoặc 3." }, { status: 400 });
  }
  const goals = Array.isArray(body.goals) ? body.goals : [];
  const logs = body.logs && typeof body.logs === "object" ? body.logs : {};
  const now = body.now ? new Date(body.now) : new Date();
  if (Number.isNaN(now.getTime())) {
    return NextResponse.json({ error: "`now` không hợp lệ." }, { status: 400 });
  }

  const externalBusyByDay = body.externalBusyByDay && typeof body.externalBusyByDay === "object" ? body.externalBusyByDay : {};
  const { nextLogs, outcomes } = detectAndProcessMissedTasks(goals, logs, now, externalBusyByDay);

  const shouldApply = autonomyLevel === 3 || (autonomyLevel === 2 && body.confirm === true);
  if (!shouldApply) {
    return NextResponse.json({
      mode: cloud ? "cloud" : "local",
      autonomyLevel,
      outcomes,
      nextLogs,
      applied: false,
    });
  }

  let appliedLogs = nextLogs;
  const auditEntries: {
    taskId: string;
    oldSchedule: { dateKey: string; start: number; duration: number };
    newSchedule: { dateKey: string; start: number; duration: number };
    reasoning: string;
  }[] = [];

  for (const outcome of outcomes) {
    if (outcome.kind !== "scheduled") continue;
    appliedLogs = applyProposedSchedule(outcome as Extract<RescheduleOutcome, { kind: "scheduled" }>, appliedLogs);
    auditEntries.push({
      taskId: outcome.missed.block.id,
      oldSchedule: {
        dateKey: outcome.missed.dateKey,
        start: outcome.missed.block.start,
        duration: outcome.missed.block.duration,
      },
      newSchedule: {
        dateKey: outcome.proposed.dateKey,
        start: outcome.proposed.start,
        duration: outcome.proposed.duration,
      },
      reasoning: outcome.reasoning,
    });
  }

  let persisted = false;
  if (cloud && userId && auditEntries.length) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.from("ai_action_logs").insert(
        auditEntries.map((e) => ({
          user_id: userId,
          task_id: e.taskId,
          old_schedule: e.oldSchedule,
          new_schedule: e.newSchedule,
          reasoning: e.reasoning,
          autonomy_level: autonomyLevel,
          undone: false,
        })),
      );
      if (!error) persisted = true;
    } catch {
      // Bảng ai_action_logs có thể chưa được tạo (chưa chạy migration mới) —
      // không chặn kết quả reschedule vì lịch trình vẫn do client tự lưu.
    }
  }

  return NextResponse.json({
    mode: cloud ? "cloud" : "local",
    autonomyLevel,
    outcomes,
    nextLogs,
    applied: true,
    appliedLogs,
    auditEntries,
    persisted,
  });
}
