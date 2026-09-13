"use client";

import Link from "next/link";
import { Check, CalendarClock, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/bits";
import { useStore } from "@/lib/data/store";
import { pillarOf } from "@/lib/domain/pillars";
import { decToLabel, fmtHours, toKey } from "@/lib/domain/dates";
import { getEffectiveBlocks, materializeAndUpdate } from "@/lib/domain/schedule";

/** Xem nhanh 3-4 việc tiếp theo hôm nay, đánh dấu xong ngay tại đây. */
export function TodayQuickTimeline() {
  const { goals, logs, setLogs } = useStore();
  const todayKey = toKey(new Date());
  const goalMap = Object.fromEntries(goals.map((g) => [g.id, g]));

  const blocks = getEffectiveBlocks(todayKey, goals, logs)
    .filter((b) => !b.hidden && !b.skipped)
    .sort((a, b) => a.start - b.start);

  // Ưu tiên việc chưa xong, gần giờ hiện tại nhất; đủ 4 dòng thì lấp bằng việc đã xong.
  const nowDec = new Date().getHours() + new Date().getMinutes() / 60;
  const pending = blocks.filter((b) => !b.completed);
  const done = blocks.filter((b) => b.completed);
  const upcoming = [...pending].sort(
    (a, b) => Math.abs(a.start - nowDec) - Math.abs(b.start - nowDec),
  );
  const shown = [...upcoming, ...done].slice(0, 4).sort((a, b) => a.start - b.start);

  const toggle = (id: string, completed: boolean) =>
    setLogs(materializeAndUpdate(todayKey, id, blocks, logs, { completed: !completed }));

  return (
    <div className="card card-glass p-4 lg:p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="headline text-[14.5px] flex items-center gap-1.5">
          <CalendarClock size={15} className="text-brand" /> Việc tiếp theo hôm nay
        </h2>
        <Link
          href="/hom-nay"
          className="text-brand text-[11.5px] font-bold flex items-center gap-1 flex-shrink-0"
        >
          Xem cả ngày <ArrowRight size={12} />
        </Link>
      </div>

      {blocks.length === 0 ? (
        <div className="flex-1 flex items-center">
          <EmptyState
            icon={CalendarClock}
            title="Hôm nay chưa có việc nào"
            hint="Thêm mục tiêu hằng ngày ở trang Kế hoạch để lịch trình tự lấp đầy."
          />
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((b) => {
            const g = goalMap[b.goalId];
            if (!g) return null;
            const p = pillarOf(g.category);
            return (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{
                  background: b.completed
                    ? "color-mix(in srgb, var(--good) 10%, transparent)"
                    : `color-mix(in srgb, ${p.color} 10%, transparent)`,
                }}
              >
                <button
                  onClick={() => toggle(b.id, b.completed)}
                  className="rounded-full flex items-center justify-center flex-shrink-0 transition"
                  style={{
                    width: 24,
                    height: 24,
                    background: b.completed ? "var(--good)" : "var(--surface)",
                    border: b.completed ? "none" : `1.5px solid ${p.color}`,
                  }}
                  aria-label={b.completed ? "Bỏ đánh dấu hoàn thành" : "Đánh dấu hoàn thành"}
                >
                  <Check size={13} style={{ color: b.completed ? "#fff" : p.color }} />
                </button>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-text text-[13px] font-semibold truncate"
                    style={{
                      textDecoration: b.completed ? "line-through" : "none",
                      opacity: b.completed ? 0.6 : 1,
                    }}
                  >
                    {g.name}
                  </div>
                  <div className="text-text-3 text-[11px] num">
                    {decToLabel(b.start)} · {fmtHours(b.duration)} · {p.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
