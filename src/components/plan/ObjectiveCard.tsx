"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar, PillarDot } from "@/components/ui/bits";
import { useChartTheme } from "@/components/charts/theme";
import { useStore } from "@/lib/data/store";
import { objectiveProgress, hoursForGoalsInRange } from "@/lib/domain/stats";
import { addDays, fmtHours, fmtShort, parseKey } from "@/lib/domain/dates";
import type { Objective } from "@/lib/domain/types";

export function ObjectiveCard({
  objective,
  onEdit,
  onDelete,
  onCheckin,
}: {
  objective: Objective;
  onEdit: (o: Objective) => void;
  onDelete: (id: string) => void;
  onCheckin: (o: Objective) => void;
}) {
  const { goals, logs } = useStore();
  const [open, setOpen] = useState(false);
  const ct = useChartTheme();
  const prog = objectiveProgress(objective);
  const linkedGoals = goals.filter((g) => g.objectiveId === objective.id && !g.archived);
  const linkedIds = linkedGoals.map((g) => g.id);
  const hours30 = hoursForGoalsInRange(linkedIds, logs, addDays(new Date(), -29), new Date());
  const chartData = prog.sorted.map((c) => ({ label: fmtShort(parseKey(c.date)), value: c.value }));

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <button
        className="w-full text-left px-5 py-4 flex items-center justify-between"
        onClick={() => setOpen(!open)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="headline text-[14.5px] truncate">{objective.name}</span>
            {prog.daysLeft !== null && (
              <span
                className="text-[10.5px] font-bold num flex-shrink-0"
                style={{ color: prog.daysLeft < 14 ? "var(--brand)" : "var(--text-3)" }}
              >
                {prog.daysLeft >= 0 ? `còn ${prog.daysLeft} ngày` : "quá hạn"}
              </span>
            )}
          </div>
          <ProgressBar pct={prog.pct} />
          <div className="text-text-2 text-[12px] mt-1.5 num">
            {prog.current}
            {objective.unit} → {objective.targetValue}
            {objective.unit} · <span className="text-brand font-bold">{prog.pct}%</span>
          </div>
        </div>
        {open ? (
          <ChevronUp size={18} className="text-text-3 ml-2 flex-shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-text-3 ml-2 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
          {chartData.length >= 2 && (
            <div className="mt-3 mb-2">
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData} margin={{ top: 5, right: 8, left: -28, bottom: 0 }}>
                  <CartesianGrid stroke={ct.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: ct.axis, fontSize: 10 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                  <YAxis tick={{ fill: ct.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={ct.tooltip} />
                  <Line type="monotone" dataKey="value" stroke={ct.brand} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div
            className="rounded-xl p-3 mb-3"
            style={{ background: "color-mix(in srgb, var(--good) 12%, transparent)" }}
          >
            <span className="eyebrow" style={{ color: "var(--good)" }}>
              Đã đầu tư 30 ngày qua:{" "}
            </span>
            <span className="headline text-[12.5px] num">{fmtHours(hours30)}</span>
          </div>
          {linkedGoals.length > 0 ? (
            <div className="space-y-1.5 mb-3">
              {linkedGoals.map((g) => (
                <div key={g.id} className="flex items-center gap-2">
                  <PillarDot id={g.category} size={8} />
                  <span className="text-text-2 text-[12px]">
                    {g.name} · {fmtHours(g.target)}/ngày
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-3 text-[11.5px] mb-3">
              Chưa có mục tiêu ngày nào hướng tới mục tiêu này — thêm ở mục "Mục tiêu hằng
              ngày" bên dưới.
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={() => onCheckin(objective)} className="btn-primary flex-1 py-2 text-xs">
              Cập nhật tiến độ
            </button>
            <button onClick={() => onEdit(objective)} className="btn-ghost px-3 py-2" aria-label="Sửa">
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(objective.id)}
              className="btn-ghost px-3 py-2 hover:text-bad"
              aria-label="Xoá"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
