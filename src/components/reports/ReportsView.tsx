"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Clock,
  BarChart3,
  Flame,
  Trophy,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  Target,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatChip, Segmented, ProgressBar, PillarDot } from "@/components/ui/bits";
import { useChartTheme } from "@/components/charts/theme";
import { useStore } from "@/lib/data/store";
import { PILLARS, pillarOf } from "@/lib/domain/pillars";
import { addDays, fmtHours, parseKey, toKey, todayKey } from "@/lib/domain/dates";
import {
  categoryTotals,
  dayStatsFromBlocks,
  objectiveProgress,
  hoursForGoalsInRange,
} from "@/lib/domain/stats";
import { computeStreak, longestStreak } from "@/lib/domain/streak";
import { WEEKDAYS_VI } from "@/lib/domain/dates";
import { AIInsightsCard } from "./AIInsightsCard";

export function ReportsView() {
  const { goals, logs, objectives } = useStore();
  const ct = useChartTheme();
  const today = new Date();
  const weekStart = addDays(today, -6);
  const [rangeDays, setRangeDays] = useState<7 | 30>(7);
  const rangeStart = addDays(today, -(rangeDays - 1));

  const pillarHex: Record<string, string> = {
    work: ct.work,
    study: ct.study,
    health: ct.health,
    research: ct.research,
  };

  const totals = useMemo(
    () => categoryTotals(goals, logs, rangeStart, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [goals, logs, rangeDays],
  );
  const totalAll = Object.values(totals).reduce((a, b) => a + b, 0);
  const ranked = PILLARS.map((p) => ({ ...p, hours: totals[p.id] || 0 })).sort(
    (a, b) => b.hours - a.hours,
  );
  const maxHours = Math.max(0.1, ranked[0]?.hours || 0.1);

  const weekTotals = categoryTotals(goals, logs, weekStart, today);
  const weekTotal = Object.values(weekTotals).reduce((a, b) => a + b, 0);
  const prevWeekTotals = categoryTotals(
    goals,
    logs,
    addDays(today, -13),
    addDays(today, -7),
  );
  const prevWeekTotal = Object.values(prevWeekTotals).reduce((a, b) => a + b, 0);
  const weekDelta =
    prevWeekTotal > 0
      ? Math.round(((weekTotal - prevWeekTotal) / prevWeekTotal) * 100)
      : weekTotal > 0
        ? 100
        : 0;
  const todayStats = dayStatsFromBlocks(todayKey(), goals, logs);
  const streak = useMemo(() => computeStreak(goals, logs), [goals, logs]);
  const bestStreak = useMemo(() => longestStreak(goals, logs), [goals, logs]);
  const sessionsThisWeek = useMemo(() => {
    let n = 0;
    Object.entries(logs).forEach(([dk, log]) => {
      const d = parseKey(dk);
      if (d < weekStart || d > today) return;
      (log.blocks || []).forEach((b) => {
        if (b.completed) n += 1;
      });
    });
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs]);

  const pieData = ranked
    .filter((c) => c.hours > 0)
    .map((c) => ({ name: c.label, value: c.hours, color: pillarHex[c.id] }));

  const last14 = useMemo(() => {
    const arr: Record<string, number | string>[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = addDays(today, -i);
      const dk = toKey(d);
      const row: Record<string, number | string> = {
        label: `${d.getDate()}/${d.getMonth() + 1}`,
      };
      PILLARS.forEach((p) => (row[p.id] = 0));
      (logs[dk]?.blocks || []).forEach((b) => {
        if (!b.completed) return;
        const g = goals.find((gg) => gg.id === b.goalId);
        const key = g ? g.category : "research";
        row[key] = (row[key] as number) + b.duration;
      });
      arr.push(row);
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, logs]);

  const activeObjectives = objectives.filter((o) => !o.archived);

  const weekdayPerf = useMemo(() => {
    const sums = Array(7).fill(0);
    const counts = Array(7).fill(0);
    Object.keys(logs).forEach((dk) => {
      const s = dayStatsFromBlocks(dk, goals, logs);
      if (s.hasData && s.pct !== null) {
        const wd = parseKey(dk).getDay();
        sums[wd] += s.pct;
        counts[wd] += 1;
      }
    });
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.map((wd) => ({
      label: WEEKDAYS_VI[wd],
      pct: counts[wd] ? Math.round(sums[wd] / counts[wd]) : 0,
      hasData: counts[wd] > 0,
    }));
  }, [goals, logs]);

  const reasonBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(logs).forEach((log) =>
      (log.blocks || []).forEach((b) => {
        if (b.skipped && b.reason)
          counts[b.reason] = (counts[b.reason] || 0) + 1;
      }),
    );
    return Object.entries(counts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }, [logs]);

  const hasAnyData = Object.keys(logs).length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <StatChip
          icon={Clock}
          label="Hôm nay"
          value={fmtHours(todayStats.totalCompleted)}
          color="var(--study)"
        />
        <StatChip
          icon={BarChart3}
          label="Tuần này"
          value={fmtHours(weekTotal)}
          color="var(--health)"
        />
        <StatChip
          icon={Flame}
          label="Streak"
          value={`${streak} ngày`}
          color="var(--work)"
        />
        <StatChip
          icon={Trophy}
          label="Kỷ lục"
          value={`${bestStreak} ngày`}
          color="var(--research)"
        />
      </div>

      <Card style={{ padding: 14 }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow mb-0.5">So với tuần trước</div>
            <div className="text-text-3 text-[11.5px] num">
              {fmtHours(prevWeekTotal)} → {fmtHours(weekTotal)} · {sessionsThisWeek} phiên
              hoàn thành
            </div>
          </div>
          <div
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5"
            style={{
              background:
                weekDelta >= 0
                  ? "color-mix(in srgb, var(--good) 14%, transparent)"
                  : "color-mix(in srgb, var(--bad) 14%, transparent)",
              color: weekDelta >= 0 ? "var(--good)" : "var(--bad)",
            }}
          >
            {weekDelta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span className="text-[13px] font-extrabold num">
              {weekDelta >= 0 ? "+" : ""}
              {weekDelta}%
            </span>
          </div>
        </div>
      </Card>

      <AIInsightsCard />

      {activeObjectives.length > 0 && (
        <Card>
          <CardHeader
            title="Hiệu quả theo mục tiêu lớn"
            icon={<Target size={16} className="text-brand" />}
          />
          <div className="space-y-3.5">
            {activeObjectives.map((o) => {
              const prog = objectiveProgress(o);
              const linkedIds = goals
                .filter((g) => g.objectiveId === o.id)
                .map((g) => g.id);
              const hours30 = hoursForGoalsInRange(
                linkedIds,
                logs,
                addDays(today, -29),
                today,
              );
              return (
                <div key={o.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-text text-[13px] font-bold">{o.name}</span>
                    <span className="text-text-2 text-[11.5px] num">
                      {fmtHours(hours30)} / 30 ngày
                    </span>
                  </div>
                  <ProgressBar pct={prog.pct} height={7} />
                  <div className="text-text-3 text-[11px] mt-1 num">
                    {prog.pct}% tiến độ · {prog.current}
                    {o.unit} / {o.targetValue}
                    {o.unit}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {!hasAnyData ? (
        <Card>
          <p className="text-text-2 text-[13.5px]">
            Chưa có dữ liệu. Hãy lên lịch và đánh dấu hoàn thành vài nhiệm vụ để xem báo
            cáo.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between mb-1">
              <h2 className="headline text-[15px] flex items-center gap-1.5">
                <PieIcon size={16} className="text-brand" /> Phân phối thời gian
              </h2>
              <Segmented
                size="sm"
                value={String(rangeDays) as "7" | "30"}
                onChange={(v) => setRangeDays(Number(v) as 7 | 30)}
                options={[
                  { value: "7", label: "7 ngày" },
                  { value: "30", label: "30 ngày" },
                ]}
              />
            </div>
            {pieData.length === 0 ? (
              <p className="text-text-3 text-[13px] mt-3">
                Chưa có mục nào hoàn thành trong khoảng này.
              </p>
            ) : (
              <div className="flex items-center gap-4 mt-2">
                <div className="relative flex-shrink-0" style={{ width: 132, height: 132 }}>
                  <ResponsiveContainer width={132} height={132}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        innerRadius={42}
                        outerRadius={64}
                        paddingAngle={2}
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {pieData.map((p, i) => (
                          <Cell key={i} fill={p.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="headline text-[17px] num">{fmtHours(totalAll)}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  {pieData.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: p.color,
                            flexShrink: 0,
                          }}
                        />
                        <span className="text-text-2 text-[12px] truncate">{p.name}</span>
                      </div>
                      <span className="text-text text-[12px] font-bold flex-shrink-0 ml-2 num">
                        {fmtHours(p.value)} · {Math.round((p.value / totalAll) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Thời gian tập trung theo trụ cột"
              icon={<TrendingUp size={16} className="text-brand" />}
            />
            <div className="space-y-3">
              {ranked.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <PillarDot id={c.id} size={9} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-text text-[12.5px] font-semibold">
                        {c.label}
                      </span>
                      <span className="text-text-2 text-[12px] font-bold num">
                        {fmtHours(c.hours)}
                      </span>
                    </div>
                    <ProgressBar
                      pct={(c.hours / maxHours) * 100}
                      height={7}
                      color={pillarHex[c.id]}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="headline text-[15px] mb-1">Biểu đồ 14 ngày gần đây</h2>
            <p className="text-text-3 text-[12px] mb-3">
              Thời gian hoàn thành mỗi ngày, theo trụ cột
            </p>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={last14} margin={{ top: 5, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid stroke={ct.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: ct.axis, fontSize: 9.5 }}
                  interval={1}
                  axisLine={{ stroke: ct.grid }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: ct.axis, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={ct.tooltip} cursor={{ fill: ct.grid }} />
                {PILLARS.map((p) => (
                  <Bar
                    key={p.id}
                    dataKey={p.id}
                    stackId="a"
                    fill={pillarHex[p.id]}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="headline text-[15px] mb-1">Hiệu suất theo ngày trong tuần</h2>
            <p className="text-text-3 text-[12px] mb-3">
              Ngày nào bạn thường làm tốt / hay hụt mục tiêu
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={weekdayPerf}
                margin={{ top: 5, right: 4, left: -24, bottom: 0 }}
              >
                <CartesianGrid stroke={ct.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: ct.axis, fontSize: 11 }}
                  axisLine={{ stroke: ct.grid }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: ct.axis, fontSize: 10 }}
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={ct.tooltip} cursor={{ fill: ct.grid }} />
                <Bar dataKey="pct" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  {weekdayPerf.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        !d.hasData
                          ? ct.grid
                          : d.pct >= 80
                            ? ct.good
                            : d.pct >= 50
                              ? ct.warn
                              : ct.bad
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {reasonBreakdown.length > 0 && (
            <Card>
              <h2 className="headline text-[15px] mb-1">Nguyên nhân bỏ lỡ</h2>
              <p className="text-text-3 text-[12px] mb-3">
                Lý do bạn đã ghi nhận khi bỏ qua nhiệm vụ
              </p>
              <div className="space-y-2">
                {reasonBreakdown.map((r) => (
                  <div key={r.reason}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-text-2 text-[12.5px]">{r.reason}</span>
                      <span className="text-text-3 text-[12px] num">{r.count}</span>
                    </div>
                    <ProgressBar
                      pct={(r.count / reasonBreakdown[0].count) * 100}
                      height={6}
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
