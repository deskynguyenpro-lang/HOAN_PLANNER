import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/local-store";
import { exchangeCodeForTokens } from "@/lib/google/calendar";

/**
 * GET /api/integrations/google-calendar/callback — Google redirect về đây
 * sau khi người dùng đồng ý cấp quyền. Đổi `code` lấy refresh_token rồi lưu
 * vào settings.data.googleCalendar (cùng bảng "settings" jsonb đã dùng cho
 * định hướng/buffer — không cần bảng mới).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const returnTo = req.cookies.get("google_oauth_return_to")?.value || "/ke-hoach";
  const expectedState = req.cookies.get("google_oauth_state")?.value;

  const fail = (message: string) => {
    const dest = new URL(returnTo, url.origin);
    dest.searchParams.set("calendar", "error");
    dest.searchParams.set("message", message);
    return NextResponse.redirect(dest);
  };

  if (oauthError) return fail(`Google từ chối cấp quyền: ${oauthError}`);
  if (!code || !state) return fail("Thiếu code/state từ Google.");
  if (!expectedState || state !== expectedState) return fail("State không khớp — có thể phiên đã hết hạn, thử kết nối lại.");
  if (!isSupabaseConfigured()) return fail("Chỉ hỗ trợ ở chế độ cloud.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Chưa đăng nhập.");

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      return fail(
        "Google không trả về refresh token (có thể do đã từng cấp quyền trước đó) — hãy vào Google Account → Security → Third-party access, gỡ quyền của app này rồi kết nối lại.",
      );
    }

    const { data: existing } = await supabase
      .from("settings")
      .select("data")
      .eq("user_id", user.id)
      .maybeSingle();

    const nextData = {
      ...(existing?.data || {}),
      googleCalendar: {
        refreshToken: tokens.refresh_token,
        connectedAt: new Date().toISOString(),
      },
    };

    const { error } = await supabase
      .from("settings")
      .upsert({ user_id: user.id, data: nextData, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw error;
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Không kết nối được Google Calendar.");
  }

  const dest = new URL(returnTo, url.origin);
  dest.searchParams.set("calendar", "connected");
  const res = NextResponse.redirect(dest);
  res.cookies.delete("google_oauth_state");
  res.cookies.delete("google_oauth_return_to");
  return res;
}
