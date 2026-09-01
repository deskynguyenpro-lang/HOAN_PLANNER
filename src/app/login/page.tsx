"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Compass,
  ArrowRight,
  Mail,
  Loader2,
  Sparkles,
  Target,
  BookOpen,
  HeartPulse,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";
import { requestLogin, verifyCode, type LoginState } from "./actions";
import OtpInput from "@/components/auth/OtpInput";

const initial: LoginState = { step: "email", email: "", error: "", notice: "" };

const pillars = [
  { icon: Target, label: "Công việc", color: "var(--work)" },
  { icon: BookOpen, label: "Học tập", color: "var(--study)" },
  { icon: HeartPulse, label: "Sức khỏe", color: "var(--health)" },
  { icon: FlaskConical, label: "Nghiên cứu", color: "var(--research)" },
];

export default function LoginPage() {
  const [emailState, emailAction, emailPending] = useActionState(requestLogin, initial);
  const [codeState, codeAction, codePending] = useActionState(verifyCode, initial);

  const [step, setStep] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (emailState.step === "sent") {
      setStep("sent");
      setEmail(emailState.email);
    }
  }, [emailState]);

  // Đăng nhập thành công → chuyển trang bằng full-page load để cookie phiên
  // được đọc lại chắc chắn (đặc biệt trên trình duyệt di động).
  useEffect(() => {
    if (codeState.ok) {
      setSigningIn(true);
      window.location.assign("/tong-quan");
    }
  }, [codeState]);

  const error = step === "sent" ? codeState.error || emailState.error : emailState.error;

  return (
    <main className="min-h-screen w-full flex">
      {/* Cột trái — form đăng nhập */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 relative z-10">
        <div className="w-full max-w-[400px] animate-fade-up">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="flex items-center justify-center rounded-2xl shrink-0"
              style={{
                width: 46,
                height: 46,
                background: "linear-gradient(140deg, var(--brand), #ff9a6b)",
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

          <div className="card p-7 sm:p-8 shadow-pop relative overflow-hidden">
            <div
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{
                background:
                  "linear-gradient(90deg, var(--work), var(--study), var(--health), var(--research))",
              }}
            />

            <h1 className="headline text-[24px] mb-2">
              {step === "email" ? "Đăng nhập" : "Kiểm tra email"}
            </h1>
            <p className="text-text-2 text-[13.5px] leading-relaxed mb-6">
              {step === "email"
                ? "Nhập email của bạn. Hệ thống gửi một mã 6 số để đăng nhập — không cần mật khẩu, không cần đăng ký trước."
                : `Đã gửi mã 6 số tới ${email}. Mở email và nhập mã vào ô bên dưới. (Nếu email chỉ có liên kết “Sign in” thì bấm vào đó cũng được.)`}
            </p>

            {step === "email" ? (
              <form action={emailAction} className="space-y-4">
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
                <p className="flex items-center gap-1.5 text-text-3 text-[11.5px] justify-center pt-1">
                  <ShieldCheck size={13} /> Không mật khẩu · Không spam · Riêng tư tuyệt đối
                </p>
              </form>
            ) : (
              <form action={codeAction} className="space-y-4">
                <input type="hidden" name="email" value={email} />
                <div className="hair" />
                <p className="text-text-3 text-[11.5px] leading-relaxed">
                  Không thấy email? Kiểm tra mục Spam, hoặc gửi lại sau ít phút.
                </p>
                <label className="block">
                  <span className="eyebrow">Mã 6 số</span>
                  <div className="mt-2">
                    <OtpInput name="token" disabled={codePending || signingIn} />
                  </div>
                </label>
                <button
                  type="submit"
                  disabled={codePending || signingIn}
                  className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {codePending || signingIn ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {signingIn ? "Đang vào…" : ""}
                    </>
                  ) : (
                    "Xác nhận mã"
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    formAction={emailAction}
                    disabled={emailPending}
                    className="btn-ghost flex-1 py-2.5 text-[13px] flex items-center justify-center gap-2 disabled:opacity-60"
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
                    className="flex-1 py-2.5 text-[12.5px] text-text-3 hover:text-text-2 transition"
                  >
                    Đổi email khác
                  </button>
                </div>
              </form>
            )}

            {error && <p className="text-bad text-[12.5px] mt-4 leading-relaxed">{error}</p>}
          </div>

          <p className="text-text-3 text-[11.5px] text-center mt-5 leading-relaxed">
            Mỗi người có không gian kế hoạch riêng, dữ liệu tách biệt hoàn toàn.
          </p>
        </div>
      </div>

      {/* Cột phải — panel thương hiệu, chỉ hiện trên màn hình rộng */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center px-16">
        <div
          className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-40"
          style={{ background: "var(--work)", filter: "blur(110px)" }}
        />
        <div
          className="pointer-events-none absolute top-1/3 -right-20 w-[380px] h-[380px] rounded-full opacity-30"
          style={{ background: "var(--study)", filter: "blur(120px)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-28 left-1/4 w-[360px] h-[360px] rounded-full opacity-25"
          style={{ background: "var(--health)", filter: "blur(110px)" }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 65% 55% at 50% 42%, black 40%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 65% 55% at 50% 42%, black 40%, transparent 100%)",
          }}
        />

        <div className="relative z-10 max-w-[440px] animate-fade-in">
          <div className="eyebrow mb-4 flex items-center gap-2">
            <Sparkles size={13} /> Kế hoạch phát triển bản thân
          </div>
          <h2 className="headline text-[34px] leading-[1.18] mb-5">
            Từ ý định đến hành động —
            <br />
            mỗi ngày một chút.
          </h2>
          <p className="text-text-2 text-[14.5px] leading-relaxed mb-9 max-w-[380px]">
            Theo dõi 4 trụ cột phát triển, nhận phản hồi tức thì và giữ nhịp độ ổn định cho
            mục tiêu dài hạn của bạn.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {pillars.map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="card px-4 py-3.5 flex items-center gap-3"
                style={{ borderLeft: `3px solid ${color}` }}
              >
                <Icon size={17} color={color} strokeWidth={2.2} />
                <span className="text-[13.5px] font-medium text-text">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
