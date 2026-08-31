"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useChartTheme } from "@/components/charts/theme";
import { PILLARS } from "@/lib/domain/pillars";
import { fmtHours } from "@/lib/domain/dates";
import type { trajectoryData } from "@/lib/domain/weekly";

type Row = ReturnType<typeof trajectoryData>[number];

export function TrajectoryRibbon({ rows }: { rows: Row[] }) {
  const ct = useChartTheme();
  const hex: Record<string, string> = {
    work: ct.work,
    study: ct.study,
    health: ct.health,
    research: ct.research,
  };
  const hasData = rows.some((r) => r.total > 0);

  return (
    <div className="card p-4 lg:p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="eyebrow mb-1">Dải quỹ đạo · 12 tuần</div>
          <h2 className="headline text-[15px]">Bạn đang đi đúng hướng chứ?</h2>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          {PILLARS.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 text-[11px] text-text-2">
              <span
                className="inline-block rounded-full"
                style={{ width: 8, height: 8, background: p.color }}
              />
              {p.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-[11px] text-text-2">
            <span
              className="inline-block rounded-full"
              style={{ width: 8, height: 8, background: ct.brand }}
            />
            Bám kế hoạch
          </span>
        </div>
      </div>

      {!hasData ? (
        <p className="text-text-3 text-[12.5px] py-8 text-center">
          Chưa đủ dữ liệu để vẽ quỹ đạo — hoàn thành vài buổi trong tuần này để bắt đầu.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={190}>
          <ComposedChart data={rows} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid stroke={ct.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: ct.axis, fontSize: 9.5 }}
              axisLine={{ stroke: ct.grid }}
              tickLine={false}
            />
            <YAxis
              yAxisId="h"
              tick={{ fill: ct.axis, fontSize: 9.5 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="a"
              orientation="right"
              domain={[0, 100]}
              hide
            />
            <Tooltip
              contentStyle={ct.tooltip}
              cursor={{ fill: ct.grid }}
              formatter={(value: number, name: string) =>
                name === "Bám kế hoạch"
                  ? [`${value}%`, name]
                  : [fmtHours(value), name]
              }
            />
            {PILLARS.map((p) => (
              <Bar
                key={p.id}
                yAxisId="h"
                dataKey={p.id}
                name={p.label}
                stackId="p"
                fill={hex[p.id]}
                radius={p.id === "research" ? [3, 3, 0, 0] : undefined}
              />
            ))}
            <Line
              yAxisId="a"
              type="monotone"
              dataKey="adherence"
              name="Bám kế hoạch"
              stroke={ct.brand}
              strokeWidth={2}
              dot={{ r: 2.5 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
