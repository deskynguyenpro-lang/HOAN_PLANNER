"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { siteUrl } from "@/lib/site";

export interface LoginState {
  step: "email" | "sent";
  email: string;
  error: string;
  notice: string;
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
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error || !data.user) {
    return {
      step: "sent",
      email,
      error: "Mã không đúng hoặc đã hết hạn. Gửi lại và thử mã mới nhất.",
      notice: "",
    };
  }

  if (!isEmailAllowed(data.user.email)) {
    await supabase.auth.signOut();
    return { step: "email", email, error: "Email này chưa được cấp quyền.", notice: "" };
  }

  redirect("/tong-quan");
}
