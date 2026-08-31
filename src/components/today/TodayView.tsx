"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Flame,
  Clock,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react";
import { StatChip } from "@/components/ui/bits";
import { useStore } from "@/lib/data/store";
import {
  addDays,
  fmtHours,
  fmtVN,
  parseKey,
  startOfWeek,
  toKey,
  todayKey,
} from "@/lib/domain/dates";
import { categoryTotals, dayStatsFromBlocks, copyWeekBlocks } from "@/lib/domain/stats";
import { computeStreak } from "@/lib/domain/streak";
import { dayBlocks } from "@/lib/domain/schedule";
import { TimelineDay } from "./TimelineDay";
import { AddBlockModal } from "./AddBlockModal";

export function TodayView() {
  const { goals, logs, setLogs } = useStore();
  const params = useSearchParams();
  const initialDate = params.get("date") || todayKey();
  const [dateKey, setDateKey] = useState(initialDate);
  const [addOpen, setAddOpen] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");

  const date = parseKey(dateKey);
  const streak = useMemo(() => computeStreak(goals, logs), [goals, logs]);
  const todayStats = dayStatsFromBlocks(todayKey(), goals, logs);
  const weekTotals = categoryTotals(goals, logs, addDays(new Date(), -6), new Date());
  const weekTotal = Object.values(weekTotals).reduce((a, b) => a + b, 0);

  const addBlock = ({
    goalId,
    start,
    duration,
  }: {
    goalId: string;
    start: number;
    duration: number;
  }) => {
    const blocks = dayBlocks(dateKey, logs);
    setLogs({
      ...logs,
      [dateKey]: {
        blocks: [
          ...blocks,
          {
            id: `b_${Date.now()}`,
            goalId,
            start,
            duration,
            completed: false,
            skipped: false,
            reason: "",
          },
        ],
      },
    });
  };

  const doCopyWeek = (weeksAhead: number) => {
    setLogs(copyWeekBlocks(logs, startOfWeek(date), weeksAhead));
    setCopyMsg(
      `Đã sao chép sang ${weeksAhead === 1 ? "tuần sau" : `${weeksAhead} tuần sau`}`,
    );
    setTimeout(() => setCopyMsg(""), 2500);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="eyebrow mb-1">Hôm nay</div>
        <h1 className="headline text-[22px]">Lịch trình trong ngày</h1>
      </div>

      <div className="flex gap-2.5">
        <StatChip icon={Flame} label="Streak" value={`${streak} ngày`} color="var(--work)" />
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
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setDateKey(toKey(addDays(date, -1)))}
          className="btn-ghost rounded-full p-2"
          aria-label="Ngày trước"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <div className="text-text text-[14px] font-bold">
            {dateKey === todayKey() ? "Hôm nay" : fmtVN(date)}
          </div>
          {dateKey !== todayKey() && (
            <div className="text-text-3 text-[11px]">{fmtVN(date)}</div>
          )}
        </div>
        <button
          onClick={() => setDateKey(toKey(addDays(date, 1)))}
          className="btn-ghost rounded-full p-2"
          aria-label="Ngày sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <TimelineDay dateKey={dateKey} onAddClick={() => setAddOpen(true)} />

      <div className="card" style={{ padding: 16 }}>
        <div className="flex items-center gap-2 mb-2">
          <Copy size={14} className="text-text-2" />
          <span className="text-text text-[12.5px] font-bold">
            Sao chép kế hoạch tuần này
          </span>
        </div>
        <p className="text-text-3 text-[11.5px] mb-2.5 leading-relaxed">
          Áp dụng lịch trình Thứ 2 – CN của tuần đang xem sang tuần kế tiếp để lên kế hoạch
          nhanh.
        </p>
        <div className="flex gap-2">
          {[1, 2, 3].map((w) => (
            <button
              key={w}
              onClick={() => doCopyWeek(w)}
              className="flex-1 rounded-xl py-2 text-xs font-bold"
              style={{ background: "var(--chip)", color: "var(--text)" }}
            >
              +{w} tuần
            </button>
          ))}
        </div>
        {copyMsg && (
          <p className="text-good text-[11.5px] font-bold mt-2">{copyMsg}</p>
        )}
      </div>

      {addOpen && (
        <AddBlockModal
          goals={goals}
          defaultTime={`${String(Math.min(23, new Date().getHours() + 1)).padStart(2, "0")}:00`}
          onAdd={addBlock}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}
