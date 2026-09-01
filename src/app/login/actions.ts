"use server";

import { createClient } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { siteUrl } from "@/lib/site";

export interface LoginState {
  step: "email" | "sent";
  email: string;
  error: string;
  notice: string;
  /** true khi đăng nhập thành công — client sẽ tự chuyển trang. */
  ok?: boolean;
}

export async function requestLogin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { step: "email", email, error: "Email chưa đúng định dạng.", notice: "" };
  }
  if (!isEmailAllowed(email)) {
    return {
      step: "email",
      email,
      error:
        "Email này chưa được cấp quyền. Thêm địa chỉ vào biến ALLOWED_EMAILS rồi thử lại.",
      notice: "",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { step: "email", email, error: error.message, notice: "" };
  }

  return {
    step: "sent",
    email,
    error: "",
    notice: `Đã gửi tới ${email}. Mở email và bấm vào liên kết đăng nhập, hoặc nhập mã 6 số bên dưới.`,
  };
}

export async function verifyCode(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const token = String(formData.get("token") || "").trim();

  if (!/^\d{6}$/.test(token)) {
    return { step: "sent", email, error: "Mã gồm đúng 6 chữ số.", notice: "" };
  }

  const supabase = await createClient();

  // Tuỳ người dùng mới hay cũ, Supabase gắn "type" khác nhau cho mã OTP email.
  // Thử lần lượt để không phụ thuộc vào trạng thái tài khoản.
  const types = ["email", "magiclink", "signup"] as const;
  let user = null;
  let lastError: string | null = null;
  for (const type of types) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type });
    if (!error && data.user) {
      user = data.user;
      break;
    }
    lastError = error?.message ?? null;
  }

  if (!user) {
    return {
      step: "sent",
      email,
      error:
        "Mã không đúng hoặc đã hết hạn. Bấm “Gửi lại” và nhập mã mới nhất." +
        (lastError ? ` (${lastError})` : ""),
      notice: "",
    };
  }

  if (!isEmailAllowed(user.email)) {
    await supabase.auth.signOut();
    return { step: "email", email, error: "Email này chưa được cấp quyền.", notice: "" };
  }

  // Phiên đã được ghi vào cookie. Không dùng redirect() ở đây — một số trình
  // duyệt di động bỏ cookie khi redirect ngay trong Server Action. Trả về ok
  // để client tự điều hướng bằng full-page load (đảm bảo đọc cookie mới).
  return { step: "sent", email, error: "", notice: "", ok: true };
}
