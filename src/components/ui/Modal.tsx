"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  children,
  size = "sm",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "xs" | "sm" | "md";
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const maxW = size === "xs" ? "max-w-xs" : size === "md" ? "max-w-md" : "max-w-sm";

  const node = (
    <div
      className="fixed inset-0 z-[1000] overflow-y-auto animate-fade-in"
      style={{
        background: "rgba(4,6,14,0.82)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="min-h-full flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
        <div
          className={`w-full ${maxW} rounded-t-3xl sm:rounded-2xl p-5 animate-scale-in`}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 30px 70px -20px rgba(0,0,0,0.7)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="headline text-[16px]">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-3 hover:text-text hover:bg-chip transition"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(node, document.body);
}
