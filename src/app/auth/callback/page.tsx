"use client";

import { Suspense, useEffect, useState } from "react";
import { Compass, Loader2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function CallbackInner() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const hash = new URLSearchParams(
      window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash,
    );
    const search = new URLSearchParams(window.location.search);

    const hashErr = hash.get("error_description") || hash.get("error");
    const searchErr = search.get("error_description") || search.get("error");
    if (hashErr || searchErr) {
      setError(decodeURIComponent(hashErr || searchErr || "Liên kết không hợp lệ."));
      return;
    }

    const next = search.get("next") || "/tong-quan";

    (async () => {
      try {
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        const tokenHash = search.get("token_hash");
        const type = search.get("type");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            type: type as "email",
            token_hash: tokenHash,
          });
          if (error) throw error;
        } else {
          // detectSessionInUrl có thể đã tự xử lý — kiểm tra lại.
          await new Promise((r) => setTimeout(r, 400));
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Không thiết lập được phiên đăng nhập.");
        }

        // Full-page load để middleware phía máy chủ đọc cookie mới.
        window.location.assign(next);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Liên kết đã hết hạn hoặc đã dùng rồi.",
        );
      }
    })();
  }, []);

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-6 text-center">
      <div
        className="flex items-center justify-center rounded-2xl mb-5"
        style={{
          width: 46,
          height: 46,
          background: "linear-gradient(145deg, var(--brand-2), var(--brand))",
        }}
      >
        <Compass size={22} color="#fff" strokeWidth={2.2} />
      </div>

      {error ? (
        <>
          <div className="flex items-center gap-2 text-bad text-[14px] font-semibold mb-2">
            <AlertTriangle size={16} /> Không đăng nhập được
          </div>
          <p className="text-text-2 text-[13px] max-w-[340px] leading-relaxed mb-5">
            {error}
          </p>
          <a href="/login" className="btn-primary px-4 py-2.5 text-[13px]">
            Thử lại
          </a>
        </>
      ) : (
        <div className="flex items-center gap-2 text-text-2 text-[13.5px]">
          <Loader2 size={16} className="animate-spin text-brand" /> Đang đăng nhập…
        </div>
      )}
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
