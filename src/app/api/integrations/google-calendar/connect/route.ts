import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/local-store";
import { buildGoogleAuthUrl, isGoogleCalendarConfigured } from "@/lib/google/calendar";

/**
 * GET /api/integrations/google-calendar/connect — bắt đầu luồng OAuth2.
 *
 * Chỉ hoạt động ở chế độ Supabase (cloud): cần gắn refresh token vào MỘT
 * người dùng đã đăng nhập server-side để đọc lại sau này — ở chế độ offline
 * không có phiên đăng nhập nào trên server để gắn vào, nên tính năng này
 * không áp dụng được cho local mode (không phải lựa chọn, mà là giới hạn
 * kiến trúc: mọi state của app ở local mode chỉ tồn tại trong localStorage
 * của trình duyệt, server không biết "người dùng" nào cả).
 */
export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Đồng bộ Google Calendar chỉ khả dụng khi đã kết nối Supabase (chế độ cloud) — chế độ thử offline không có tài khoản để gắn quyền truy cập vào.",
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json(
      {
        error:
          "Chưa cấu hình Google OAuth. Cần thêm GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI vào Environment Variables (tạo OAuth client trong Google Cloud Console, bật Google Calendar API, khai báo đúng redirect URI), rồi Redeploy.",
      },
      { status: 400 },
    );
  }

  const state = crypto.randomUUID();
  const url = buildGoogleAuthUrl(state);
  const redirectUrl = new URL(req.url);
  const returnTo = redirectUrl.searchParams.get("returnTo") || "/ke-hoach";

  const res = NextResponse.redirect(url);
  res.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  res.cookies.set("google_oauth_return_to", returnTo, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
