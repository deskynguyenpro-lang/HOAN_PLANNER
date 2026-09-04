"use client";

import { Pencil, Trash2, Repeat } from "lucide-react";
import { PillarDot } from "@/components/ui/bits";
import { pillarOf } from "@/lib/domain/pillars";
import { decToLabel, fmtHours, fmtShort, parseKey } from "@/lib/domain/dates";
import { effectiveSchedule } from "@/lib/domain/schedule";
import type { Goal, Objective } from "@/lib/domain/types";

const WEEKDAY_LABEL: Record<number, string> = {
  0: "CN",
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
};

export function GoalRow({
  goal,
  objective,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  objective?: Objective;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const p = pillarOf(goal.category);
  const sch = effectiveSchedule(goal);
  const dayLabel =
    sch.days.length === 7
      ? "hằng ngày"
      : [...sch.days].sort().map((d) => WEEKDAY_LABEL[d]).join(", ");
  const rangeLabel = sch.toDate
    ? `${fmtShort(parseKey(sch.fromDate))} → ${fmtShort(parseKey(sch.toDate))}`
    : `từ ${fmtShort(parseKey(sch.fromDate))}`;

  return (
    <div
      className="flex items-center justify-between rounded-xl px-3.5 py-3 gap-3"
      style={{ background: "color-mix(in srgb, " + p.color + " 12%, transparent)" }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <PillarDot id={goal.category} size={9} />
        <div className="min-w-0">
          <div className="text-text text-[13.5px] font-semibold truncate">{goal.name}</div>
          <div className="text-[11.5px] font-semibold" style={{ color: p.color }}>
            {p.label} · {fmtHours(goal.target)}/ngày
            {objective ? ` · hướng tới "${objective.name}"` : ""}
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-text-3 text-[11px]">
            <Repeat size={10} />
            <span>
              {decToLabel(sch.start)} · {dayLabel} · {rangeLabel}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onEdit} className="p-2 rounded-lg text-text-2 hover:text-text hover:bg-chip" aria-label="Sửa">
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg text-text-3 hover:text-bad hover:bg-chip"
          aria-label="Xoá"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
