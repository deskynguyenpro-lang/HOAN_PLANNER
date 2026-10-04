import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/data/local-store";

/**
 * GET /api/cron/keepalive — Vercel Cron gọi định kỳ (xem vercel.json) để dự án
 * Supabase gói miễn phí không bị tự tạm dừng sau ~1 tuần không có hoạt động.
 *
 * Phải là truy vấn THẬT vào database (không chỉ ping trang web): đọc tối đa 1
 * dòng bảng "settings" bằng anon key. RLS chặn mọi dữ liệu người dùng nên kết
 * quả trả về rỗng — endpoint không lộ gì, chỉ tạo ra hoạt động database.
 *
 * Nếu đặt biến môi trường CRON_SECRET, Vercel tự gửi kèm
 * "Authorization: Bearer <CRON_SECRET>" và route sẽ từ chối request khác.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Chế độ cục bộ (chưa có Supabase) — không có gì để giữ hoạt động.
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, mode: "local" });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    const res = await fetch(`${url}/rest/v1/settings?select=user_id&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    return NextResponse.json(
      { ok: res.ok, supabaseStatus: res.status, at: new Date().toISOString() },
      { status: res.ok ? 200 : 502 },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "fetch failed" },
      { status: 502 },
    );
  }
}
