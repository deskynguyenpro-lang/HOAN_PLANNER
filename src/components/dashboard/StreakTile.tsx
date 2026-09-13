"use client";

import { Flame, Trophy } from "lucide-react";

export function StreakTile({ streak, best }: { streak: number; best: number }) {
  return (
    <div
      className="card card-glass bento-hover card-hover p-4 lg:p-5 relative overflow-hidden"
      style={{ borderRadius: 18 }}
    >
      <span
        aria-hidden
        className="absolute -right-4 -top-4 opacity-[0.12]"
        style={{ color: "var(--work)" }}
      >
        <Flame size={100} strokeWidth={1.3} />
      </span>
      <div className="eyebrow mb-2">Chuỗi ngày liên tiếp</div>
      <div className="flex items-end gap-2">
        <Flame size={26} style={{ color: "var(--work)" }} fill="color-mix(in srgb, var(--work) 35%, transparent)" />
        <span className="display text-[36px] leading-none num">{streak}</span>
        <span className="text-text-3 text-[13px] mb-1">ngày</span>
      </div>
      <div className="flex items-center gap-1.5 mt-2.5 text-text-2 text-[11.5px]">
        <Trophy size={12} style={{ color: "var(--work)" }} /> Kỷ lục {best} ngày
      </div>
    </div>
  );
}
