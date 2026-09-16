import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/local-store";
import { toKey } from "@/lib/domain/dates";
import {
  fetchGoogleBusyIntervals,
  isGoogleCalendarConfigured,
  refreshGoogleAccessToken,
  type BusyInterval,
} from "@/lib/google/calendar";

/**
 * Nhóm các khung giờ bận (ISO datetime) theo ngày, quy đổi giờ:phút sang
 * giờ thập phân trong ngày — cùng đơn vị "start/duration giờ thập phân"
 * dùng xuyên suốt app (xem lib/domain/types.ts#Block).
 *
 * Giới hạn đơn giản hoá: coi giờ trong chuỗi ISO trả về là giờ địa phương
 * của SERVER (Date.getHours() luôn theo timezone server) — app hiện chưa
 * xử lý timezone ở bất kỳ đâu khác (schedule.ts, dates.ts cũng vậy), nên
 * đây là giới hạn nhất quán với phần còn lại, không phải riêng chỗ này.
 * Sự kiện qua đêm (kết thúc khác ngày bắt đầu) bị cắt tới hết ngày đó.
 */
function splitBusyByDay(busy: BusyInterval[]): Record<string, { start: number; end: number }[]> {
  const result: Record<string, { start: number; end: number }[]> = {};
  for (const b of busy) {
    const startD = new Date(b.start);
    const endD = new Date(b.end);
    const dateKey = toKey(startD);
    const startHour = startD.getHours() + startD.getMinutes() / 60;
    const endHour = toKey(endD) === dateKey ? endD.getHours() + endD.getMinutes() / 60 : 24;
    if (endHour <= startHour) continue;
    (result[dateKey] ||= []).push({ start: startHour, end: endHour });
  }
  return result;
}

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ connected: false, busyByDay: {}, reason: "local_mode" });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({ connected: false, busyByDay: {}, reason: "not_configured" });
  }

  const { data: settingsRow } = await supabase
    .from("settings")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();
  const gcal = (settingsRow?.data as { googleCalendar?: { refreshToken?: string } } | null)?.googleCalendar;
  if (!gcal?.refreshToken) {
    return NextResponse.json({ connected: false, busyByDay: {}, reason: "not_connected" });
  }

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const timeMin = fromParam ? new Date(fromParam) : new Date();
  const timeMax = toParam ? new Date(toParam) : new Date(timeMin.getTime() + 7 * 86400000);

  try {
    const tokens = await refreshGoogleAccessToken(gcal.refreshToken);
    const busy = await fetchGoogleBusyIntervals(tokens.access_token, timeMin.toISOString(), timeMax.toISOString());
    return NextResponse.json({ connected: true, busyByDay: splitBusyByDay(busy) });
  } catch (e) {
    return NextResponse.json(
      { connected: true, busyByDay: {}, error: e instanceof Error ? e.message : "Không đọc được Google Calendar." },
      { status: 502 },
    );
  }
}
