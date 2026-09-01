import type { CookieOptions } from "@supabase/ssr";

/** Giữ phiên đăng nhập lâu dài: 1 năm, chỉ mất khi người dùng bấm Đăng xuất. */
export const LONG_SESSION_MAX_AGE = 60 * 60 * 24 * 365;

export function persistentCookieOptions(options?: CookieOptions): CookieOptions {
  return {
    ...options,
    path: "/",
    sameSite: options?.sameSite ?? "lax",
    maxAge: LONG_SESSION_MAX_AGE,
  };
}
