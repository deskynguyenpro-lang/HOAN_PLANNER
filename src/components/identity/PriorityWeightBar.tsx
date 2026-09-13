"use client";

import { PILLARS } from "@/lib/domain/pillars";
import type { PillarWeights } from "@/lib/domain/identity";

/** Thanh phân bổ ưu tiên nhiều màu — mỗi đoạn rộng theo đúng % trọng số. */
export function PriorityWeightBar({
  weights,
  compact = false,
}: {
  weights: PillarWeights;
  compact?: boolean;
}) {
  return (
    <div>
      <div
        className="w-full flex rounded-full overflow-hidden"
        style={{ height: compact ? 10 : 14, background: "var(--chip)" }}
      >
        {PILLARS.map((p) => {
          const pct = weights[p.id] ?? 0;
          if (pct <= 0) return null;
          return (
            <div
              key={p.id}
              style={{ width: `${pct}%`, background: p.color }}
              title={`${p.label}: ${pct}%`}
            />
          );
        })}
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {PILLARS.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 text-[11.5px] text-text-2">
              <span
                className="inline-block rounded-full"
                style={{ width: 8, height: 8, background: p.color }}
              />
              {p.label} <b className="num text-text">{weights[p.id] ?? 0}%</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
