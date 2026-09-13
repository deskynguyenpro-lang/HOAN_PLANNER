"use client";

import { Briefcase, BookOpen, HeartPulse, FlaskConical, type LucideIcon } from "lucide-react";
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

/** Lưới Bento 4 trụ cột: icon trong viên màu, số % lớn đậm, thanh tiến độ, số buổi. */
export function PillarsOverview({ data }: { data: PillarWeekOverview[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {data.map((d) => {
        const p = PILLARS.find((x) => x.id === d.id)!;
        const Icon = ICON[d.id];
        const hasTarget = d.targetHours > 0;
        return (
          <div
            key={d.id}
            className="card card-glass card-hover bento-hover relative overflow-hidden p-4"
            style={{ borderRadius: 18 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span
                className="rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  width: 30,
                  height: 30,
                  background: `color-mix(in srgb, ${p.color} 15%, transparent)`,
                }}
              >
                <Icon size={15} strokeWidth={2.3} style={{ color: p.color }} />
              </span>
              <span className="text-text-2 text-[12px] font-bold truncate">{p.label}</span>
            </div>

            {hasTarget ? (
              <>
                <div className="display text-[32px] leading-none num mb-1" style={{ color: p.color }}>
                  {d.pct}
                  <span className="text-[16px] text-text-3">%</span>
                </div>
                <div className="num text-[11px] text-text-3 mb-3">
                  {fmtHours(d.doneHours)} / {fmtHours(d.targetHours)} mục tiêu tuần
                </div>
                <ProgressBar pct={d.pct} color={p.color} height={6} />
                <div className="text-text-3 text-[11px] mt-2.5 num">
                  {d.sessionsDone}/{d.sessionsTotal} buổi tuần này
                </div>
              </>
            ) : (
              <>
                <div className="display text-[32px] leading-none num mb-1 text-text-3">—</div>
                <p className="text-text-3 text-[11.5px] leading-relaxed">
                  Chưa có mục tiêu hằng ngày.
                </p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
