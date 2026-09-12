"use client";

import { Briefcase, BookOpen, HeartPulse, FlaskConical, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/bits";
import { PILLARS } from "@/lib/domain/pillars";
import { fmtHours } from "@/lib/domain/dates";
import type { PillarWeekOverview } from "@/lib/domain/weekly";

const ICON: Record<string, LucideIcon> = {
  work: Briefcase,
  study: BookOpen,
  health: HeartPulse,
  research: FlaskConical,
};

/** Lưới 4 thẻ trụ cột: icon, mục tiêu tuần, thanh tiến độ, số buổi đã xong/tổng. */
export function PillarsOverview({ data }: { data: PillarWeekOverview[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {data.map((d) => {
        const p = PILLARS.find((x) => x.id === d.id)!;
        const Icon = ICON[d.id];
        const hasTarget = d.targetHours > 0;
        return (
          <Card key={d.id} className="card-hover p-4" style={{ borderRadius: 16 }}>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  width: 28,
                  height: 28,
                  background: `color-mix(in srgb, ${p.color} 16%, transparent)`,
                }}
              >
                <Icon size={14} strokeWidth={2.3} style={{ color: p.color }} />
              </span>
              <span className="text-text text-[13px] font-bold truncate">{p.label}</span>
            </div>

            {hasTarget ? (
              <>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="num text-[11.5px] text-text-2">
                    {fmtHours(d.doneHours)}{" "}
                    <span className="text-text-3">/ {fmtHours(d.targetHours)}</span>
                  </span>
                  <span
                    className="num text-[12px] font-bold"
                    style={{ color: p.color }}
                  >
                    {d.pct}%
                  </span>
                </div>
                <ProgressBar pct={d.pct} color={p.color} height={7} />
                <div className="text-text-3 text-[11px] mt-2 num">
                  {d.sessionsDone}/{d.sessionsTotal} buổi tuần này
                </div>
              </>
            ) : (
              <p className="text-text-3 text-[11.5px] leading-relaxed">
                Chưa có mục tiêu hằng ngày nào cho trụ cột này.
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
