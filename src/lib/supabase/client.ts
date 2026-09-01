import { createBrowserClient } from "@supabase/ssr";
import { LONG_SESSION_MAX_AGE } from "./cookies";

/**
 * Supabase client dùng trong Client Component (chạy trên trình duyệt).
 *
 * flowType "implicit": liên kết đăng nhập trong email trả token thẳng trên URL
 * (không cần "code verifier" lưu sẵn ở trình duyệt gốc) → bấm link ở BẤT KỲ
 * trình duyệt nào cũng đăng nhập được. Cần thiết cho iPhone / Gmail app.
 *
 * cookieOptions.maxAge: giữ phiên 1 năm, chỉ mất khi bấm Đăng xuất.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { flowType: "implicit", detectSessionInUrl: true },
      cookieOptions: { maxAge: LONG_SESSION_MAX_AGE, path: "/", sameSite: "lax" },
    },
  );
}
