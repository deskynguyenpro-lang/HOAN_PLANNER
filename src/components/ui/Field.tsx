"use client";

import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="text-text-3 text-[11px] mt-1 leading-relaxed">{hint}</p>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field w-full px-3 py-2.5 text-sm ${props.className || ""}`} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`field w-full px-3 py-2.5 text-sm ${props.className || ""}`}
    />
  );
}

const WEEKDAYS = [
  { d: 1, label: "T2" },
  { d: 2, label: "T3" },
  { d: 3, label: "T4" },
  { d: 4, label: "T5" },
  { d: 5, label: "T6" },
  { d: 6, label: "T7" },
  { d: 0, label: "CN" },
];

export function DayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const toggle = (d: number) =>
    onChange(
      value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort(),
    );
  return (
    <div>
      <div className="flex gap-1.5 mb-1.5">
        <button
          type="button"
          onClick={() => onChange([1, 2, 3, 4, 5, 6, 0])}
          className="text-[10.5px] font-bold px-2 py-0.5 rounded-md"
          style={{ background: "var(--brand-dim)", color: "var(--brand)" }}
        >
          Mỗi ngày
        </button>
        <button
          type="button"
          onClick={() => onChange([1, 2, 3, 4, 5])}
          className="text-[10.5px] font-bold px-2 py-0.5 rounded-md"
          style={{ background: "var(--chip)", color: "var(--text-2)" }}
        >
          T2–T6
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w) => {
          const on = value.includes(w.d);
          return (
            <button
              key={w.d}
              type="button"
              onClick={() => toggle(w.d)}
              className="rounded-lg py-2 text-[11.5px] font-bold transition"
              style={{
                background: on ? "var(--brand)" : "var(--surface-2)",
                color: on ? "#fff" : "var(--text-2)",
                border: "1px solid var(--border)",
              }}
            >
              {w.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ChipSelect<T extends string | number>({
  options,
  value,
  onChange,
  format = (v) => String(v),
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = o === value;
        return (
          <button
            key={String(o)}
            type="button"
            onClick={() => onChange(o)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
            style={{
              background: on ? "var(--brand)" : "var(--chip)",
              color: on ? "#fff" : "var(--text-2)",
            }}
          >
            {format(o)}
          </button>
        );
      })}
    </div>
  );
}
