import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/local-store";
import { AI_SYSTEM_PROMPT, buildAIUserPrompt } from "@/lib/domain/ai-summary";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export async function POST(req: NextRequest) {
  // Chỉ người đã đăng nhập mới gọi được (tránh lộ / lạm dụng API key).
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

  let summary = "";
  try {
    const body = await req.json();
    summary = String(body.summary || "");
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }
  if (!summary.trim()) {
    return NextResponse.json({ error: "Thiếu dữ liệu tóm tắt." }, { status: 400 });
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
        max_tokens: 1024,
        system: AI_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildAIUserPrompt(summary) }],
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
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi khi gọi Anthropic API." },
      { status: 500 },
    );
  }
}
