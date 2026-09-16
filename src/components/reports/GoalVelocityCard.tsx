"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { AlertTriangle, CheckCircle2, TrendingDown, Zap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/bits";
import { useChartTheme } from "@/components/charts/theme";
import { parseKey, pad, fmtHours } from "@/lib/domain/dates";
import type { Goal, Logs, Objective } from "@/lib/domain/types";
import { calculatePredictiveVelocity, objectiveProgress, hoursForGoalsInRange } from "@/lib/domain/stats";
import { diagnoseStrategyVsExecution } from "@/lib/domain/strategyDiagnosis";
import { addDays } from "@/lib/domain/dates";
import { Target } from "lucide-react";

function fmtFullDate(dateKey: string): string {
  const d = parseKey(dateKey);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const VERDICT_META = {
  STRATEGY_PROBLEM: { icon: TrendingDown, color: "var(--bad)", label: "Cần đổi chiến thuật" },
  EXECUTION_FRICTION: { icon: AlertTriangle, color: "var(--warn)", label: "Lịch đang quá tải" },
  ON_TRACK: { icon: CheckCircle2, color: "var(--good)", label: "Đúng hướng" },
  NOT_ENOUGH_DATA: { icon: Zap, color: "var(--text-3)", label: "Chưa đủ dữ liệu" },
} as const;

export function GoalVelocityCard({
  objective,
  goals,
  logs,
}: {
  objective: Objective;
  goals: Goal[];
  logs: Logs;
}) {
  const ct = useChartTheme();
  const today = new Date();

  const velocity = useMemo(() => calculatePredictiveVelocity(objective, 30, today), [objective]);
  const diagnosis = useMemo(
    () => diagnoseStrategyVsExecution(objective, goals, logs, 30, today),
    [objective, goals, logs],
  );
  const prog = useMemo(() => objectiveProgress(objective), [objective]);
  const linkedIds = useMemo(
    () => goals.filter((g) => g.objectiveId === objective.id).map((g) => g.id),
    [goals, objective.id],
  );
  const hours30 = useMemo(
    () => hoursForGoalsInRange(linkedIds, logs, addDays(today, -29), today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [linkedIds, logs],
  );

  const verdict = VERDICT_META[diagnosis.verdict];
  const VerdictIcon = verdict.icon;

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <span className="text-text text-[13px] font-bold">{objective.name}</span>
        <span className="text-text-2 text-[11.5px] num">{fmtHours(hours30)} / 30 ngày</span>
      </div>
      <ProgressBar pct={prog.pct} height={7} />
      <div className="text-text-3 text-[11px] mt-1 num">
        {prog.pct}% tiến độ · {prog.current}
        {objective.unit} / {objective.targetValue}
        {objective.unit}
      </div>

      {velocity.hasEnoughData && velocity.predictedCompletionDate && (
        <div
          className="rounded-xl px-3 py-2.5 mt-3 text-[12px] leading-relaxed"
          style={{
            background:
              velocity.lateDays !== null && velocity.lateDays > 0
                ? "color-mix(in srgb, var(--warn) 10%, transparent)"
                : "color-mix(in srgb, var(--good) 10%, transparent)",
            color: velocity.lateDays !== null && velocity.lateDays > 0 ? "var(--warn)" : "var(--good)",
          }}
        >
          Với tốc độ hiện tại (~{Math.abs(velocity.actualCompletionRatePctPerDay).toFixed(1)}%/ngày), mục
          tiêu dự kiến hoàn thành vào <b>{fmtFullDate(velocity.predictedCompletionDate)}</b>
          {velocity.lateDays !== null &&
            (velocity.lateDays > 0 ? (
              <> — trễ khoảng <b>{velocity.lateDays} ngày</b> so với mốc đặt ra.</>
            ) : (
              <> — đúng hoặc sớm hơn mốc đặt ra.</>
            ))}
        </div>
      )}

      {velocity.chartSeries.length >= 2 && (
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={velocity.chartSeries} margin={{ top: 5, right: 4, left: -30, bottom: 0 }}>
              <CartesianGrid stroke={ct.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: ct.axis, fontSize: 9 }}
                axisLine={{ stroke: ct.grid }}
                tickLine={false}
                tickFormatter={(v: string) => fmtFullDate(v).slice(0, 5)}
              />
              <YAxis domain={[0, 100]} tick={{ fill: ct.axis, fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={ct.tooltip}
                labelFormatter={(v: string) => fmtFullDate(v)}
                formatter={(value: number, name: string) => [`${Math.round(value)}%`, name]}
              />
              <Line
                type="linear"
                dataKey="planned"
                stroke={ct.axis}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
                isAnimationActive={false}
                name="Kế hoạch"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke={ct.brand}
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls
                isAnimationActive={false}
                name="Thực tế"
              />
              <Line
                type="monotone"
                dataKey="projected"
                stroke={ct.warn}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
                isAnimationActive={false}
                name="Dự báo"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {diagnosis.verdict !== "NOT_ENOUGH_DATA" && (
        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2.5 mt-3 text-[11.5px] leading-relaxed"
          style={{ background: "var(--chip)" }}
        >
          <VerdictIcon size={14} className="flex-shrink-0 mt-0.5" style={{ color: verdict.color }} />
          <div>
            <span className="font-bold" style={{ color: verdict.color }}>
              {verdict.label}
            </span>
            <span className="text-text-2"> — {diagnosis.message}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

export function GoalVelocitySection({ objectives, goals, logs }: { objectives: Objective[]; goals: Goal[]; logs: Logs }) {
  const active = objectives.filter((o) => !o.archived);
  if (active.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="headline text-[15px] flex items-center gap-1.5">
        <Target size={16} className="text-brand" /> Dự báo tiến độ mục tiêu lớn
      </h2>
      {active.map((o) => (
        <GoalVelocityCard key={o.id} objective={o} goals={goals} logs={logs} />
      ))}
    </div>
  );
}
