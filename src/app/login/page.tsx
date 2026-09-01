"use client";

import { useActionState, useEffect, useState } from "react";
import { Compass, ArrowRight, Mail, KeyRound, Loader2 } from "lucide-react";
import { requestLogin, verifyCode, type LoginState } from "./actions";

const initial: LoginState = { step: "email", email: "", error: "", notice: "" };

export default function LoginPage() {
  const [emailState, emailAction, emailPending] = useActionState(requestLogin, initial);
  const [codeState, codeAction, codePending] = useActionState(verifyCode, initial);

  const [step, setStep] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (emailState.step === "sent") {
      setStep("sent");
      setEmail(emailState.email);
    }
  }, [emailState]);

  const error = step === "sent" ? codeState.error || emailState.error : emailState.error;

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-[400px] animate-fade-up">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{
              width: 46,
              height: 46,
              background: "linear-gradient(145deg, var(--brand-2), var(--brand))",
              boxShadow: "0 10px 30px -8px rgba(255,107,91,0.5)",
            }}
          >
            <Compass size={22} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <div className="headline text-[17px] leading-tight">Kế hoạch phát triển</div>
            <div className="eyebrow mt-0.5">Bám kế hoạch · Đo hiệu quả</div>
          </div>
        </div>

        <div className="card p-6">
          <h1 className="headline text-[22px] mb-1">
            {step === "email" ? "Đăng nhập" : "Kiểm tra email"}
          </h1>
          <p className="text-text-2 text-[13.5px] leading-relaxed mb-5">
            {step === "email"
              ? "Nhập email của bạn. Hệ thống gửi một mã 6 số để đăng nhập — không cần mật khẩu, không cần đăng ký trước."
              : `Đã gửi mã 6 số tới ${email}. Mở email và nhập mã vào ô bên dưới. (Nếu email chỉ có liên kết “Sign in” thì bấm vào đó cũng được.)`}
          </p>

          {step === "email" ? (
            <form action={emailAction} className="space-y-3">
              <label className="block">
                <span className="eyebrow">Email</span>
                <div className="relative mt-1.5">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3"
                  />
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    defaultValue={emailState.email}
                    placeholder="ban@example.com"
                    className="field w-full pl-9 pr-3 py-3 text-sm"
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={emailPending}
                className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {emailPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Gửi mã đăng nhập <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form action={codeAction} className="space-y-3">
              <input type="hidden" name="email" value={email} />
              <div className="hair" />
              <p className="text-text-3 text-[11.5px] leading-relaxed">
                Không thấy email? Kiểm tra mục Spam, hoặc gửi lại sau ít phút. Nếu email
                của bạn có kèm <b>mã 6 số</b> thì nhập vào đây:
              </p>
              <label className="block">
                <span className="eyebrow">Mã 6 số</span>
                <div className="relative mt-1.5">
                  <KeyRound
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3"
                  />
                  <input
                    name="token"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="••••••"
                    className="field num w-full pl-9 pr-3 py-3 text-base tracking-[0.5em]"
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={codePending}
                className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {codePending ? <Loader2 size={16} className="animate-spin" /> : "Xác nhận mã"}
              </button>
              <button
                type="submit"
                formAction={emailAction}
                disabled={emailPending}
                className="btn-ghost w-full py-2.5 text-[13px] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {emailPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Gửi lại email"
                )}
              </button>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full py-2 text-[12px] text-text-3 hover:text-text-2 transition"
              >
                Đổi email khác
              </button>
            </form>
          )}

          {error && (
            <p className="text-bad text-[12.5px] mt-3 leading-relaxed">{error}</p>
          )}
        </div>

        <p className="text-text-3 text-[11.5px] text-center mt-5 leading-relaxed">
          Mỗi người có không gian kế hoạch riêng, dữ liệu tách biệt hoàn toàn.
        </p>
      </div>
    </main>
  );
}
