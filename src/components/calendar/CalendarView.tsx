"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/bits";
import { useStore } from "@/lib/data/store";
import {
  MONTHS_VI,
  WEEKDAYS_VI_MON_FIRST,
  fmtHours,
  parseKey,
  toKey,
  todayKey,
} from "@/lib/domain/dates";
import { dayStatsFromBlocks } from "@/lib/domain/stats";
import type { Goal, Logs } from "@/lib/domain/types";

function DayCircle({
  dk,
  goals,
  logs,
  onClick,
  size = 36,
  showLabel = true,
}: {
  dk: string;
  goals: Goal[];
  logs: Logs;
  onClick?: (dk: string) => void;
  size?: number;
  showLabel?: boolean;
}) {
  const s = dayStatsFromBlocks(dk, goals, logs);
  const d = parseKey(dk);
  const isFuture = d > new Date();
  const isToday = dk === todayKey();
  const active = s.hasData && s.totalCompleted > 0;
  const pct = s.pct ?? 0;
  const bg = active
    ? pct >= 100
      ? "var(--brand)"
      : pct >= 50
        ? "color-mix(in srgb, var(--brand) 62%, var(--surface))"
        : "color-mix(in srgb, var(--brand) 26%, var(--surface))"
    : "transparent";
  const fg = active && pct >= 50 ? "#fff" : "var(--text-2)";
  return (
    <button
      disabled={isFuture}
      onClick={() => !isFuture && onClick?.(dk)}
      className="rounded-full flex items-center justify-center flex-shrink-0 num transition"
      style={{
        width: size,
        height: size,
        background: isFuture ? "transparent" : bg,
        border: isToday
          ? "2px solid var(--brand)"
          : active
            ? "none"
            : "1px solid var(--border)",
        color: isFuture ? "var(--text-3)" : fg,
        fontSize: size * 0.34,
        fontWeight: 700,
        opacity: isFuture ? 0.35 : 1,
        cursor: isFuture ? "default" : "pointer",
      }}
    >
      {showLabel ? d.getDate() : ""}
    </button>
  );
}

function MonthGrid({
  year,
  month,
  goals,
  logs,
  onDayClick,
  mini = false,
}: {
  year: number;
  month: number;
  goals: Goal[];
  logs: Logs;
  onDayClick?: (dk: string) => void;
  mini?: boolean;
}) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const size = mini ? 22 : 36;
  return (
    <div>
      {!mini && (
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS_VI_MON_FIRST.map((w) => (
            <div
              key={w}
              className="eyebrow text-center"
              style={{ fontSize: 10 }}
            >
              {w}
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-7 gap-y-2" style={{ justifyItems: "center" }}>
        {cells.map((d, i) =>
          d === null ? (
            <div key={i} style={{ width: size, height: size }} />
          ) : (
            <DayCircle
              key={i}
              dk={toKey(new Date(year, month, d))}
              goals={goals}
              logs={logs}
              onClick={onDayClick}
              size={size}
              showLabel={!mini}
            />
          ),
        )}
      </div>
    </div>
  );
}

export function CalendarView() {
  const { goals, logs } = useStore();
  const router = useRouter();
  const [mode, setMode] = useState<"month" | "year">("month");
  const [cursor, setCursor] = useState(new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const openDay = (dk: string) => router.push(`/hom-nay?date=${dk}`);

  const monthStats = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let totalHours = 0;
    let activeDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const s = dayStatsFromBlocks(toKey(new Date(year, month, d)), goals, logs);
      if (s.hasData) {
        activeDays += 1;
        totalHours += s.totalCompleted;
      }
    }
    return { totalHours, activeDays };
  }, [goals, logs, year, month]);

  return (
    <div className="space-y-4">
      <div>
        <div className="eyebrow mb-1">Lịch</div>
        <h1 className="headline text-[22px]">Bức tranh theo tháng &amp; năm</h1>
      </div>

      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "month", label: "Tháng" },
          { value: "year", label: "Năm" },
        ]}
      />

      {mode === "month" ? (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="headline text-[15px]">
              Tháng {month + 1}, {year}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="btn-ghost p-1.5 rounded-lg"
                aria-label="Tháng trước"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="btn-ghost p-1.5 rounded-lg"
                aria-label="Tháng sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <MonthGrid
            year={year}
            month={month}
            goals={goals}
            logs={logs}
            onDayClick={openDay}
          />
          <div
            className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="rounded-xl p-3"
              style={{ background: "var(--brand-dim)" }}
            >
              <div className="eyebrow text-brand">Tổng giờ</div>
              <div className="headline text-[18px] num mt-0.5">
                {fmtHours(monthStats.totalHours)}
              </div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "var(--chip)" }}>
              <div className="eyebrow">Ngày hoạt động</div>
              <div className="headline text-[18px] num mt-0.5">
                {monthStats.activeDays}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MONTHS_VI.map((label, m) => (
            <Card key={m} style={{ padding: 12 }}>
              <div className="eyebrow mb-2">{label}</div>
              <MonthGrid year={year} month={m} goals={goals} logs={logs} mini />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
