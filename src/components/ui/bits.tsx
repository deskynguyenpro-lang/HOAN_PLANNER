"use client";

import type { ReactNode } from "react";
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
      className="card card-hover relative overflow-hidden flex-1 min-w-0 p-4"
      style={{ borderRadius: 16 }}
    >
      {/* vệt màu trụ cột phía trên */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 30%, transparent))`,
        }}
      />
      {/* icon mờ làm nền */}
      <Icon
        aria-hidden
        size={62}
        strokeWidth={1.4}
        className="absolute -right-3 -bottom-3 opacity-[0.07]"
        style={{ color }}
      />
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            width: 24,
            height: 24,
            background: `color-mix(in srgb, ${color} 16%, transparent)`,
          }}
        >
          <Icon size={13} strokeWidth={2.4} style={{ color }} />
        </span>
        <span className="eyebrow" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="display text-[24px] num text-text">{value}</div>
      {sub && <div className="text-text-3 text-[11px] mt-1 leading-snug">{sub}</div>}
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

/* ─── Reveal — bọc nội dung, KHÔNG ẩn (giữ chỗ cho hiệu ứng vào trang) ──── */
export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
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
        className="mx-auto mb-3.5 rounded-2xl flex items-center justify-center"
        style={{
          width: 52,
          height: 52,
          background:
            "linear-gradient(155deg, color-mix(in srgb, var(--brand) 22%, transparent), color-mix(in srgb, var(--study) 16%, transparent))",
          border: "1px solid var(--border)",
        }}
      >
        <Icon size={22} className="text-text-2" strokeWidth={1.8} />
      </div>
      <p className="headline text-[15px]">{title}</p>
      {hint && (
        <p className="text-text-3 text-[12.5px] mt-1.5 max-w-[340px] mx-auto leading-relaxed">
          {hint}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
