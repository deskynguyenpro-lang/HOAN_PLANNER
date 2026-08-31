"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X, Trash2, Plus, Repeat } from "lucide-react";
import { pillarOf } from "@/lib/domain/pillars";
import { decToLabel, fmtHours, pad } from "@/lib/domain/dates";
import {
  getEffectiveBlocks,
  layoutDayBlocks,
  materializeAndUpdate,
} from "@/lib/domain/schedule";
import { useStore } from "@/lib/data/store";
import { ReasonModal } from "./ReasonModal";

const HOUR_START = 5;
const HOUR_END = 24;
const ROW_H = 54;

export function TimelineDay({
  dateKey,
  onAddClick,
}: {
  dateKey: string;
  onAddClick: () => void;
}) {
  const { goals, logs, setLogs } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reasonFor, setReasonFor] = useState<string | null>(null);

  const blocks = getEffectiveBlocks(dateKey, goals, logs).filter((b) => !b.hidden);
  const goalMap = Object.fromEntries(goals.map((g) => [g.id, g]));

  useEffect(() => {
    if (scrollRef.current) {
      const h = new Date().getHours();
      scrollRef.current.scrollTop = Math.max(0, (h - HOUR_START - 1) * ROW_H);
    }
  }, [dateKey]);

  const updateBlock = (id: string, patch: Parameters<typeof materializeAndUpdate>[4]) =>
    setLogs(materializeAndUpdate(dateKey, id, blocks, logs, patch));
  const hideBlock = (id: string) =>
    setLogs(materializeAndUpdate(dateKey, id, blocks, logs, { hidden: true }));

  const hours: number[] = [];
  for (let h = HOUR_START; h < HOUR_END; h++) hours.push(h);
  const completedList = blocks
    .filter((b) => b.completed)
    .sort((a, b) => a.start - b.start);

  return (
    <div className="card overflow-hidden" style={{ padding: 0 }}>
      <div className="flex items-center justify-between px-4 lg:px-5 pt-4 pb-3">
        <div className="flex gap-6">
          <span className="text-text text-[13px] font-bold">Kế hoạch</span>
          <span className="text-text-3 text-[13px] font-bold hidden sm:inline">
            Đã hoàn thành
          </span>
        </div>
        <button
          onClick={onAddClick}
          className="rounded-full p-1.5"
          style={{ background: "var(--brand-dim)", color: "var(--brand)" }}
          aria-label="Thêm nhiệm vụ"
        >
          <Plus size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="flex overflow-y-auto" style={{ maxHeight: 480 }}>
        <div
          className="relative flex-1 border-r"
          style={{ borderColor: "var(--border)", minWidth: 0 }}
        >
          {hours.map((h) => (
            <div
              key={h}
              className="flex"
              style={{ height: ROW_H, borderTop: "1px solid var(--border)" }}
            >
              <div
                className="num"
                style={{
                  width: 44,
                  color: "var(--text-3)",
                  fontSize: 10.5,
                  paddingTop: 2,
                  paddingLeft: 8,
                  flexShrink: 0,
                }}
              >
                {pad(h)}:00
              </div>
              <div className="flex-1" />
            </div>
          ))}

          {layoutDayBlocks(blocks).map(({ block: b, col, totalCols }) => {
            const g = goalMap[b.goalId];
            if (!g) return null;
            const p = pillarOf(g.category);
            const top = (b.start - HOUR_START) * ROW_H;
            const height = Math.max(32, b.duration * ROW_H - 4);
            const skipped = b.skipped;
            const GAP = 5;
            const leftBase = 48;
            const rightBase = 8;
            const trackExpr = `(100% - ${leftBase + rightBase}px - ${(totalCols - 1) * GAP}px)`;
            const width = `calc(${trackExpr} / ${totalCols})`;
            const left = `calc(${leftBase}px + ${col} * (${trackExpr} / ${totalCols} + ${GAP}px))`;

            return (
              <div
                key={b.id}
                className="absolute rounded-lg px-2 py-1 flex items-center justify-between gap-1"
                style={{
                  left,
                  width,
                  top,
                  height,
                  background: b.completed
                    ? p.color
                    : skipped
                      ? "var(--surface)"
                      : "color-mix(in srgb, " + p.color + " 16%, var(--surface))",
                  border: skipped
                    ? "1.5px dashed var(--text-3)"
                    : "1px solid color-mix(in srgb, " + p.color + " 40%, transparent)",
                  opacity: skipped ? 0.7 : 1,
                  zIndex: 1,
                }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    {b.virtual && (
                      <Repeat
                        size={9}
                        style={{
                          color: b.completed ? "rgba(255,255,255,0.85)" : p.color,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div
                      className="truncate"
                      style={{
                        color: b.completed
                          ? "#fff"
                          : skipped
                            ? "var(--text-3)"
                            : "var(--text)",
                        fontSize: 11.5,
                        fontWeight: 700,
                        textDecoration: skipped ? "line-through" : "none",
                      }}
                    >
                      {g.name}
                    </div>
                  </div>
                  <div
                    className="num"
                    style={{
                      color: b.completed ? "rgba(255,255,255,0.8)" : "var(--text-3)",
                      fontSize: 9.5,
                    }}
                  >
                    {decToLabel(b.start)} · {fmtHours(b.duration)}
                  </div>
                </div>

                {!skipped && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => updateBlock(b.id, { completed: !b.completed })}
                      className="rounded-full p-1"
                      style={{
                        background: b.completed
                          ? "rgba(255,255,255,0.25)"
                          : "var(--surface)",
                      }}
                      aria-label={b.completed ? "Bỏ hoàn thành" : "Đánh dấu hoàn thành"}
                    >
                      <Check
                        size={11}
                        style={{ color: b.completed ? "#fff" : p.color }}
                      />
                    </button>
                    {!b.completed && (
                      <button
                        onClick={() => setReasonFor(b.id)}
                        className="rounded-full p-1"
                        style={{ background: "var(--surface)" }}
                        aria-label="Bỏ qua"
                      >
                        <X size={11} style={{ color: "var(--text-3)" }} />
                      </button>
                    )}
                    {!b.completed && (
                      <button
                        onClick={() => hideBlock(b.id)}
                        className="rounded-full p-1"
                        style={{ background: "var(--surface)" }}
                        aria-label="Ẩn khỏi ngày này"
                      >
                        <Trash2 size={10} style={{ color: "var(--text-3)" }} />
                      </button>
                    )}
                  </div>
                )}
                {skipped && (
                  <button
                    onClick={() => updateBlock(b.id, { skipped: false, reason: "" })}
                    className="flex-shrink-0"
                    style={{ color: "var(--text-3)" }}
                    aria-label="Hoàn tác bỏ qua"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="hidden sm:block flex-1 px-2 py-2"
          style={{ minHeight: (HOUR_END - HOUR_START) * ROW_H }}
        >
          {completedList.length === 0 && (
            <p className="text-text-3 text-[12px] text-center mt-8 px-3">
              Chưa có mục nào hoàn thành
            </p>
          )}
          <div className="space-y-1.5">
            {completedList.map((b) => {
              const g = goalMap[b.goalId];
              if (!g) return null;
              const p = pillarOf(g.category);
              return (
                <div
                  key={b.id}
                  className="rounded-lg px-2.5 flex items-center justify-between"
                  style={{
                    background: p.color,
                    height: Math.max(30, b.duration * 24),
                  }}
                >
                  <span className="text-white text-[11px] font-bold truncate">
                    {g.name}
                  </span>
                  <Check size={12} className="text-white flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {reasonFor && (
        <ReasonModal
          onClose={() => setReasonFor(null)}
          onPick={(r) => {
            updateBlock(reasonFor, { skipped: true, reason: r });
            setReasonFor(null);
          }}
        />
      )}
    </div>
  );
}
