import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/local-store";
import type { Goal, Logs, Objective } from "@/lib/domain/types";
import type { IdentityProfile } from "@/lib/domain/identity";
import { buildUserFullContext, formatContextForPrompt } from "@/lib/domain/aiContext";

/**
 * POST /api/ai/chat — Trợ lý AI Chat (Turn 4). Streaming text thuần (không
 * JSON) để UI hiển thị hiệu ứng gõ chữ mượt.
 *
 * Cùng nguyên tắc dữ liệu như các route AI khác trong dự án: client tự tải
 * goals/logs/objectives/identity/bufferCapacityPct từ store của nó (local
 * hoặc Supabase) và gửi kèm trong body — route này KHÔNG tự truy vấn DB
 * theo userId, để hoạt động đúng cả ở chế độ offline.
 */

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

type ChatMode = "morning" | "evening" | "breakdown" | "chat";

const PERSONA = `Bạn là trợ lý đồng hành (coach chiến lược) cho một app lập kế hoạch phát triển bản thân tiếng Việt, xoay quanh 4 trụ cột: Công việc, Học tập, Sức khỏe, Nghiên cứu.

Tính cách bắt buộc:
- Thấu cảm, thực tế, NGẮN GỌN (khoảng 3-6 câu mỗi lượt trả lời, không liệt kê máy móc, không lan man lý thuyết).
- Luôn hướng tới MỘT hành động/giải pháp cụ thể tiếp theo.
- Khi người dùng bỏ lỡ kế hoạch: KHÔNG chỉ trích, không tạo áp lực — hỏi han nhẹ nhàng, tôn trọng.
- Luôn trả lời bằng tiếng Việt, xưng "mình", gọi người dùng là "bạn".
- Chỉ dùng số liệu có trong bối cảnh được cung cấp — không bịa thêm dữ liệu.`;

const MODE_INSTRUCTION: Record<ChatMode, string> = {
  morning:
    'Đây là lượt Check-in buổi sáng. Chọn đúng 1-3 việc trọng tâm hôm nay từ bối cảnh — ưu tiên việc thuộc trụ cột có trọng số cao hoặc mức năng lượng HIGH_FOCUS xếp vào khung sáng. Nhắc gọn 1 câu về số giờ đệm (buffer) còn lại trong tuần. Giọng như một lời chào đầu ngày.',
  evening:
    "Đây là lượt Check-in buổi tối. Đánh giá nhanh những gì đã hoàn thành hôm nay so với kế hoạch (dùng đúng số liệu trong bối cảnh). Nếu có việc chưa xong, hỏi han nhẹ nhàng — không phán xét — rồi gợi ý một bước nhỏ cho ngày mai.",
  breakdown:
    'Người dùng có 1 việc đã bị hoãn nhiều lần (xem "Việc cụ thể" dưới đây). Mở lời đúng tinh thần: hỏi người dùng đang vướng ở đâu — việc quá rộng, thiếu thông tin, hay chưa có năng lượng phù hợp — diễn đạt tự nhiên bằng lời của bạn, dùng đúng tên việc và số lần hoãn.',
  chat:
    "Đây là hội thoại tự do. Trả lời đúng điều người dùng hỏi, luôn bám bối cảnh thật đã cho. Nếu phù hợp, có thể chủ động nhắc đến cảnh báo tốc độ hoặc việc cần chia nhỏ trong bối cảnh.",
};

const KICKOFF_MESSAGE: Record<ChatMode, string> = {
  morning: "Chào ngày mới, tóm tắt giúp mình hôm nay nên tập trung vào gì.",
  evening: "Tổng kết giúp mình tiến độ hôm nay.",
  breakdown: "Mình đang vướng với việc bị hoãn nhiều lần này, giúp mình gỡ nó.",
  chat: "Xin chào.",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  mode: ChatMode;
  messages: ChatMessage[];
  goals: Goal[];
  logs: Logs;
  objectives: Objective[];
  identity: IdentityProfile | null;
  bufferCapacityPct: number;
  breakdownTarget?: { taskName: string; deferCount: number };
  now?: string;
}

function buildSystemPrompt(
  mode: ChatMode,
  contextText: string,
  breakdownTarget?: { taskName: string; deferCount: number },
): string {
  let extra = MODE_INSTRUCTION[mode] ?? MODE_INSTRUCTION.chat;
  if (mode === "breakdown" && breakdownTarget) {
    extra += `\n\nViệc cụ thể: "${breakdownTarget.taskName}", đã hoãn ${breakdownTarget.deferCount} lần.`;
  }
  return `${PERSONA}\n\n${extra}\n\n----- BỐI CẢNH THỰC TẾ CỦA NGƯỜI DÙNG -----\n${contextText}\n----- HẾT BỐI CẢNH -----`;
}

export async function POST(req: NextRequest) {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Chưa cấu hình ANTHROPIC_API_KEY. Vào Vercel → Settings → Environment Variables để thêm, rồi Redeploy.",
      },
      { status: 400 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const mode: ChatMode = ["morning", "evening", "breakdown", "chat"].includes(body.mode)
    ? body.mode
    : "chat";
  const goals = Array.isArray(body.goals) ? body.goals : [];
  const logs = body.logs && typeof body.logs === "object" ? body.logs : {};
  const objectives = Array.isArray(body.objectives) ? body.objectives : [];
  const identity = body.identity ?? null;
  const bufferCapacityPct = Number.isFinite(body.bufferCapacityPct) ? body.bufferCapacityPct : 20;
  const now = body.now ? new Date(body.now) : new Date();

  const messages: ChatMessage[] =
    Array.isArray(body.messages) && body.messages.length > 0
      ? body.messages
      : [{ role: "user", content: KICKOFF_MESSAGE[mode] }];

  const ctx = buildUserFullContext(goals, logs, objectives, identity, bufferCapacityPct, now);
  const systemPrompt = buildSystemPrompt(mode, formatContextForPrompt(ctx), body.breakdownTarget);

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: systemPrompt,
        stream: true,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Không gọi được Anthropic API." },
      { status: 500 },
    );
  }

  if (!anthropicRes.ok || !anthropicRes.body) {
    let detail = "";
    try {
      const errJson = await anthropicRes.json();
      detail = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      /* bỏ qua */
    }
    return NextResponse.json(
      { error: `Anthropic API trả lỗi (${anthropicRes.status}).`, detail },
      { status: anthropicRes.status || 502 },
    );
  }

  const reader = anthropicRes.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;
        try {
          const evt = JSON.parse(jsonStr);
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
            controller.enqueue(encoder.encode(evt.delta.text));
          }
        } catch {
          // Dòng SSE không parse được (hiếm) — bỏ qua, không chặn stream.
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
