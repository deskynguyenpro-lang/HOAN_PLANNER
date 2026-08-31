"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { pillarOf } from "@/lib/domain/pillars";

/* ─── StatChip ─────────────────────────────────────────────────────────── */
export function StatChip({
  icon: Icon,
  label,
  value,
  color = "var(--brand)",
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-2xl p-3.5 flex-1 min-w-0"
      style={{ background: "color-mix(in srgb, " + color + " 10%, transparent)", border: "1px solid color-mix(in srgb, " + color + " 22%, transparent)" }}
    >
      <div
        className="rounded-lg flex items-center justify-center mb-2"
        style={{ width: 26, height: 26, background: color }}
      >
        <Icon size={13} color="#fff" strokeWidth={2.4} />
      </div>
      <div className="eyebrow" style={{ color }}>
        {label}
      </div>
      <div className="headline text-[19px] mt-0.5 num">{value}</div>
      {sub && <div className="text-text-3 text-[11px] mt-0.5">{sub}</div>}
    </div>
  );
}

/* ─── Segmented control ────────────────────────────────────────────────── */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      className="inline-flex rounded-xl p-1 gap-1"
      style={{ background: "var(--chip)" }}
      role="tablist"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`rounded-lg font-bold transition ${
              size === "sm" ? "px-2.5 py-1 text-[11.5px]" : "px-3.5 py-1.5 text-[12.5px]"
            }`}
            style={{
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--brand)" : "var(--text-2)",
              boxShadow: active ? "0 1px 3px rgba(0,0,0,0.25)" : "none",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Progress bar ────────────────────────────────────────────────────── */
export function ProgressBar({
  pct,
  color = "var(--brand)",
  height = 8,
  track = "var(--chip)",
}: {
  pct: number;
  color?: string;
  height?: number;
  track?: string;
}) {
  return (
    <div
      className="rounded-full overflow-hidden w-full"
      style={{ height, background: track }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          height: "100%",
          background: color,
          borderRadius: 999,
          transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)",
        }}
      />
    </div>
  );
}

/* ─── Pillar badge (icon dot) ─────────────────────────────────────────── */
export function PillarDot({ id, size = 10 }: { id: string; size?: number }) {
  const p = pillarOf(id);
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: p.color }}
      aria-hidden
    />
  );
}

export function PillarTag({ id }: { id: string }) {
  const p = pillarOf(id);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        color: p.color,
        background: "color-mix(in srgb, " + p.color + " 14%, transparent)",
      }}
    >
      <PillarDot id={id} size={7} />
      {p.label}
    </span>
  );
}

/* ─── Scroll reveal ──────────────────────────────────────────────────── */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      setShown(true);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    // Nếu đã nằm trong khung nhìn ngay khi mount thì hiện luôn.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    io.observe(el);
    // Lưới an toàn: dù sao cũng hiện sau 600ms.
    const t = window.setTimeout(() => setShown(true), 600);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(12px)",
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────── */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-10 px-4">
      <div
        className="mx-auto mb-3 rounded-2xl flex items-center justify-center"
        style={{ width: 44, height: 44, background: "var(--chip)" }}
      >
        <Icon size={20} className="text-text-3" />
      </div>
      <p className="text-text text-[14px] font-semibold">{title}</p>
      {hint && <p className="text-text-3 text-[12.5px] mt-1 max-w-[320px] mx-auto leading-relaxed">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
