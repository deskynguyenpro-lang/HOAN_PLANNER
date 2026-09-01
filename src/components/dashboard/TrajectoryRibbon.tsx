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

// Bố cục ma khi chưa có dữ liệu — vẫn "có hình" để trang không trống trơn.
const GHOST: { label: string; work: number; study: number; health: number; research: number }[] =
  [4, 6, 5, 8, 7, 9, 6, 10, 8, 11, 9, 12].map((n, i) => ({
    label: "",
    work: n * 0.4,
    study: n * 0.3,
    health: n * 0.2,
    research: n * 0.1 + (i % 3),
  }));

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
    <div className="card p-4 lg:p-5 overflow-hidden">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div>
          <div className="eyebrow mb-1">Dải quỹ đạo · 12 tuần</div>
          <h2 className="headline text-[15.5px]">Bạn đang đi đúng hướng chứ?</h2>
        </div>
        <div className="hidden sm:flex items-center gap-3 flex-wrap justify-end">
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
              style={{ width: 14, height: 3, background: ct.brand }}
            />
            Bám kế hoạch
          </span>
        </div>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={196}>
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
            <YAxis yAxisId="a" orientation="right" domain={[0, 100]} hide />
            <Tooltip
              contentStyle={ct.tooltip}
              cursor={{ fill: ct.grid }}
              formatter={(value: number, name: string) =>
                name === "Bám kế hoạch" ? [`${value}%`, name] : [fmtHours(value), name]
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
                isAnimationActive={false}
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
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="relative">
          <div style={{ opacity: 0.28, filter: "saturate(0.6)" }}>
            <ResponsiveContainer width="100%" height={196}>
              <ComposedChart data={GHOST} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid stroke={ct.grid} vertical={false} />
                <XAxis dataKey="label" tick={false} axisLine={{ stroke: ct.grid }} tickLine={false} />
                <YAxis hide />
                {PILLARS.map((p) => (
                  <Bar
                    key={p.id}
                    dataKey={p.id}
                    stackId="p"
                    fill={hex[p.id]}
                    radius={p.id === "research" ? [3, 3, 0, 0] : undefined}
                    isAnimationActive={false}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <p className="text-text text-[13px] font-semibold">Quỹ đạo của bạn sẽ hiện ở đây</p>
            <p className="text-text-3 text-[11.5px] mt-1 max-w-[340px] leading-relaxed">
              Mỗi cột là một tuần, chia theo 4 trụ cột; đường cam là tỷ lệ bám kế hoạch.
              Hoàn thành vài buổi trong tuần này để bắt đầu.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
