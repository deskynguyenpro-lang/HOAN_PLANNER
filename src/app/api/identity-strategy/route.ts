import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/local-store";
import { PILLARS } from "@/lib/domain/pillars";
import {
  DEFAULT_TARGET_TIMEFRAME,
  isShortTermTimeframe,
  timeframeDisplayLabel,
  TIMEFRAME_OPTIONS,
  type TargetTimeframe,
} from "@/lib/domain/identity";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const SYSTEM_PROMPT = `Bạn là một chiến lược gia phát triển cá nhân (Elite Strategic Life Coach) cho một công cụ lập kế hoạch tiếng Việt xoay quanh 4 trụ cột cố định: Công việc (work), Học tập (study), Sức khỏe (health), Nghiên cứu (research).

Nhiệm vụ: đọc bản mô tả định hướng bản thân của người dùng (kèm mốc thời gian họ chọn), cùng danh sách mục tiêu hằng ngày họ ĐANG có, rồi:
1. Tính tỷ trọng % thời gian/năng lượng nên phân bổ cho 4 trụ cột (bắt buộc 4 số nguyên, tổng đúng bằng 100) — PHẢI điều chỉnh theo mốc thời gian:
   - Mốc NGẮN HẠN (3-6 tháng): dồn mạnh % vào 1-2 trụ cột chính liên quan trực tiếp đến định hướng (kiểu "Nước rút" — có thể lệch hẳn, ví dụ 50-60% cho trụ cột chính), chấp nhận bỏ bớt các trụ cột không liên quan.
   - Mốc DÀI HẠN (1 năm trở lên, hoặc tuỳ chỉnh dài): phân bổ bền vững, cân bằng hơn giữa các trụ cột liên quan — tránh dồn quá 45% vào một trụ cột duy nhất trừ khi định hướng thực sự đòi hỏi.
2. Trong số các mục tiêu đang có, chọn ra những id thực sự phù hợp nhất với định hướng ("ưu tiên cốt lõi") — chỉ chọn nếu thực sự liên quan rõ ràng, không chọn tất cả cho có.
3. Gợi ý 2-4 hành động ưu tiên cụ thể (có thể là việc chưa tồn tại trong danh sách), phù hợp với quy mô của mốc thời gian đã chọn.
4. Chỉ ra việc nên giảm bớt/tạm gác để tránh kiệt sức.

Chỉ trả lời bằng đúng một khối JSON hợp lệ, không thêm chữ nào khác, không dùng markdown code fence, đúng cấu trúc:
{
  "pillar_weights": { "work": number, "study": number, "health": number, "research": number },
  "strategic_summary": "2-3 câu tiếng Việt giải thích vì sao phân bổ như vậy, có nhắc đến mốc thời gian",
  "core_goal_ids": ["id1", "id2"],
  "core_priorities": [{ "pillar": "work|study|health|research", "action": "...", "reason": "..." }],
  "deprioritized_advice": "1-2 câu tiếng Việt"
}`;

interface GoalBrief {
  id: string;
  name: string;
  pillar: string;
  targetHours: number;
}

function buildUserPrompt(
  vision: string,
  goals: GoalBrief[],
  targetTimeframe: TargetTimeframe,
  customTimeframeLabel: string,
): string {
  const goalLines =
    goals.length > 0
      ? goals
          .map((g) => `- id="${g.id}" · ${g.name} · trụ cột ${g.pillar} · ${g.targetHours}h/ngày`)
          .join("\n")
      : "(chưa có mục tiêu hằng ngày nào)";

  const timeframeLabel = timeframeDisplayLabel({ targetTimeframe, customTimeframeLabel });
  const scale = isShortTermTimeframe(targetTimeframe)
    ? "NGẮN HẠN — dồn lực, chấp nhận lệch hẳn về 1-2 trụ cột chính"
    : "DÀI HẠN — phân bổ cân bằng, bền vững";

  return `MỐC THỜI GIAN NGƯỜI DÙNG CHỌN: ${timeframeLabel} (${scale})

ĐỊNH HƯỚNG NGƯỜI DÙNG MÔ TẢ (cho mốc thời gian trên):
${vision.trim()}

DANH SÁCH MỤC TIÊU HẰNG NGÀY ĐANG CÓ:
${goalLines}

Hãy trả về đúng JSON theo cấu trúc đã quy định, với tỷ trọng % đã điều chỉnh đúng theo mốc thời gian ${timeframeLabel} nêu trên.`;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(trimmed);
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

  let vision = "";
  let goals: GoalBrief[] = [];
  let targetTimeframe: TargetTimeframe = DEFAULT_TARGET_TIMEFRAME;
  let customTimeframeLabel = "";
  try {
    const body = await req.json();
    vision = String(body.vision || "").trim();
    goals = Array.isArray(body.goals) ? body.goals : [];
    if (TIMEFRAME_OPTIONS.includes(body.targetTimeframe)) {
      targetTimeframe = body.targetTimeframe;
    }
    customTimeframeLabel = String(body.customTimeframeLabel || "").trim();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }
  if (vision.length < 10) {
    return NextResponse.json(
      { error: "Mô tả định hướng còn quá ngắn — viết rõ hơn để AI phân tích đúng." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 900,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: buildUserPrompt(vision, goals, targetTimeframe, customTimeframeLabel) },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg =
        data?.error?.message ||
        (typeof data?.error === "string" ? data.error : "Anthropic API trả lỗi.");
      return NextResponse.json({ error: msg }, { status: res.status });
    }
    const text = (data.content || [])
      .map((b: { text?: string }) => b.text || "")
      .join("\n")
      .trim();
    if (!text) {
      return NextResponse.json({ error: "Phản hồi rỗng." }, { status: 502 });
    }

    let parsed: {
      pillar_weights?: Record<string, number>;
      strategic_summary?: string;
      core_goal_ids?: string[];
      core_priorities?: { pillar: string; action: string; reason: string }[];
      deprioritized_advice?: string;
    };
    try {
      parsed = extractJson(text) as typeof parsed;
    } catch {
      return NextResponse.json(
        { error: "AI trả về định dạng không đọc được — thử lại giúp tôi." },
        { status: 502 },
      );
    }

    const pillarIds = PILLARS.map((p) => p.id);
    const weights = Object.fromEntries(
      pillarIds.map((id) => [id, Math.max(0, Math.round(Number(parsed.pillar_weights?.[id]) || 0))]),
    );

    return NextResponse.json({
      pillarWeights: weights,
      strategicSummary: String(parsed.strategic_summary || ""),
      coreGoalIds: Array.isArray(parsed.core_goal_ids) ? parsed.core_goal_ids.map(String) : [],
      corePriorities: Array.isArray(parsed.core_priorities)
        ? parsed.core_priorities
            .filter((p) => p && pillarIds.includes(p.pillar as (typeof pillarIds)[number]))
            .map((p) => ({ pillar: p.pillar, action: String(p.action || ""), reason: String(p.reason || "") }))
        : [],
      deprioritizedAdvice: String(parsed.deprioritized_advice || ""),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi khi gọi Anthropic API." },
      { status: 500 },
    );
  }
}
