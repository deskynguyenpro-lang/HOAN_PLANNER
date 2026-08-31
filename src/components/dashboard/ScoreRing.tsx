"use client";

import { scoreLabel } from "@/lib/domain/weekly";

export function ScoreRing({
  score,
  size = 92,
  label = true,
}: {
  score: number;
  size?: number;
  label?: boolean;
}) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * c;
  const { text, tone } = scoreLabel(score);
  const color =
    tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : "var(--bad)";

  return (
    <div className="flex flex-col items-center">
      <div style={{ width: size, height: size, position: "relative" }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--chip)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.22,1,0.36,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="headline text-[20px] num" style={{ lineHeight: 1 }}>
            {score}
          </span>
          <span className="text-text-3 text-[9px] num">/100</span>
        </div>
      </div>
      {label && (
        <span
          className="mt-1.5 text-[11.5px] font-bold"
          style={{ color }}
        >
          {text}
        </span>
      )}
    </div>
  );
}
