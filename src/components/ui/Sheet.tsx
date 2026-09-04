"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Bảng trượt bên (desktop) / bảng kéo lên (mobile) để chứa form.
 * KHÔNG đóng khi bấm ra ngoài nếu đang có thay đổi chưa lưu — hỏi xác nhận.
 * Nút Lưu / Huỷ luôn dính ở đáy, không bị trôi mất.
 */
export function Sheet({
  title,
  subtitle,
  onClose,
  dirty = false,
  footer,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  dirty?: boolean;
  footer?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") attemptClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  const attemptClose = () => {
    if (dirty) setConfirmClose(true);
    else onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      <div
        className="absolute inset-0 animate-fade-in"
        style={{
          background: "rgba(4,6,14,0.6)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
        onClick={attemptClose}
      />

      <div
        className={
          "absolute bg-surface flex flex-col animate-sheet-in " +
          "inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl " +
          "sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:rounded-none sm:rounded-l-3xl " +
          (wide ? "sm:w-[520px]" : "sm:w-[440px]")
        }
        style={{
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-24px 0 60px -20px rgba(0,0,0,0.5)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="flex items-start justify-between gap-3 px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="min-w-0">
            <h2 className="headline text-[16px] truncate">{title}</h2>
            {subtitle && (
              <p className="text-text-3 text-[11.5px] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={attemptClose}
            className="p-1.5 rounded-lg text-text-3 hover:text-text hover:bg-chip transition flex-shrink-0"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <div
            className="flex-shrink-0 px-5 py-3.5 border-t flex items-center gap-2.5"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))",
            }}
          >
            {footer}
          </div>
        )}
      </div>

      {confirmClose && (
        <div
          className="absolute inset-0 z-[1100] flex items-center justify-center p-5"
          style={{ background: "rgba(4,6,14,0.7)" }}
        >
          <div
            className="w-full max-w-xs rounded-2xl p-5 animate-scale-in"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h3 className="headline text-[15px] mb-1.5">Bỏ thay đổi?</h3>
            <p className="text-text-2 text-[12.5px] mb-4 leading-relaxed">
              Bạn có thay đổi chưa lưu. Đóng lại sẽ mất phần vừa nhập.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmClose(false)}
                className="btn-ghost flex-1 py-2.5 text-[13px]"
              >
                Ở lại
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-[13px] font-bold rounded-xl text-white"
                style={{ background: "var(--bad)" }}
              >
                Bỏ &amp; đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
