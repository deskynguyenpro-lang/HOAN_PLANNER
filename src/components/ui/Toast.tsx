"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, AlertTriangle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

const Ctx = createContext<{
  toast: (text: string, kind?: ToastKind) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  // portal target chỉ có ở client — đặt trong effect để lần render đầu tiên
  // trên client khớp với HTML server (tránh lệch hydration).
  useEffect(() => setMounted(true), []);

  const toast = useCallback((text: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, text }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, kind === "error" ? 6000 : 3200);
  }, []);

  const dismiss = (id: number) =>
    setItems((prev) => prev.filter((t) => t.id !== id));

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed z-[2000] bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-[380px] pointer-events-none">
            {items.map((t) => {
              const Icon =
                t.kind === "success" ? Check : t.kind === "error" ? AlertTriangle : Info;
              const color =
                t.kind === "success"
                  ? "var(--good)"
                  : t.kind === "error"
                    ? "var(--bad)"
                    : "var(--study)";
              return (
                <div
                  key={t.id}
                  className="pointer-events-auto w-full flex items-start gap-2.5 rounded-xl px-3.5 py-3 animate-fade-up"
                  style={{
                    background: "var(--surface)",
                    border: `1px solid color-mix(in srgb, ${color} 40%, var(--border))`,
                    boxShadow: "0 18px 44px -18px rgba(0,0,0,0.55)",
                  }}
                  role="status"
                >
                  <span
                    className="rounded-lg flex items-center justify-center flex-shrink-0 mt-px"
                    style={{
                      width: 22,
                      height: 22,
                      background: `color-mix(in srgb, ${color} 18%, transparent)`,
                    }}
                  >
                    <Icon size={13} style={{ color }} strokeWidth={2.6} />
                  </span>
                  <span className="text-text text-[13px] leading-snug flex-1 min-w-0">
                    {t.text}
                  </span>
                  <button
                    onClick={() => dismiss(t.id)}
                    className="text-text-3 hover:text-text flex-shrink-0"
                    aria-label="Đóng"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) return { toast: () => {} };
  return v;
}
