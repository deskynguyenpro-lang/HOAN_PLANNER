/**
 * Tích hợp Google Calendar (đọc-only) — OAuth2 web-server flow chuẩn của
 * Google. Chỉ dùng scope calendar.readonly + freeBusy API (không đọc chi
 * tiết nội dung sự kiện, chỉ cần biết khung giờ nào đang bận) — đúng tinh
 * thần "read-only" của yêu cầu, giảm thiểu dữ liệu nhạy cảm phải xin quyền.
 *
 * Cần 3 biến môi trường (không có thì coi như chưa cấu hình, mọi route liên
 * quan trả lỗi rõ ràng thay vì crash — giống pattern ANTHROPIC_API_KEY):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 * (GOOGLE_REDIRECT_URI phải khớp đúng 1 "Authorized redirect URI" đã khai
 * báo trong Google Cloud Console cho OAuth client này, VD:
 * https://hoan-planner.vercel.app/api/integrations/google-calendar/callback)
 */

const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export function isGoogleCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPE,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google trả lỗi khi đổi mã xác thực (${res.status}): ${detail}`);
  }
  return res.json();
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google trả lỗi khi làm mới access token (${res.status}): ${detail}`);
  }
  return res.json();
}

export interface BusyInterval {
  start: string; // ISO 8601
  end: string; // ISO 8601
}

/** Danh sách khung giờ bận trên Google Calendar "primary" trong khoảng [timeMin, timeMax]. */
export async function fetchGoogleBusyIntervals(
  accessToken: string,
  timeMinISO: string,
  timeMaxISO: string,
): Promise<BusyInterval[]> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      timeMin: timeMinISO,
      timeMax: timeMaxISO,
      items: [{ id: "primary" }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google Calendar freeBusy API lỗi (${res.status}): ${detail}`);
  }
  const data = await res.json();
  const busy = data?.calendars?.primary?.busy;
  return Array.isArray(busy) ? busy : [];
}
